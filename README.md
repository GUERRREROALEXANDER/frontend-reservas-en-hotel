# frontend-reservas-en-hotel

Frontend de **Hotel Aurora**, una aplicacion web para reservar habitaciones de hotel.

## Funcionalidades

- Registro e inicio de sesion de usuarios con validacion en vivo y medidor de fuerza de contrasena.
- Pagina de inicio con hero animado, buscador de fechas, habitaciones destacadas, servicios y testimonios.
- Catalogo de habitaciones con filtros por tipo, huespedes y precio.
- Reserva en tres pasos (fechas, datos, confirmacion) con resumen y calculo de IVA.
- "Mis reservas": historial, filtros por estado y cancelacion.
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

## Datos

Mientras no hay backend conectado, usuarios y reservas se guardan en `localStorage`
desde `src/services/`. Para conectar una API basta con reemplazar esas funciones por
llamadas `fetch` manteniendo la misma firma.

## Equipo

- [GUERRREROALEXANDER](https://github.com/GUERRREROALEXANDER)
- [0ValentinaArt](https://github.com/0ValentinaArt)
- [MatUCC](https://github.com/MatUCC)
