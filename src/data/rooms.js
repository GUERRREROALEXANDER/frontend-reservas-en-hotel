// Catalogo de habitaciones (mock hasta conectar el backend).
export const rooms = [
  {
    id: 'std-01',
    nombre: 'Habitacion Estandar',
    tipo: 'Estandar',
    precio: 180000,
    capacidad: 2,
    camas: '1 cama doble',
    tamano: 24,
    imagen: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=70',
    amenidades: ['Wi-Fi', 'TV', 'Aire acondicionado'],
    descripcion: 'Comoda y luminosa, ideal para escapadas cortas o viajes de trabajo.',
  },
  {
    id: 'sup-01',
    nombre: 'Habitacion Superior',
    tipo: 'Superior',
    precio: 260000,
    capacidad: 3,
    camas: '1 cama queen + 1 sofa cama',
    tamano: 32,
    imagen: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=70',
    amenidades: ['Wi-Fi', 'TV', 'Minibar', 'Vista a la ciudad'],
    descripcion: 'Mas espacio, mejor vista y un rincon de lectura junto a la ventana.',
  },
  {
    id: 'fam-01',
    nombre: 'Suite Familiar',
    tipo: 'Familiar',
    precio: 390000,
    capacidad: 5,
    camas: '2 camas dobles + 1 sencilla',
    tamano: 48,
    imagen: 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=70',
    amenidades: ['Wi-Fi', 'TV', 'Cocineta', 'Sala de estar'],
    descripcion: 'Dos ambientes separados para que toda la familia descanse a gusto.',
  },
  {
    id: 'ste-01',
    nombre: 'Suite Presidencial',
    tipo: 'Suite',
    precio: 720000,
    capacidad: 2,
    camas: '1 cama king',
    tamano: 70,
    imagen: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=70',
    amenidades: ['Wi-Fi', 'Jacuzzi', 'Terraza', 'Mayordomo', 'Minibar'],
    descripcion: 'Terraza privada, jacuzzi y servicio personalizado las 24 horas.',
  },
];

export function getRoomById(id) {
  return rooms.find((r) => r.id === id) ?? null;
}

export function formatCOP(value) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(value);
}
