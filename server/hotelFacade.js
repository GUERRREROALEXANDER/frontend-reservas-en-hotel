import { randomUUID } from 'node:crypto';

// Port en Node de HotelFacade (sistema-reservas-de-hotel). Mismas reglas y mismos DTOs:
// habitaciones, temporada alta, servicios adicionales, check-in con llave y factura.

const HIGH_SEASON_MONTHS = [6, 7, 12];
const HIGH_SEASON_MULTIPLIER = 1.5;
const ROOM_TYPES = ['SINGLE', 'DOUBLE', 'SUITE'];

const ROOM_INFO = {
  SINGLE: { floor: 1, capacity: 1, price: 80, count: 6, description: 'Single room with one bed' },
  DOUBLE: { floor: 2, capacity: 2, price: 120, count: 5, description: 'Double room with one double bed' },
  SUITE: { floor: 3, capacity: 4, price: 250, count: 4, description: 'Luxury suite with living area' },
};

const SERVICES = {
  SPA: { unitPrice: 50, perNight: false, description: 'Spa access package' },
  BREAKFAST: { unitPrice: 15, perNight: true, description: 'Daily breakfast included' },
  AIRPORT_TRANSPORT: { unitPrice: 30, perNight: false, description: 'Airport transfer service' },
};

export class HttpError extends Error {
  constructor(status, error, message) {
    super(message);
    this.status = status;
    this.error = error;
  }
}

const badRequest = (m) => new HttpError(400, 'Bad Request', m);
const notFound = (m) => new HttpError(404, 'Not Found', m);
const conflict = (m) => new HttpError(409, 'Conflict', m);

const round2 = (n) => Math.round(n * 100) / 100;
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// "Hoy" segun la zona horaria del hotel (Colombia), para @FutureOrPresent / @Future.
function today() {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date());
}

function parseDate(value, name) {
  if (typeof value !== 'string' || !ISO_DATE.test(value) || Number.isNaN(Date.parse(value))) {
    throw badRequest(`Invalid value '${value}' for parameter '${name}'`);
  }
  return value;
}

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nightsBetween(checkIn, checkOut) {
  return Math.round((Date.parse(`${checkOut}T00:00:00Z`) - Date.parse(`${checkIn}T00:00:00Z`)) / 86400000);
}

function seasonOf(iso) {
  return HIGH_SEASON_MONTHS.includes(Number(iso.slice(5, 7))) ? 'HIGH' : 'LOW';
}

function parseRoomType(value) {
  if (value == null) throw badRequest('Room type cannot be null');
  const type = String(value).trim().toUpperCase();
  if (!ROOM_TYPES.includes(type)) throw badRequest(`Unknown room type: ${value}`);
  return type;
}

function parseServiceType(value) {
  if (value == null) throw badRequest('Service type cannot be null');
  const type = String(value).trim().toUpperCase().replace(/[ -]/g, '_');
  if (!SERVICES[type]) throw badRequest(`Unknown service type: ${value}`);
  return type;
}

function validateDateRange(checkIn, checkOut) {
  if (!checkIn || !checkOut || checkOut <= checkIn) {
    throw badRequest('Check-out date must be after check-in date');
  }
}

export function createInitialDb() {
  const rooms = [];
  for (const type of ROOM_TYPES) {
    const info = ROOM_INFO[type];
    for (let i = 1; i <= info.count; i++) {
      rooms.push({
        roomNumber: `${info.floor}0${i}`,
        type,
        floor: info.floor,
        capacity: info.capacity,
        basePricePerNight: info.price,
        description: info.description,
        status: 'AVAILABLE',
      });
    }
  }
  return { rooms, reservations: {} };
}

const isActive = (r) => r.status === 'CONFIRMED' || r.status === 'CHECKED_IN';
const overlaps = (r, from, to) => from < r.checkOutDate && to > r.checkInDate;

function roomDTO(room) {
  const { status, ...dto } = room;
  return dto;
}

function serviceCost(type, nights) {
  const s = SERVICES[type];
  return round2(s.perNight ? s.unitPrice * nights : s.unitPrice);
}

function reservationDTO(r) {
  const services = r.additionalServices.map((type) => ({
    type,
    description: SERVICES[type].description,
    cost: serviceCost(type, r.nights),
  }));
  const servicesTotal = round2(services.reduce((acc, s) => acc + s.cost, 0));
  return {
    reservationId: r.id,
    guestName: r.guestName,
    guestEmail: r.guestEmail,
    room: roomDTO(r.room),
    checkInDate: r.checkInDate,
    checkOutDate: r.checkOutDate,
    nights: r.nights,
    status: r.status,
    roomCost: r.roomCost,
    additionalServices: services,
    estimatedTotal: round2(r.roomCost + servicesTotal),
    digitalKey: r.digitalKey,
  };
}

function findAvailableRooms(db, checkIn, checkOut, type) {
  validateDateRange(checkIn, checkOut);
  const active = Object.values(db.reservations).filter(isActive);
  return db.rooms
    .filter((room) => !type || room.type === type)
    .filter((room) => !active.some((r) => r.room.roomNumber === room.roomNumber && overlaps(r, checkIn, checkOut)))
    .sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
}

function calculateRoomCost(basePrice, checkIn, checkOut) {
  let total = 0;
  for (let night = checkIn; night < checkOut; night = addDays(night, 1)) {
    total += seasonOf(night) === 'HIGH' ? basePrice * HIGH_SEASON_MULTIPLIER : basePrice;
  }
  return round2(total);
}

function findReservation(db, id) {
  const r = db.reservations[id];
  if (!r) throw notFound(`Reservation not found: ${id}`);
  return r;
}

export function checkAvailability(db, { checkIn, checkOut, roomType }) {
  if (checkIn == null) throw badRequest("Missing required parameter 'checkIn'");
  if (checkOut == null) throw badRequest("Missing required parameter 'checkOut'");
  const from = parseDate(checkIn, 'checkIn');
  const to = parseDate(checkOut, 'checkOut');
  const type = roomType && String(roomType).trim() ? parseRoomType(roomType) : null;
  return findAvailableRooms(db, from, to, type).map(roomDTO);
}

export function createReservation(db, body = {}) {
  const errors = [];
  const { guestName, guestEmail, roomType, checkInDate, checkOutDate } = body;
  if (!guestName || !String(guestName).trim()) errors.push('guestName: must not be blank');
  if (!guestEmail || !String(guestEmail).trim()) errors.push('guestEmail: must not be blank');
  else if (!EMAIL.test(guestEmail)) errors.push('guestEmail: must be a well-formed email address');
  if (!roomType || !String(roomType).trim()) errors.push('roomType: must not be blank');
  const hoy = today();
  if (!checkInDate) errors.push('checkInDate: must not be null');
  else if (!ISO_DATE.test(checkInDate)) errors.push('checkInDate: invalid date');
  else if (checkInDate < hoy) errors.push('checkInDate: must be a date in the present or in the future');
  if (!checkOutDate) errors.push('checkOutDate: must not be null');
  else if (!ISO_DATE.test(checkOutDate)) errors.push('checkOutDate: invalid date');
  else if (checkOutDate <= hoy) errors.push('checkOutDate: must be a future date');
  if (errors.length) throw badRequest(errors.join(', '));

  const type = parseRoomType(roomType);
  const available = findAvailableRooms(db, checkInDate, checkOutDate, type);
  if (!available.length) {
    throw conflict(`No ${type} room available for the requested dates`);
  }
  const room = available[0];
  const reservation = {
    id: randomUUID(),
    guestName: String(guestName).trim(),
    guestEmail: String(guestEmail).trim(),
    room,
    checkInDate,
    checkOutDate,
    nights: nightsBetween(checkInDate, checkOutDate),
    status: 'CONFIRMED',
    roomCost: calculateRoomCost(room.basePricePerNight, checkInDate, checkOutDate),
    additionalServices: [],
    digitalKey: null,
    invoice: null,
    createdAt: new Date().toISOString(),
  };
  db.reservations[reservation.id] = reservation;
  return reservationDTO(reservation);
}

export function addService(db, id, body = {}) {
  if (!body.serviceType || !String(body.serviceType).trim()) {
    throw badRequest('serviceType: must not be blank');
  }
  const r = findReservation(db, id);
  if (!isActive(r)) {
    throw conflict('Additional services can only be added to active reservations');
  }
  r.additionalServices.push(parseServiceType(body.serviceType));
  return reservationDTO(r);
}

export function performCheckIn(db, id) {
  const r = findReservation(db, id);
  if (r.status !== 'CONFIRMED') throw conflict('Reservation must be CONFIRMED to check in');
  r.digitalKey = randomUUID();
  r.status = 'CHECKED_IN';
  const room = db.rooms.find((x) => x.roomNumber === r.room.roomNumber);
  if (room) room.status = 'OCCUPIED';
  return {
    reservationId: r.id,
    roomNumber: r.room.roomNumber,
    digitalKey: r.digitalKey,
    status: r.status,
    message: 'Check-in completed successfully',
  };
}

export function performCheckOut(db, id) {
  const r = findReservation(db, id);
  if (r.status !== 'CHECKED_IN') throw conflict('Reservation must be CHECKED_IN to check out');
  const serviceLines = r.additionalServices.map((type) => ({
    description: SERVICES[type].description,
    quantity: type === 'BREAKFAST' ? r.nights : 1,
    unitPrice: SERVICES[type].unitPrice,
    total: serviceCost(type, r.nights),
  }));
  const servicesTotal = round2(serviceLines.reduce((acc, l) => acc + l.total, 0));
  const invoice = {
    invoiceNumber: `INV-${randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`,
    reservationId: r.id,
    guestName: r.guestName,
    roomNumber: r.room.roomNumber,
    roomType: r.room.type,
    nights: r.nights,
    season: seasonOf(r.checkInDate),
    roomCost: r.roomCost,
    serviceLines,
    servicesTotal,
    grandTotal: round2(r.roomCost + servicesTotal),
    issuedAt: new Date().toISOString(),
  };
  r.invoice = invoice;
  r.digitalKey = null;
  r.status = 'CHECKED_OUT';
  const room = db.rooms.find((x) => x.roomNumber === r.room.roomNumber);
  if (room) room.status = 'AVAILABLE';
  return invoice;
}

export function getReservation(db, id) {
  return reservationDTO(findReservation(db, id));
}
