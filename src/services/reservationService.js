import { readJSON, writeJSON, delay } from './storage';

const KEY = 'hotel.reservations';

// IVA aplicado sobre el subtotal de la reserva (el servicio guarda el subtotal).
export const IVA = 0.19;

export function totalConIva(subtotal) {
  return Math.round(subtotal * (1 + IVA));
}

export function nightsBetween(checkIn, checkOut) {
  const ms = new Date(checkOut) - new Date(checkIn);
  return Math.max(0, Math.round(ms / 86400000));
}

function overlaps(a, b) {
  return new Date(a.checkIn) < new Date(b.checkOut) && new Date(b.checkIn) < new Date(a.checkOut);
}

export async function createReservation({ userId, room, checkIn, checkOut, huespedes, notas }) {
  await delay();
  const noches = nightsBetween(checkIn, checkOut);
  if (noches < 1) throw new Error('La salida debe ser posterior a la llegada');
  if (huespedes > room.capacidad) {
    throw new Error(`Esta habitacion admite maximo ${room.capacidad} huespedes`);
  }
  const all = readJSON(KEY, []);
  const conflict = all.some(
    (r) => r.roomId === room.id && r.estado === 'confirmada' && overlaps(r, { checkIn, checkOut }),
  );
  if (conflict) throw new Error('La habitacion no esta disponible en esas fechas');

  const reservation = {
    id: crypto.randomUUID().slice(0, 8).toUpperCase(),
    userId,
    roomId: room.id,
    roomNombre: room.nombre,
    checkIn,
    checkOut,
    noches,
    huespedes,
    notas: notas ?? '',
    total: noches * room.precio,
    estado: 'confirmada',
    creadaEn: new Date().toISOString(),
  };
  writeJSON(KEY, [...all, reservation]);
  return reservation;
}

export async function listByUser(userId) {
  await delay(300);
  return readJSON(KEY, [])
    .filter((r) => r.userId === userId)
    .sort((a, b) => new Date(b.creadaEn) - new Date(a.creadaEn));
}

export async function cancelReservation(id, userId) {
  await delay(300);
  const all = readJSON(KEY, []);
  const updated = all.map((r) =>
    r.id === id && r.userId === userId ? { ...r, estado: 'cancelada' } : r,
  );
  writeJSON(KEY, updated);
}
