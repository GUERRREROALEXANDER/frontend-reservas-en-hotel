import { readJSON, writeJSON, removeKey, delay } from './storage';

const USERS_KEY = 'hotel.users';
const SESSION_KEY = 'hotel.session';

// Hash simple para no guardar contrasenas en texto plano en localStorage.
// Cuando exista backend, el hash lo hace el servidor.
async function hash(text) {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function publicUser({ password, ...user }) {
  return user;
}

export async function register({ nombre, email, telefono, password }) {
  await delay();
  const users = readJSON(USERS_KEY, []);
  const normalized = email.trim().toLowerCase();
  if (users.some((u) => u.email === normalized)) {
    throw new Error('Ya existe una cuenta con ese correo');
  }
  const user = {
    id: crypto.randomUUID(),
    nombre: nombre.trim(),
    email: normalized,
    telefono: telefono?.trim() ?? '',
    password: await hash(password),
    creadoEn: new Date().toISOString(),
  };
  writeJSON(USERS_KEY, [...users, user]);
  const session = publicUser(user);
  writeJSON(SESSION_KEY, session);
  return session;
}

export async function login({ email, password }) {
  await delay();
  const users = readJSON(USERS_KEY, []);
  const normalized = email.trim().toLowerCase();
  const user = users.find((u) => u.email === normalized);
  if (!user || user.password !== (await hash(password))) {
    throw new Error('Correo o contrasena incorrectos');
  }
  const session = publicUser(user);
  writeJSON(SESSION_KEY, session);
  return session;
}

export function logout() {
  removeKey(SESSION_KEY);
}

export function getSession() {
  return readJSON(SESSION_KEY, null);
}
