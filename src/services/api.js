// Cliente HTTP del backend sistema-reservas-de-hotel (Spring Boot, /api/hotel).
const API_URL = (import.meta.env.VITE_API_URL ?? 'http://localhost:8080').replace(/\/$/, '');

export class ApiError extends Error {
  constructor(message, status) {
    super(message);
    this.status = status;
  }
}

// El backend responde en ingles; se traducen los mensajes conocidos.
function traducir(status, message = '') {
  if (/no .*room.* available|no available room/i.test(message)) {
    return 'No quedan habitaciones de ese tipo para las fechas elegidas';
  }
  if (/check-out date must be after/i.test(message)) {
    return 'La salida debe ser posterior a la llegada';
  }
  if (/must be CONFIRMED to check in/i.test(message)) {
    return 'Solo puedes hacer check-in en una reserva confirmada';
  }
  if (/must be CHECKED_IN to check out/i.test(message)) {
    return 'Primero debes hacer check-in para poder hacer check-out';
  }
  if (/only be added to active/i.test(message)) {
    return 'Solo se pueden agregar servicios a reservas activas';
  }
  if (/checkInDate|checkOutDate/i.test(message)) {
    return 'Revisa las fechas: la llegada no puede ser en el pasado y la salida debe ser futura';
  }
  if (status === 404) return 'No encontramos la reserva solicitada';
  if (status === 400) return 'Revisa los datos enviados';
  if (status === 409) return 'La operacion no es valida en el estado actual de la reserva';
  return 'Ocurrio un error en el servidor. Intenta de nuevo';
}

export async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(`${API_URL}/api/hotel${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('No pudimos conectar con el servidor del hotel. Intenta de nuevo en unos minutos', 0);
  }
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(traducir(res.status, data?.message), res.status);
  return data;
}
