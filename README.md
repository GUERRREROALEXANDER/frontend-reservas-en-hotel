# frontend-reservas-en-hotel

Frontend de **Hotel Aurora**, una aplicacion web para reservar habitaciones de hotel.

## Funcionalidades

- Registro e inicio de sesion de usuarios con validacion en vivo y medidor de fuerza de contrasena.
- Pagina de inicio con hero animado, buscador de fechas, habitaciones destacadas, servicios y testimonios.
- Catalogo de habitaciones con filtros por tipo, huespedes y precio.
- Reserva en tres pasos (fechas con disponibilidad real, servicios adicionales, confirmacion).
- "Mis reservas": historial, filtros por estado, check-in con llave digital y check-out con factura.
- Rutas protegidas: reservar y ver reservas exige sesion iniciada.
- Animaciones con framer-motion que respetan `prefers-reduced-motion`.

## Tecnologias

- React 18 + Vite 5
- React Router 6
- framer-motion
- lucide-react (iconos)
- CSS con design tokens (`src/styles/tokens.css`)

## Ejecutar

```bash
npm install
npm run dev
```

Abrir http://localhost:5173

Para generar la version de produccion:

```bash
npm run build
npm run preview
```

## Estructura

```
src/
  components/   Navbar, Footer, RoomCard, PageTransition, ProtectedRoute
  context/      AuthContext (sesion del usuario)
  data/         catalogo de habitaciones
  pages/        Home, Rooms, Login, Register, Booking, MyReservations, NotFound
  services/     authService, reservationService, storage
  styles/       tokens y estilos globales
```

## Backend

El frontend consume la API de
[sistema-reservas-de-hotel](https://github.com/GUERRREROALEXANDER/sistema-reservas-de-hotel)
(Spring Boot, `/api/hotel`): disponibilidad, reservas, servicios adicionales, check-in con
llave digital y check-out con factura. Precios en USD, con temporada alta (x1.5) en junio,
julio y diciembre.

### API en Vercel

En produccion la API corre en el mismo proyecto de Vercel como funcion serverless
(`api/hotel.js`): `server/hotelFacade.js` replica en Node la fachada del backend Java
(mismos endpoints, reglas de precio y respuestas JSON) y `server/store.js` guarda los datos en
un JSON privado de Vercel Blob, con escrituras condicionales por ETag. A diferencia del
backend en memoria, las reservas persisten entre despliegues.

Demo: https://frontend-reservas-en-hotel.vercel.app

### Backend Spring Boot local

Para desarrollar contra el backend Java, su URL se configura con `VITE_API_URL` (ver `.env.example`):

```bash
# .env.development.local
VITE_API_URL=http://localhost:8080
```

En Vercel se define en Project Settings → Environment Variables y requiere volver a desplegar.

El backend no maneja usuarios: el registro e inicio de sesion se guardan en `localStorage`,
y cada usuario conserva en su navegador los codigos de sus reservas, que se consultan al
backend en tiempo real. Como el backend guarda los datos en memoria, las reservas se
pierden cuando este se reinicia.

## Equipo

- [GUERRREROALEXANDER](https://github.com/GUERRREROALEXANDER)
- [0ValentinaArt](https://github.com/0ValentinaArt)
- [MatUCC](https://github.com/MatUCC)
