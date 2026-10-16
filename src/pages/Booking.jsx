import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleAlert,
  Loader2,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { getRoomById, formatCOP } from '../data/rooms';
import { IVA, createReservation, nightsBetween, totalConIva } from '../services/reservationService';
import './Booking.css';

const EASE = [0.22, 1, 0.36, 1];
const PASOS = ['Fechas', 'Datos', 'Confirmacion'];

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
  const [nombre, setNombre] = useState(user?.nombre ?? '');
  const [telefono, setTelefono] = useState(user?.telefono ?? '');
  const [notas, setNotas] = useState('');
  const [errores, setErrores] = useState({});
  const [enviando, setEnviando] = useState(false);
  const [errorEnvio, setErrorEnvio] = useState('');
  const [reserva, setReserva] = useState(null);

  const tituloRef = useRef(null);

  useEffect(() => {
    tituloRef.current?.focus();
  }, [step]);

  const noches = room && checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 0;
  const subtotal = noches * (room?.precio ?? 0);
  const iva = Math.round(subtotal * IVA);
  const total = subtotal + iva;

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
    return Object.keys(e).length === 0;
  }

  function validarPaso2() {
    const e = {};
    if (!nombre.trim()) e.nombre = 'Escribe el nombre del titular';
    if (!telefono.trim()) e.telefono = 'Escribe un telefono de contacto';
    else if (telefono.replace(/\D/g, '').length < 7) {
      e.telefono = 'Revisa el telefono: debe tener al menos 7 digitos';
    }
    setErrores(e);
    return Object.keys(e).length === 0;
  }

  function continuar() {
    if (step === 1 && validarPaso1()) {
      setDir(1);
      setStep(2);
    } else if (step === 2 && validarPaso2()) {
      confirmar();
    }
  }

  function atras() {
    setDir(-1);
    setStep((s) => Math.max(1, s - 1));
  }

  async function confirmar() {
    setEnviando(true);
    setErrorEnvio('');
    try {
      const r = await createReservation({
        userId: user.id,
        room,
        checkIn,
        checkOut,
        huespedes: Number(huespedes),
        notas: notas.trim(),
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
                    <div className="booking-actions">
                      <span aria-hidden="true" />
                      <button type="button" className="btn btn-primary" onClick={continuar}>
                        Continuar
                        <ArrowRight size={18} aria-hidden="true" />
                      </button>
                    </div>
                  </section>
                )}

                {step === 2 && (
                  <section aria-labelledby="paso2-titulo">
                    <h2 id="paso2-titulo" ref={tituloRef} tabIndex={-1} className="step-title">
                      Datos del titular
                    </h2>
                    <div className="field">
                      <label htmlFor="nombre">Nombre completo</label>
                      <input
                        id="nombre"
                        type="text"
                        autoComplete="name"
                        value={nombre}
                        aria-invalid={!!errores.nombre}
                        aria-describedby={errores.nombre ? 'err-nombre' : undefined}
                        onChange={(e) => {
                          setNombre(e.target.value);
                          limpiarError('nombre');
                        }}
                      />
                      {errores.nombre && (
                        <p className="field-error" id="err-nombre">
                          {errores.nombre}
                        </p>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="email">Correo electronico</label>
                      <input
                        id="email"
                        type="email"
                        value={user.email}
                        readOnly
                        className="input-readonly"
                        aria-describedby="email-hint"
                      />
                      <p className="field-hint" id="email-hint">
                        Es el correo de tu cuenta; alli enviaremos la confirmacion.
                      </p>
                    </div>
                    <div className="field">
                      <label htmlFor="telefono">Telefono de contacto</label>
                      <input
                        id="telefono"
                        type="tel"
                        inputMode="tel"
                        autoComplete="tel"
                        value={telefono}
                        aria-invalid={!!errores.telefono}
                        aria-describedby={errores.telefono ? 'err-telefono' : undefined}
                        onChange={(e) => {
                          setTelefono(e.target.value);
                          limpiarError('telefono');
                        }}
                      />
                      {errores.telefono && (
                        <p className="field-error" id="err-telefono">
                          {errores.telefono}
                        </p>
                      )}
                    </div>
                    <div className="field">
                      <label htmlFor="notas">
                        Peticiones especiales <span className="label-opcional">(opcional)</span>
                      </label>
                      <textarea
                        id="notas"
                        rows={4}
                        maxLength={300}
                        placeholder="Alergias, horario de llegada, celebraciones..."
                        value={notas}
                        onChange={(e) => setNotas(e.target.value)}
                      />
                    </div>
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
                    <motion.svg
                      viewBox="0 0 52 52"
                      className="success-check"
                      aria-hidden="true"
                    >
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
                      Tu estadia en {room.nombre} quedo reservada. Guarda este codigo:
                    </p>
                    <p className="reserva-codigo">{reserva.id}</p>
                    <dl className="success-resumen">
                      <div>
                        <dt>Fechas</dt>
                        <dd>
                          {formatFecha(reserva.checkIn)} - {formatFecha(reserva.checkOut)}
                        </dd>
                      </div>
                      <div>
                        <dt>Noches</dt>
                        <dd>{reserva.noches}</dd>
                      </div>
                      <div>
                        <dt>Huespedes</dt>
                        <dd>{reserva.huespedes}</dd>
                      </div>
                      <div>
                        <dt>Total (IVA incluido)</dt>
                        <dd>{formatCOP(totalConIva(reserva.total))}</dd>
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
                    {checkIn && checkOut
                      ? `${formatFecha(checkIn)} - ${formatFecha(checkOut)}`
                      : 'Por elegir'}
                  </dd>
                </div>
                <div className="summary-row">
                  <dt>Noches</dt>
                  <dd>
                    <ValorAnimado valor={noches} reduce={reduce} />
                  </dd>
                </div>
                <div className="summary-row">
                  <dt>Precio por noche</dt>
                  <dd>{formatCOP(room.precio)}</dd>
                </div>
                <div className="summary-row">
                  <dt>Subtotal</dt>
                  <dd>
                    <ValorAnimado valor={formatCOP(subtotal)} reduce={reduce} />
                  </dd>
                </div>
                <div className="summary-row">
                  <dt>IVA (19%)</dt>
                  <dd>
                    <ValorAnimado valor={formatCOP(iva)} reduce={reduce} />
                  </dd>
                </div>
                <div className="summary-row summary-total">
                  <dt>Total</dt>
                  <dd>
                    <ValorAnimado valor={formatCOP(total)} reduce={reduce} />
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </PageTransition>
  );
}
