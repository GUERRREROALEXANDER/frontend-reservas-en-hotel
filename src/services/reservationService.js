import { request } from './api';
import { readJSON, writeJSON } from './storage';

// El backend no asocia reservas a usuarios: se guardan aqui los ids de cada usuario.
const keyFor = (userId) => `hotel.reservas.${userId}`;

const HIGH_SEASON_MONTHS = [6, 7, 12];
const HIGH_SEASON_MULTIPLIER = 1.5;

// Catalogo de servicios adicionales (mismos precios que el backend).
export const SERVICIOS = [
  { id: 'SPA', nombre: 'Spa', detalle: 'Acceso al spa durante la estadia', precio: 50, porNoche: false },
  { id: 'BREAKFAST', nombre: 'Desayuno', detalle: 'Desayuno buffet cada manana', precio: 15, porNoche: true },
  {
    id: 'AIRPORT_TRANSPORT',
    nombre: 'Transporte al aeropuerto',
    detalle: 'Traslado privado ida o vuelta',
    precio: 30,
    porNoche: false,
  },
];

// Las descripciones del backend vienen en ingles (AdditionalService.getDescription).
const DESCRIPCIONES = {
  'Spa access package': 'Spa',
  'Daily breakfast included': 'Desayuno',
  'Airport transfer service': 'Transporte al aeropuerto',
};

export function nombreServicio({ type, description }) {
  return SERVICIOS.find((s) => s.id === type)?.nombre ?? DESCRIPCIONES[description] ?? description;
}

export const ESTADOS = {
  CONFIRMED: 'Confirmada',
  CHECKED_IN: 'Hospedado',
  CHECKED_OUT: 'Finalizada',
};

export function nightsBetween(checkIn, checkOut) {
  const ms = new Date(`${checkOut}T00:00:00`) - new Date(`${checkIn}T00:00:00`);
  return Math.max(0, Math.round(ms / 86400000));
}

// Estimacion previa con la misma regla del backend: noches en junio, julio o
// diciembre cuestan el precio base x 1.5. El valor final lo devuelve el servidor.
export function estimateRoomCost(basePrice, checkIn, checkOut) {
  const noches = nightsBetween(checkIn, checkOut);
  let total = 0;
  const d = new Date(`${checkIn}T00:00:00`);
  for (let i = 0; i < noches; i++) {
    const alta = HIGH_SEASON_MONTHS.includes(d.getMonth() + 1);
    total += alta ? basePrice * HIGH_SEASON_MULTIPLIER : basePrice;
    d.setDate(d.getDate() + 1);
  }
  return total;
}

export function servicioCost(servicio, noches) {
  return servicio.porNoche ? servicio.precio * noches : servicio.precio;
}

export function getAvailability(checkIn, checkOut, roomType) {
  const params = new URLSearchParams({ checkIn, checkOut });
  if (roomType) params.set('roomType', roomType);
  return request(`/disponibilidad?${params}`);
}

export async function createReservation({ user, roomType, checkIn, checkOut, servicios = [] }) {
  let reserva = await request('/reservar', {
    method: 'POST',
    body: {
      guestName: user.nombre,
      guestEmail: user.email,
      roomType,
      checkInDate: checkIn,
      checkOutDate: checkOut,
    },
  });
  const ids = readJSON(keyFor(user.id), []);
  writeJSON(keyFor(user.id), [reserva.reservationId, ...ids]);
  for (const serviceType of servicios) {
    reserva = await request(`/servicios/${reserva.reservationId}`, {
      method: 'POST',
      body: { serviceType },
    });
  }
  return reserva;
}

export async function listByUser(userId) {
  const ids = readJSON(keyFor(userId), []);
  const results = await Promise.allSettled(ids.map((id) => request(`/reserva/${id}`)));
  // El backend guarda en memoria: si se reinicio, las reservas viejas ya no existen.
  const vigentes = [];
  const reservas = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      vigentes.push(ids[i]);
      reservas.push(r.value);
    } else if (r.reason?.status !== 404) {
      vigentes.push(ids[i]);
    }
  });
  if (vigentes.length !== ids.length) writeJSON(keyFor(userId), vigentes);
  const fallidas = results.filter((r) => r.status === 'rejected' && r.reason?.status !== 404);
  if (fallidas.length && !reservas.length) throw fallidas[0].reason;
  return reservas;
}

export function getReservation(id) {
  return request(`/reserva/${id}`);
}

export function checkIn(id) {
  return request(`/checkin/${id}`, { method: 'PUT' });
}

export function checkOut(id) {
  return request(`/checkout/${id}`, { method: 'PUT' });
}
