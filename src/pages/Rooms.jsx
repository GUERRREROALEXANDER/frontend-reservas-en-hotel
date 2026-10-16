import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CircleAlert, Loader2, SearchX } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import RoomCard from '../components/RoomCard';
import { rooms, formatPrecio } from '../data/rooms';
import { getAvailability } from '../services/reservationService';
import './Rooms.css';

const precios = rooms.map((r) => r.precio);
const PRECIO_MIN = Math.min(...precios);
const PRECIO_MAX = Math.max(...precios);
const TIPOS = [...new Set(rooms.map((r) => r.tipo))];
const CAPACIDAD_MAX = Math.max(...rooms.map((r) => r.capacidad));

export default function Rooms() {
  const reduce = useReducedMotion();
  const [searchParams] = useSearchParams();
  const checkIn = searchParams.get('checkIn') ?? '';
  const checkOut = searchParams.get('checkOut') ?? '';
  const huespedesParam = Number(searchParams.get('huespedes')) || 1;

  const [tipo, setTipo] = useState('todos');
  const [huespedes, setHuespedes] = useState(() =>
    Math.min(Math.max(huespedesParam, 1), CAPACIDAD_MAX),
  );
  const [precioMax, setPrecioMax] = useState(PRECIO_MAX);
  // Habitaciones libres por tipo segun el backend: { SINGLE: 6, DOUBLE: 0, ... }
  const [disponibilidad, setDisponibilidad] = useState(null);
  const [consultando, setConsultando] = useState(false);
  const [errorDisp, setErrorDisp] = useState('');

  useEffect(() => {
    if (!checkIn || !checkOut) {
      setDisponibilidad(null);
      return undefined;
    }
    let activo = true;
    setConsultando(true);
    setErrorDisp('');
    getAvailability(checkIn, checkOut)
      .then((libres) => {
        if (!activo) return;
        const conteo = Object.fromEntries(rooms.map((r) => [r.id, 0]));
        libres.forEach((h) => {
          conteo[h.type] = (conteo[h.type] ?? 0) + 1;
        });
        setDisponibilidad(conteo);
      })
      .catch((err) => {
        if (activo) setErrorDisp(err.message);
      })
      .finally(() => {
        if (activo) setConsultando(false);
      });
    return () => {
      activo = false;
    };
  }, [checkIn, checkOut]);

  const filtradas = useMemo(
    () =>
      rooms.filter(
        (r) => (tipo === 'todos' || r.tipo === tipo) && r.capacidad >= huespedes && r.precio <= precioMax,
      ),
    [tipo, huespedes, precioMax],
  );

  // Fechas y huespedes de la busqueda; se conservan al reservar.
  const bookingSearch = useMemo(() => {
    const p = new URLSearchParams();
    if (checkIn) p.set('checkIn', checkIn);
    if (checkOut) p.set('checkOut', checkOut);
    p.set('huespedes', String(huespedes));
    return `?${p.toString()}`;
  }, [checkIn, checkOut, huespedes]);

  const limpiarFiltros = () => {
    setTipo('todos');
    setHuespedes(1);
    setPrecioMax(PRECIO_MAX);
  };

  const grid = { visible: { transition: { staggerChildren: 0.06 } } };

  return (
    <PageTransition className="rooms-page">
      <header className="container rooms-header">
        <h1>Nuestras habitaciones</h1>
        <p>
          {checkIn && checkOut
            ? `Mostrando opciones para tu estadia del ${checkIn} al ${checkOut}.`
            : 'Elige el espacio perfecto para tu proxima estadia.'}
        </p>
      </header>

      <section className="container" aria-label="Filtros de busqueda">
        <div className="filters">
          <div className="field filters-field">
            <label htmlFor="filtro-tipo">Tipo de habitacion</label>
            <select id="filtro-tipo" value={tipo} onChange={(e) => setTipo(e.target.value)}>
              <option value="todos">Todos los tipos</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          <div className="field filters-field">
            <label htmlFor="filtro-huespedes">Huespedes</label>
            <select
              id="filtro-huespedes"
              value={huespedes}
              onChange={(e) => setHuespedes(Number(e.target.value))}
            >
              {Array.from({ length: CAPACIDAD_MAX }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? 'huesped' : 'huespedes'}
                </option>
              ))}
            </select>
          </div>

          <div className="field filters-field filters-range">
            <label htmlFor="filtro-precio">
              Precio maximo por noche: <strong>{formatPrecio(precioMax)}</strong>
            </label>
            <input
              id="filtro-precio"
              type="range"
              min={PRECIO_MIN}
              max={PRECIO_MAX}
              step={10}
              value={precioMax}
              onChange={(e) => setPrecioMax(Number(e.target.value))}
            />
            <div className="filters-range-marks" aria-hidden="true">
              <span>{formatPrecio(PRECIO_MIN)}</span>
              <span>{formatPrecio(PRECIO_MAX)}</span>
            </div>
          </div>
        </div>

        <p className="rooms-count" role="status">
          {consultando ? (
            <>
              <Loader2 size={16} className="rooms-spin" aria-hidden="true" /> Consultando disponibilidad...
            </>
          ) : (
            `${filtradas.length} ${filtradas.length === 1 ? 'tipo de habitacion' : 'tipos de habitacion'}`
          )}
        </p>
        {errorDisp && (
          <p className="field-error rooms-error" role="alert">
            <CircleAlert size={16} aria-hidden="true" /> {errorDisp}
          </p>
        )}
      </section>

      <section className="container rooms-results" aria-label="Resultados">
        {filtradas.length > 0 ? (
          <motion.div
            className="rooms-grid"
            variants={grid}
            initial={reduce ? false : 'hidden'}
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {filtradas.map((room) => (
                <RoomCard
                  key={room.id}
                  room={room}
                  search={bookingSearch}
                  disponibles={disponibilidad?.[room.id]}
                />
              ))}
            </AnimatePresence>
          </motion.div>
        ) : (
          <div className="rooms-empty">
            <SearchX size={40} aria-hidden="true" />
            <h2>Ninguna habitacion coincide con los filtros</h2>
            <p>Prueba ajustar el tipo, el numero de huespedes o el precio maximo.</p>
            <button type="button" className="btn btn-primary" onClick={limpiarFiltros}>
              Limpiar filtros
            </button>
          </div>
        )}
      </section>
    </PageTransition>
  );
}
