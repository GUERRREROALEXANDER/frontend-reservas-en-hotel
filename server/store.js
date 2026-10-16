import { BlobPreconditionFailedError, get, put } from '@vercel/blob';
import { createInitialDb } from './hotelFacade.js';

// Los datos del hotel viven en un unico JSON privado de Vercel Blob.
// Las escrituras usan ifMatch (ETag) para no pisar cambios concurrentes.
const PATHNAME = 'hotel-db.json';
const MAX_RETRIES = 4;

async function load() {
  const result = await get(PATHNAME, { access: 'private', useCache: false });
  if (!result || result.statusCode !== 200) return { db: createInitialDb(), etag: null };
  const db = await new Response(result.stream).json();
  // get() entrega un ETag debil (W/"..."); put({ ifMatch }) solo acepta el fuerte.
  return { db, etag: result.blob.etag.replace(/^W\//, '') };
}

async function save(db, etag) {
  await put(PATHNAME, JSON.stringify(db), {
    access: 'private',
    contentType: 'application/json',
    addRandomSuffix: false,
    cacheControlMaxAge: 60,
    ...(etag ? { ifMatch: etag } : { allowOverwrite: false }),
  });
}

export async function read(fn) {
  const { db } = await load();
  return fn(db);
}

// Ejecuta fn sobre la version mas reciente y la guarda; si otra peticion escribio
// antes, vuelve a leer y reintenta.
export async function write(fn) {
  for (let intento = 0; ; intento++) {
    const { db, etag } = await load();
    const result = fn(db);
    try {
      await save(db, etag);
      return result;
    } catch (err) {
      const choque = err instanceof BlobPreconditionFailedError || (!etag && /exist/i.test(err.message));
      if (!choque || intento >= MAX_RETRIES) throw err;
    }
  }
}
