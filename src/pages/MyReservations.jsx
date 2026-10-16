import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CalendarDays,
  CalendarX2,
  CircleAlert,
  CircleCheck,
  Loader2,
  Moon,
  Users,
  XCircle,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { formatCOP } from '../data/rooms';
import { cancelReservation, listByUser, totalConIva } from '../services/reservationService';
import './MyReservations.css';

const EASE = [0.22, 1, 0.36, 1];

const TABS = [
  { id: 'todas', label: 'Todas' },
  { id: 'confirmada', label: 'Confirmadas' },
  { id: 'cancelada', label: 'Canceladas' },
];

const fechaLarga = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

function formatFecha(iso) {
  return fechaLarga.format(new Date(`${iso}T00:00:00`));
}

export default function MyReservations() {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [filtro, setFiltro] = useState('todas');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelando, setCancelando] = useState(false);
  const [errorCancel, setErrorCancel] = useState('');

  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    let activo = true;
    listByUser(user.id)
      .then((data) => {
        if (activo) setReservas(data);
      })
      .catch(() => {
        if (activo) setErrorCarga('No pudimos cargar tus reservas. Intenta de nuevo.');
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [user.id]);

  // Al abrirse el dialogo, lleva el foco al boton seguro ("Volver").
  useEffect(() => {
    if (!cancelTarget || !dialogRef.current) return;
    const botones = dialogRef.current.querySelectorAll('button');
    botones[0]?.focus();
  }, [cancelTarget]);

  const conteos = useMemo(() => {
    const c = { todas: reservas.length, confirmada: 0, cancelada: 0 };
    for (const r of reservas) {
      if (r.estado === 'confirmada') c.confirmada += 1;
      else if (r.estado === 'cancelada') c.cancelada += 1;
    }
    return c;
  }, [reservas]);

  const filtradas = useMemo(
    () => (filtro === 'todas' ? reservas : reservas.filter((r) => r.estado === filtro)),
    [reservas, filtro],
  );

  function abrirDialogo(reserva, trigger) {
    triggerRef.current = trigger;
    setErrorCancel('');
    setCancelTarget(reserva);
  }

  function cerrarDialogo() {
    setCancelTarget(null);
    triggerRef.current?.focus();
  }

  async function confirmarCancelacion() {
    if (!cancelTarget) return;
    setCancelando(true);
    setErrorCancel('');
    try {
      await cancelReservation(cancelTarget.id, user.id);
      setReservas((prev) =>
        prev.map((r) => (r.id === cancelTarget.id ? { ...r, estado: 'cancelada' } : r)),
      );
      cerrarDialogo();
    } catch {
      setErrorCancel('No pudimos cancelar la reserva. Intenta de nuevo.');
    } finally {
      setCancelando(false);
    }
  }

  function onDialogKeyDown(e) {
    if (e.key === 'Escape' && !cancelando) {
      e.stopPropagation();
      cerrarDialogo();
      return;
    }
    if (e.key === 'Tab' && dialogRef.current) {
      const items = dialogRef.current.querySelectorAll('button:not(:disabled)');
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  return (
    <PageTransition className="reservas-page">
      <div className="container">
        <header className="reservas-header">
          <div>
            <p className="reservas-eyebrow">Tu cuenta</p>
            <h1>Mis reservas</h1>
          </div>
          <Link className="btn btn-ghost" to="/habitaciones">
            Nueva reserva
          </Link>
        </header>

        <div className="tabs" role="group" aria-label="Filtrar reservas">
          {TABS.map((t) => {
            const activo = filtro === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={`tab${activo ? ' is-active' : ''}`}
                aria-pressed={activo}
                onClick={() => setFiltro(t.id)}
              >
                {t.label} ({conteos[t.id]})
                {activo &&
                  (reduce ? (
                    <span className="tab-underline" />
                  ) : (
                    <motion.span
                      layoutId="tab-underline"
                      className="tab-underline"
                      transition={{ duration: 0.25, ease: EASE }}
                    />
                  ))}
              </button>
            );
          })}
        </div>

        {errorCarga && (
          <p className="reservas-error" role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            {errorCarga}
          </p>
        )}

        {cargando ? (
          <div className="reservas-list">
            <span className="sr-only" role="status">
              Cargando tus reservas...
            </span>
            {[0, 1, 2].map((i) => (
              <div className="card sk-card" key={i} aria-hidden="true">
                <div className="sk-line sk-w40" />
                <div className="sk-line sk-w70" />
                <div className="sk-line sk-w55" />
              </div>
            ))}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="card empty">
            <CalendarX2 size={56} aria-hidden="true" className="empty-icon" />
            <h2>{filtro === 'todas' ? 'Aun no tienes reservas' : 'Nada por aqui'}</h2>
            <p>
              {filtro === 'todas'
                ? 'Explora nuestras habitaciones y planea tu proxima escapada.'
                : 'No hay reservas en este filtro. Prueba con otro o haz una nueva reserva.'}
            </p>
            <Link className="btn btn-primary" to="/habitaciones">
              Explorar habitaciones
            </Link>
          </div>
        ) : (
          <div className="reservas-list" aria-live="polite">
            <AnimatePresence mode="popLayout" initial={false}>
              {filtradas.map((r) => (
                <motion.article
                  key={r.id}
                  layout={reduce ? undefined : true}
                  className="card reserva-card"
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                  transition={{ duration: 0.3, ease: EASE }}
                >
                  <div className="reserva-info">
                    <div className="reserva-title-row">
                      <h2>{r.roomNombre}</h2>
                      <span className={`badge badge-${r.estado}`}>
                        {r.estado === 'confirmada' ? (
                          <CircleCheck size={14} aria-hidden="true" />
                        ) : (
                          <XCircle size={14} aria-hidden="true" />
                        )}
                        {r.estado === 'confirmada' ? 'Confirmada' : 'Cancelada'}
                      </span>
                    </div>
                    <p className="reserva-codigo">
                      Codigo: <strong>{r.id}</strong>
                    </p>
                    <ul className="reserva-meta">
                      <li>
                        <CalendarDays size={16} aria-hidden="true" />
                        {formatFecha(r.checkIn)} - {formatFecha(r.checkOut)}
                      </li>
                      <li>
                        <Moon size={16} aria-hidden="true" />
                        {r.noches} {r.noches === 1 ? 'noche' : 'noches'}
                      </li>
                      <li>
                        <Users size={16} aria-hidden="true" />
                        {r.huespedes} {r.huespedes === 1 ? 'huesped' : 'huespedes'}
                      </li>
                    </ul>
                  </div>
                  <div className="reserva-side">
                    <p className="reserva-total">
                      <span className="reserva-total-label">Total (IVA incluido)</span>
                      {formatCOP(totalConIva(r.total))}
                    </p>
                    {r.estado === 'confirmada' && (
                      <button
                        type="button"
                        className="btn btn-ghost btn-cancel"
                        onClick={(e) => abrirDialogo(r, e.currentTarget)}
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                </motion.article>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {cancelTarget && (
          <motion.div
            className="dialog-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={cancelando ? undefined : cerrarDialogo}
          >
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dlg-titulo"
              aria-describedby="dlg-desc"
              className="card dialog"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={onDialogKeyDown}
            >
              <h2 id="dlg-titulo">Cancelar reserva</h2>
              <p id="dlg-desc">
                Vas a cancelar tu reserva <strong>{cancelTarget.id}</strong> en{' '}
                {cancelTarget.roomNombre}. Esta accion no se puede deshacer.
              </p>
              {errorCancel && (
                <p className="dialog-error" role="alert">
                  <CircleAlert size={18} aria-hidden="true" />
                  {errorCancel}
                </p>
              )}
              <div className="dialog-actions">
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={cerrarDialogo}
                  disabled={cancelando}
                >
                  Volver
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmarCancelacion}
                  disabled={cancelando}
                >
                  {cancelando ? (
                    <>
                      <Loader2 size={18} className="spinner" aria-hidden="true" />
                      Cancelando...
                    </>
                  ) : (
                    'Si, cancelar'
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
