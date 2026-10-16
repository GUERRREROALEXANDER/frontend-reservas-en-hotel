// Tipos de habitacion del backend (RoomType: SINGLE, DOUBLE, SUITE).
// Precio base por noche en USD, igual al que siembra el backend al arrancar.
export const rooms = [
  {
    id: 'SINGLE',
    nombre: 'Habitacion Sencilla',
    tipo: 'Sencilla',
    precio: 80,
    capacidad: 1,
    camas: '1 cama sencilla',
    tamano: 20,
    imagen: 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=70',
    amenidades: ['Wi-Fi', 'TV', 'Aire acondicionado'],
    descripcion: 'Comoda y luminosa, ideal para viajes de trabajo o escapadas en solitario.',
  },
  {
    id: 'DOUBLE',
    nombre: 'Habitacion Doble',
    tipo: 'Doble',
    precio: 120,
    capacidad: 2,
    camas: '1 cama queen',
    tamano: 30,
    imagen: 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=70',
    amenidades: ['Wi-Fi', 'TV', 'Minibar', 'Vista a la ciudad'],
    descripcion: 'Mas espacio, mejor vista y un rincon de lectura junto a la ventana.',
  },
  {
    id: 'SUITE',
    nombre: 'Suite',
    tipo: 'Suite',
    precio: 250,
    capacidad: 4,
    camas: '1 cama king + 1 sofa cama',
    tamano: 55,
    imagen: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=70',
    amenidades: ['Wi-Fi', 'Jacuzzi', 'Sala de estar', 'Minibar'],
    descripcion: 'Sala independiente, jacuzzi y la mejor vista del hotel.',
  },
];

export function getRoomById(id) {
  return rooms.find((r) => r.id === id) ?? null;
}

const precioFmt = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

export function formatPrecio(value) {
  return precioFmt.format(Number(value));
}
