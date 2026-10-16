import {
  HttpError,
  addService,
  checkAvailability,
  createReservation,
  getReservation,
  performCheckIn,
  performCheckOut,
} from '../server/hotelFacade.js';
import { read, write } from '../server/store.js';

// Endpoints equivalentes a HotelController (/api/hotel). vercel.json reescribe
// /api/hotel/<ruta> a esta funcion con ?path=<ruta>.
function route(method, segments, query, body) {
  const [accion, id] = segments;
  if (method === 'GET' && accion === 'disponibilidad' && !id) {
    return { status: 200, run: () => read((db) => checkAvailability(db, query)) };
  }
  if (method === 'GET' && accion === 'reserva' && id) {
    return { status: 200, run: () => read((db) => getReservation(db, id)) };
  }
  if (method === 'POST' && accion === 'reservar' && !id) {
    return { status: 201, run: () => write((db) => createReservation(db, body)) };
  }
  if (method === 'POST' && accion === 'servicios' && id) {
    return { status: 200, run: () => write((db) => addService(db, id, body)) };
  }
  if (method === 'PUT' && accion === 'checkin' && id) {
    return { status: 200, run: () => write((db) => performCheckIn(db, id)) };
  }
  if (method === 'PUT' && accion === 'checkout' && id) {
    return { status: 200, run: () => write((db) => performCheckOut(db, id)) };
  }
  return null;
}

function sendError(res, status, error, message) {
  res.status(status).json({ status, error, message, timestamp: new Date().toISOString() });
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const raw = req.query.path ?? new URL(req.url, 'http://x').pathname.replace(/^\/api\/hotel\/?/, '');
  const segments = String(Array.isArray(raw) ? raw.join('/') : raw)
    .split('/')
    .filter(Boolean)
    .map(decodeURIComponent);
  const { path, ...query } = req.query;

  let body = req.body;
  if (typeof body === 'string' && body) {
    try {
      body = JSON.parse(body);
    } catch {
      return sendError(res, 400, 'Bad Request', 'Malformed JSON request body');
    }
  }

  const match = route(req.method, segments, query, body ?? {});
  if (!match) return sendError(res, 404, 'Not Found', `No endpoint ${req.method} /api/hotel/${segments.join('/')}`);

  try {
    const data = await match.run();
    return res.status(match.status).json(data);
  } catch (err) {
    if (err instanceof HttpError) return sendError(res, err.status, err.error, err.message);
    console.error(err);
    return sendError(res, 500, 'Internal Server Error', `Unexpected error: ${err.message}`);
  }
}
