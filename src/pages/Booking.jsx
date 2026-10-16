import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Car,
  Check,
  CircleAlert,
  CircleCheck,
  Coffee,
  Copy,
  Flower2,
  Loader2,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { getRoomById, formatPrecio } from '../data/rooms';
import {
  SERVICIOS,
  createReservation,
  estimateRoomCost,
  getAvailability,
  nightsBetween,
  nombreServicio,
  servicioCost,
} from '../services/reservationService';
import './Booking.css';

const EASE = [0.22, 1, 0.36, 1];
const PASOS = ['Fechas', 'Servicios', 'Confirmacion'];
const ICONOS_SERVICIO = { SPA: Flower2, BREAKFAST: Coffee, AIRPORT_TRANSPORT: Car };
const MESES_ALTA = [6, 7, 12];

function dateStr(d) {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

function todayStr() {
  return dateStr(new Date());
}

function addDays(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return dateStr(d);
}

function tocaTemporadaAlta(checkIn, checkOut) {
  const noches = nightsBetween(checkIn, checkOut);
  const d = new Date(`${checkIn}T00:00:00`);
  for (let i = 0; i < noches; i++) {
    if (MESES_ALTA.includes(d.getMonth() + 1)) return true;
    d.setDate(d.getDate() + 1);
  }
  return false;
}

const fechaFmt = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

function formatFecha(iso) {
  return fechaFmt.format(new Date(`${iso}T00:00:00`));
}

function ValorAnimado({ valor, reduce }) {
  return (
    <motion.span
      className="valor-animado"
      key={String(valor)}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: EASE }}
    >
      {valor}
    </motion.span>
  );
}

export default function Booking() {
  const { roomId } = useParams();
  const room = getRoomById(roomId);
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const reduce = useReducedMotion();

  const [step, setStep] = useState(1);
  const [dir, setDir] = useState(1);
  const [checkIn, setCheckIn] = useState(() => searchParams.get('checkIn') ?? '');
  const [checkOut, setCheckOut] = useState(() => searchParams.get('checkOut') ?? '');
  const [huespedes, setHuespedes] = useState(() => {
    if (!room) return 1;
    const q = Number.parseInt(searchParams.get('huespedes') ?? '', 10);
    if (Number.isFinite(q)) return Math.min(Math.max(q, 1), room.capacidad);
    return Math.min(2, room.capacidad);
  });
  const [servicios, setServicios] = useState([]);
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [reserva, setReserva] = useState(null);
  const [copiado, setCopiado] = useState(false);
  // estado: idle | loading | ok | error
  const [disp, setDisp] = useState({ estado: 'idle', libres: 0, base: null, error: '' });

  const tituloRef = useRef(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, [step]);

  const fechasValidas = Boolean(checkIn && checkOut && checkIn >= todayStr() && checkOut > checkIn);

  // Consulta de disponibilidad en el backend con debounce; se ignoran respuestas viejas.
  useEffect(() => {
    if (!room || !fechasValidas) {
      setDisp({ estado: 'idle', libres: 0, base: null, error: '' });
      return undefined;
    }
    let activo = true;
    setDisp((d) => ({ ...d, estado: 'loading', error: '' }));
    const t = setTimeout(() => {
      getAvailability(checkIn, checkOut, room.id)
        .then((libres) => {
          if (!activo) return;
          setDisp({
            estado: 'ok',
            libres: libres.length,
            base: libres[0]?.basePricePerNight ?? null,
            error: '',
          });
        })
        .catch((err) => {
          if (activo) setDisp({ estado: 'error', libres: 0, base: null, error: err.message });
        });
    }, 300);
    return () => {
      activo = false;
      clearTimeout(t);
    };
  }, [room, checkIn, checkOut, fechasValidas]);

  const noches = room && fechasValidas ? nightsBetween(checkIn, checkOut) : 0;
  const base = disp.base ?? room?.precio ?? 0;
  const costoHabitacion = noches ? estimateRoomCost(base, checkIn, checkOut) : 0;
  const seleccionados = SERVICIOS.filter((s) => servicios.includes(s.id));
  const costoServicios = seleccionados.reduce((acc, s) => acc + servicioCost(s, noches), 0);
  const total = costoHabitacion + costoServicios;
  const temporadaAlta = noches > 0 && tocaTemporadaAlta(checkIn, checkOut);
  const sinCupo = disp.estado === 'error' || (disp.estado === 'ok' && disp.libres === 0);

  if (!room) {
    return (
      <PageTransition className="booking-page">
        <div className="container booking-missing">
          <h1>Habitacion no disponible</h1>
          <p>No encontramos la habitacion que buscas. Revisa nuestras opciones y elige otra.</p>
          <Link className="btn btn-primary" to="/habitaciones">
            Ver habitaciones
          </Link>
        </div>
      </PageTransition>
    );
  }

  const limpiarError = (campo) =>
    setErrores((prev) => {
      if (!(campo in prev)) return prev;
      const rest = { ...prev };
      delete rest[campo];
      return rest;
    });

  function validarPaso1() {
    const e = {};
    if (!checkIn) e.checkIn = 'Selecciona la fecha de llegada';
    else if (checkIn < todayStr()) e.checkIn = 'La llegada no puede ser en el pasado';
    if (!checkOut) e.checkOut = 'Selecciona la fecha de salida';
    else if (checkIn && checkOut <= checkIn) {
      e.checkOut = 'La salida debe ser posterior a la llegada';
    }
    if (!huespedes || huespedes < 1 || huespedes > room.capacidad) {
      e.huespedes = `Esta habitacion admite entre 1 y ${room.capacidad} huespedes`;
    }
    setErrores(e);
    return Object.keys(e).length === 0 && disp.estado === 'ok' && disp.libres > 0;
  }

  function toggleServicio(id) {
    setServicios((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function continuar() {
    if (step === 1 && validarPaso1()) {
      setDir(1);
      setStep(2);
    } else if (step === 2) {
      confirmar();
    }
  }

  function atras() {
    setDir(-1);
    setErrorEnvio('');
    setStep((s) => Math.max(1, s - 1));
  }

  async function confirmar() {
    setEnviando(true);
    setErrorEnvio('');
    try {
      const r = await createReservation({
        user,
        roomType: room.id,
        checkIn,
        checkOut,
        servicios,
      });
      setReserva(r);
      setDir(1);
      setStep(3);
    } catch (err) {
      setErrorEnvio(err.message);
    } finally {
      setEnviando(false);
    }
  }

  async function copiarCodigo() {
    try {
      await navigator.clipboard.writeText(reserva.reservationId);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      // portapapeles no disponible: el codigo sigue visible para copiarlo a mano
    }
  }

  const pasoVariantes = {
    initial: { opacity: 0, x: 48 * dir },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -48 * dir },
  };

  return (
    <PageTransition className="booking-page">
      <div className="container">
        <header className="booking-header">
          <p className="booking-eyebrow">Reserva tu estadia</p>
          <h1>{room.nombre}</h1>
        </header>

        <ol className="booking-steps" aria-label="Progreso de la reserva">
          {PASOS.map((label, i) => {
            const n = i + 1;
            const done = step > n;
            const active = step === n;
            return (
              <li key={label} className="step-wrap">
                <div
                  className={`step-item${active ? ' is-active' : ''}${done ? ' is-done' : ''}`}
                  aria-current={active ? 'step' : undefined}
                >
                  <motion.span
                    className="step-dot"
                    initial={false}
                    animate={{ scale: active && !reduce ? 1.12 : 1 }}
                    transition={{ duration: 0.25, ease: EASE }}
                  >
                    {done ? (
                      <motion.span
                        initial={reduce ? false : { scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.2, ease: EASE }}
                        className="step-check"
                      >
                        <Check size={18} aria-hidden="true" />
                      </motion.span>
                    ) : (
                      n
                    )}
                  </motion.span>
                  <span className="step-label">{label}</span>
                </div>
                {i < PASOS.length - 1 && (
                  <span className="step-line" aria-hidden="true">
                    <motion.span
                      className="step-line-fill"
                      initial={false}
                      animate={{ scaleX: done ? 1 : 0 }}
                      transition={{ duration: 0.35, ease: EASE }}
                    />
                  </span>
                )}
              </li>
            );
          })}
        </ol>

        <div className="booking-grid">
          <div className="booking-panel card">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={step}
                variants={reduce ? undefined : pasoVariantes}
                initial={reduce ? false : 'initial'}
                animate="animate"
                exit={reduce ? undefined : 'exit'}
                transition={{ duration: 0.3, ease: EASE }}
              >
                {step === 1 && (
                  <section aria-labelledby="paso1-titulo">
                    <h2 id="paso1-titulo" ref={tituloRef} tabIndex={-1} className="step-title">
                      Elige tus fechas
                    </h2>
                    <div className="field-row">
                      <div className="field">
                        <label htmlFor="checkIn">Fecha de llegada</label>
                        <input
                          id="checkIn"
                          type="date"
                          min={todayStr()}
                          value={checkIn}
                          aria-invalid={!!errores.checkIn}
                          aria-describedby={errores.checkIn ? 'err-checkIn' : undefined}
                          onChange={(e) => {
                            const v = e.target.value;
                            setCheckIn(v);
                            if (v && checkOut && checkOut <= v) setCheckOut('');
                            limpiarError('checkIn');
                          }}
                        />
                        {errores.checkIn && (
                          <p className="field-error" id="err-checkIn">
                            {errores.checkIn}
                          </p>
                        )}
                      </div>
                      <div className="field">
                        <label htmlFor="checkOut">Fecha de salida</label>
                        <input
                          id="checkOut"
                          type="date"
                          min={checkIn ? addDays(checkIn, 1) : addDays(todayStr(), 1)}
                          value={checkOut}
                          aria-invalid={!!errores.checkOut}
                          aria-describedby={errores.checkOut ? 'err-checkOut' : undefined}
                          onChange={(e) => {
                            setCheckOut(e.target.value);
                            limpiarError('checkOut');
                          }}
                        />
                        {errores.checkOut && (
                          <p className="field-error" id="err-checkOut">
                            {errores.checkOut}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="field">
                      <label htmlFor="huespedes">Huespedes (maximo {room.capacidad})</label>
                      <select
                        id="huespedes"
                        value={huespedes}
                        aria-invalid={!!errores.huespedes}
                        aria-describedby={errores.huespedes ? 'err-huespedes' : undefined}
                        onChange={(e) => {
                          setHuespedes(Number(e.target.value));
                          limpiarError('huespedes');
                        }}
                      >
                        {Array.from({ length: room.capacidad }, (_, i) => i + 1).map((n) => (
                          <option key={n} value={n}>
                            {n} {n === 1 ? 'huesped' : 'huespedes'}
                          </option>
                        ))}
                      </select>
                      {errores.huespedes && (
                        <p className="field-error" id="err-huespedes">
                          {errores.huespedes}
                        </p>
                      )}
                    </div>

                    <div className="disp-status" aria-live="polite">
                      {disp.estado === 'loading' && (
                        <p className="disp disp--loading">
                          <Loader2 size={18} className="spinner" aria-hidden="true" />
                          Consultando disponibilidad...
                        </p>
                      )}
                      {disp.estado === 'ok' && disp.libres > 0 && (
                        <p className="disp disp--ok">
                          <CircleCheck size={18} aria-hidden="true" />
                          {disp.libres} {disp.libres === 1 ? 'habitacion disponible' : 'habitaciones disponibles'}
                        </p>
                      )}
                      {disp.estado === 'ok' && disp.libres === 0 && (
                        <p className="disp disp--error">
                          <CircleAlert size={18} aria-hidden="true" />
                          Sin disponibilidad para esas fechas
                        </p>
                      )}
                      {disp.estado === 'error' && (
                        <p className="disp disp--error">
                          <CircleAlert size={18} aria-hidden="true" />
                          {disp.error}
                        </p>
                      )}
                    </div>

                    <div className="booking-actions">
                      <span aria-hidden="true" />
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={continuar}
                        disabled={disp.estado === 'loading' || sinCupo}
                      >
                        Continuar
                        <ArrowRight size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </section>
                )}

                {step === 2 && (
                  <section aria-labelledby="paso2-titulo">
                    <h2 id="paso2-titulo" ref={tituloRef} tabIndex={-1} className="step-title">
                      Titular y servicios
                    </h2>
                    <div className="field-row">
                      <div className="field">
                        <label htmlFor="nombre">Titular</label>
                        <input
                          id="nombre"
                          type="text"
                          value={user.nombre}
                          readOnly
                          className="input-readonly"
                        />
                      </div>
                      <div className="field">
                        <label htmlFor="email">Correo electronico</label>
                        <input
                          id="email"
                          type="email"
                          value={user.email}
                          readOnly
                          className="input-readonly"
                        />
                      </div>
                    </div>
                    <p className="field-hint">La reserva queda a nombre de tu cuenta.</p>

                    <fieldset className="servicios">
                      <legend>
                        Servicios adicionales <span className="label-opcional">(opcional)</span>
                      </legend>
                      {SERVICIOS.map((s) => {
                        const Icon = ICONOS_SERVICIO[s.id];
                        const activo = servicios.includes(s.id);
                        return (
                          <motion.label
                            key={s.id}
                            className={`servicio-opcion${activo ? ' is-selected' : ''}`}
                            animate={{ scale: activo && !reduce ? 1.01 : 1 }}
                            transition={{ duration: 0.2, ease: EASE }}
                          >
                            <input
                              type="checkbox"
                              checked={activo}
                              onChange={() => toggleServicio(s.id)}
                            />
                            <span className="servicio-opcion-icon" aria-hidden="true">
                              <Icon size={22} />
                            </span>
                            <span className="servicio-opcion-info">
                              <strong>{s.nombre}</strong>
                              <span>{s.detalle}</span>
                            </span>
                            <span className="servicio-opcion-precio">
                              {formatPrecio(s.precio)}
                              {s.porNoche ? ' / noche' : ''}
                              {s.porNoche && noches > 0 && (
                                <small>
                                  {noches} {noches === 1 ? 'noche' : 'noches'}:{' '}
                                  {formatPrecio(servicioCost(s, noches))}
                                </small>
                              )}
                            </span>
                          </motion.label>
                        );
                      })}
                    </fieldset>

                    {errorEnvio && (
                      <p className="form-error" role="alert">
                        <CircleAlert size={18} aria-hidden="true" />
                        {errorEnvio}
                      </p>
                    )}
                    <div className="booking-actions">
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={atras}
                        disabled={enviando}
                      >
                        <ArrowLeft size={18} aria-hidden="true" />
                        Atras
                      </button>
                      <button
                        type="button"
                        className="btn btn-accent"
                        onClick={continuar}
                        disabled={enviando}
                      >
                        {enviando ? (
                          <>
                            <Loader2 size={18} className="spinner" aria-hidden="true" />
                            Confirmando...
                          </>
                        ) : (
                          'Confirmar reserva'
                        )}
                      </button>
                    </div>
                  </section>
                )}

                {step === 3 && reserva && (
                  <section className="booking-success" aria-labelledby="exito-titulo">
                    <motion.svg viewBox="0 0 52 52" className="success-check" aria-hidden="true">
                      <motion.circle
                        cx="26"
                        cy="26"
                        r="24"
                        fill="none"
                        strokeWidth="2"
                        initial={reduce ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                      />
                      <motion.path
                        d="M15 27l7.5 7.5L37 20"
                        fill="none"
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        initial={reduce ? false : { pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ duration: 0.4, delay: reduce ? 0 : 0.35, ease: 'easeOut' }}
                      />
                    </motion.svg>
                    <h2 id="exito-titulo" ref={tituloRef} tabIndex={-1} className="step-title">
                      Reserva confirmada
                    </h2>
                    <p className="success-text">
                      Te asignamos la habitacion {reserva.room.roomNumber} (piso {reserva.room.floor}).
                      Guarda tu codigo de reserva:
                    </p>
                    <div className="codigo-wrap">
                      <code className="reserva-codigo">{reserva.reservationId}</code>
                      <button type="button" className="btn btn-ghost btn-copiar" onClick={copiarCodigo}>
                        {copiado ? (
                          <Check size={18} aria-hidden="true" />
                        ) : (
                          <Copy size={18} aria-hidden="true" />
                        )}
                        {copiado ? 'Copiado' : 'Copiar codigo'}
                      </button>
                    </div>
                    <dl className="success-resumen">
                      <div>
                        <dt>Fechas</dt>
                        <dd>
                          {formatFecha(reserva.checkInDate)} - {formatFecha(reserva.checkOutDate)}
                        </dd>
                      </div>
                      <div>
                        <dt>Noches</dt>
                        <dd>{reserva.nights}</dd>
                      </div>
                      <div>
                        <dt>Servicios</dt>
                        <dd>
                          {reserva.additionalServices.length
                            ? reserva.additionalServices.map(nombreServicio).join(', ')
                            : 'Ninguno'}
                        </dd>
                      </div>
                      <div>
                        <dt>Total estimado</dt>
                        <dd>{formatPrecio(reserva.estimatedTotal)}</dd>
                      </div>
                    </dl>
                    <div className="booking-actions booking-actions-center">
                      <Link className="btn btn-primary" to="/mis-reservas">
                        Ver mis reservas
                      </Link>
                      <Link className="btn btn-ghost" to="/">
                        Volver al inicio
                      </Link>
                    </div>
                  </section>
                )}
              </motion.div>
            </AnimatePresence>
          </div>

          <aside className="booking-summary card" aria-label="Resumen de la reserva">
            <img src={room.imagen} alt={room.nombre} className="summary-img" loading="lazy" />
            <div className="summary-body">
              <h2 className="summary-name">{room.nombre}</h2>
              <p className="summary-tipo">
                {room.tipo} · hasta {room.capacidad}{' '}
                {room.capacidad === 1 ? 'huesped' : 'huespedes'}
              </p>
              <dl className="summary-list">
                <div className="summary-row">
                  <dt>Fechas</dt>
                  <dd>
                    {fechasValidas
                      ? `${formatFecha(checkIn)} - ${formatFecha(checkOut)}`
                      : 'Por elegir'}
                  </dd>
                </div>
                <div className="summary-row">
                  <dt>Precio base por noche</dt>
                  <dd>{formatPrecio(base)}</dd>
                </div>
                <div className="summary-row">
                  <dt>Noches</dt>
                  <dd>
                    <ValorAnimado valor={noches} reduce={reduce} />
                  </dd>
                </div>
                <div className="summary-row">
                  <dt>Habitacion (estimado)</dt>
                  <dd>
                    <ValorAnimado valor={formatPrecio(costoHabitacion)} reduce={reduce} />
                  </dd>
                </div>
                {seleccionados.map((s) => (
                  <div className="summary-row" key={s.id}>
                    <dt>{s.nombre}</dt>
                    <dd>
                      <ValorAnimado valor={formatPrecio(servicioCost(s, noches))} reduce={reduce} />
                    </dd>
                  </div>
                ))}
                <div className="summary-row summary-total">
                  <dt>Total estimado</dt>
                  <dd>
                    <ValorAnimado valor={formatPrecio(total)} reduce={reduce} />
                  </dd>
                </div>
              </dl>
              {temporadaAlta && (
                <p className="summary-nota">
                  Incluye tarifa de temporada alta (x1.5) en junio, julio y diciembre.
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </PageTransition>
  );
}
