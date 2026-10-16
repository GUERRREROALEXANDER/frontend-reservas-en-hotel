import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  CalendarDays,
  CalendarX2,
  CircleAlert,
  CircleCheck,
  KeyRound,
  Loader2,
  LogIn,
  LogOut,
  Moon,
  Printer,
  RotateCw,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import { useAuth } from '../context/AuthContext';
import { formatPrecio, getRoomById } from '../data/rooms';
import {
  ESTADOS,
  checkIn,
  checkOut,
  listByUser,
  nombreServicio,
} from '../services/reservationService';
import './MyReservations.css';

const EASE = [0.22, 1, 0.36, 1];

const TABS = [
  { id: 'todas', label: 'Todas' },
  { id: 'CONFIRMED', label: 'Confirmadas' },
  { id: 'CHECKED_IN', label: 'Hospedado' },
  { id: 'CHECKED_OUT', label: 'Finalizadas' },
];

const ICONO_ESTADO = { CONFIRMED: CircleCheck, CHECKED_IN: KeyRound, CHECKED_OUT: LogOut };
const TEMPORADA = { HIGH: 'Alta', LOW: 'Baja' };

const fechaLarga = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
});

const fechaHora = new Intl.DateTimeFormat('es-CO', {
  dateStyle: 'medium',
  timeStyle: 'short',
});

function formatFecha(iso) {
  return fechaLarga.format(new Date(`${iso}T00:00:00`));
}

function Factura({ factura }) {
  return (
    <div className="factura">
      <dl className="factura-datos">
        <div>
          <dt>Factura</dt>
          <dd>{factura.invoiceNumber}</dd>
        </div>
        <div>
          <dt>Emitida</dt>
          <dd>{fechaHora.format(new Date(factura.issuedAt))}</dd>
        </div>
        <div>
          <dt>Habitacion</dt>
          <dd>
            {factura.roomNumber} · {getRoomById(factura.roomType)?.tipo ?? factura.roomType}
          </dd>
        </div>
        <div>
          <dt>Temporada</dt>
          <dd>{TEMPORADA[factura.season] ?? factura.season}</dd>
        </div>
        <div>
          <dt>Noches</dt>
          <dd>{factura.nights}</dd>
        </div>
        <div>
          <dt>Costo habitacion</dt>
          <dd>{formatPrecio(factura.roomCost)}</dd>
        </div>
      </dl>
      {factura.serviceLines.length > 0 && (
        <div className="factura-tabla-wrap">
          <table className="factura-tabla">
            <caption>Servicios adicionales</caption>
            <thead>
              <tr>
                <th scope="col">Descripcion</th>
                <th scope="col">Cant.</th>
                <th scope="col">Precio unit.</th>
                <th scope="col">Total</th>
              </tr>
            </thead>
            <tbody>
              {factura.serviceLines.map((l, i) => (
                <tr key={i}>
                  <td>{nombreServicio(l)}</td>
                  <td>{l.quantity}</td>
                  <td>{formatPrecio(l.unitPrice)}</td>
                  <td>{formatPrecio(l.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <dl className="factura-totales">
        <div>
          <dt>Servicios</dt>
          <dd>{formatPrecio(factura.servicesTotal)}</dd>
        </div>
        <div className="factura-gran-total">
          <dt>Total pagado</dt>
          <dd>{formatPrecio(factura.grandTotal)}</dd>
        </div>
      </dl>
    </div>
  );
}

export default function MyReservations() {
  const { user } = useAuth();
  const reduce = useReducedMotion();

  const [reservas, setReservas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [filtro, setFiltro] = useState('todas');
  // dialogo: { tipo: 'checkin' | 'checkout', reserva, resultado? }
  const [dialogo, setDialogo] = useState(null);
  const [procesando, setProcesando] = useState(false);
  const [errorAccion, setErrorAccion] = useState('');

  const dialogRef = useRef(null);
  const triggerRef = useRef(null);

  const cargar = useCallback(() => {
    let activo = true;
    setCargando(true);
    setErrorCarga('');
    listByUser(user.id)
      .then((data) => {
        if (activo) setReservas(data);
      })
      .catch((err) => {
        if (activo) setErrorCarga(err.message);
      })
      .finally(() => {
        if (activo) setCargando(false);
      });
    return () => {
      activo = false;
    };
  }, [user.id]);

  useEffect(() => cargar(), [cargar]);

  // Al abrir el dialogo o cambiar a su estado de resultado, enfoca el primer boton.
  useEffect(() => {
    if (!dialogo || !dialogRef.current) return;
    dialogRef.current.querySelector('button')?.focus();
  }, [dialogo]);

  const conteos = useMemo(() => {
    const c = { todas: reservas.length, CONFIRMED: 0, CHECKED_IN: 0, CHECKED_OUT: 0 };
    for (const r of reservas) c[r.status] = (c[r.status] ?? 0) + 1;
    return c;
  }, [reservas]);

  const filtradas = useMemo(
    () => (filtro === 'todas' ? reservas : reservas.filter((r) => r.status === filtro)),
    [reservas, filtro],
  );

  function abrirDialogo(tipo, reserva, trigger) {
    triggerRef.current = trigger;
    setErrorAccion('');
    setDialogo({ tipo, reserva });
  }

  function cerrarDialogo() {
    setDialogo(null);
    // el boton original puede haber desaparecido si la reserva cambio de estado
    if (triggerRef.current?.isConnected) triggerRef.current.focus();
  }

  function actualizarReserva(id, cambios) {
    setReservas((prev) => prev.map((r) => (r.reservationId === id ? { ...r, ...cambios } : r)));
  }

  async function ejecutarAccion() {
    if (!dialogo) return;
    const { tipo, reserva } = dialogo;
    setProcesando(true);
    setErrorAccion('');
    try {
      if (tipo === 'checkin') {
        const res = await checkIn(reserva.reservationId);
        actualizarReserva(reserva.reservationId, { status: res.status, digitalKey: res.digitalKey });
        setDialogo({ tipo, reserva, resultado: res });
      } else {
        const factura = await checkOut(reserva.reservationId);
        actualizarReserva(reserva.reservationId, { status: 'CHECKED_OUT', digitalKey: null });
        setDialogo({ tipo, reserva, resultado: factura });
      }
    } catch (err) {
      setErrorAccion(err.message);
    } finally {
      setProcesando(false);
    }
  }

  function onDialogKeyDown(e) {
    if (e.key === 'Escape' && !procesando) {
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

  const tipoNombre = (r) => getRoomById(r.room.type)?.nombre ?? r.room.type;

  return (
    <PageTransition className="reservas-page">
      <div className="container">
        <header className="reservas-header">
          <div>
            <p className="reservas-eyebrow">Tu cuenta</p>
            <h1>Mis reservas</h1>
            <p className="reservas-nota">Las reservas se consultan en el sistema del hotel en tiempo real.</p>
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
                {t.label} ({conteos[t.id] ?? 0})
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
          <div className="reservas-error" role="alert">
            <CircleAlert size={18} aria-hidden="true" />
            <span>{errorCarga}</span>
            <button type="button" className="btn btn-ghost btn-reintentar" onClick={cargar}>
              <RotateCw size={16} aria-hidden="true" />
              Reintentar
            </button>
          </div>
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
        ) : errorCarga ? null : filtradas.length === 0 ? (
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
              {filtradas.map((r) => {
                const Icono = ICONO_ESTADO[r.status] ?? CircleCheck;
                return (
                  <motion.article
                    key={r.reservationId}
                    layout={reduce ? undefined : true}
                    className="card reserva-card"
                    initial={reduce ? false : { opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduce ? undefined : { opacity: 0, scale: 0.97 }}
                    transition={{ duration: 0.3, ease: EASE }}
                  >
                    <img
                      className="reserva-img"
                      src={getRoomById(r.room.type)?.imagen}
                      alt={`Foto de ${tipoNombre(r)}`}
                      loading="lazy"
                    />
                    <div className="reserva-info">
                      <div className="reserva-title-row">
                        <h2>{tipoNombre(r)}</h2>
                        <span className={`badge badge-${r.status.toLowerCase()}`}>
                          <Icono size={14} aria-hidden="true" />
                          {ESTADOS[r.status] ?? r.status}
                        </span>
                      </div>
                      <p className="reserva-habitacion">
                        Habitacion {r.room.roomNumber} · Piso {r.room.floor}
                      </p>
                      <p className="reserva-codigo">
                        Codigo: <code>{r.reservationId}</code>
                      </p>
                      <ul className="reserva-meta">
                        <li>
                          <CalendarDays size={16} aria-hidden="true" />
                          {formatFecha(r.checkInDate)} - {formatFecha(r.checkOutDate)}
                        </li>
                        <li>
                          <Moon size={16} aria-hidden="true" />
                          {r.nights} {r.nights === 1 ? 'noche' : 'noches'}
                        </li>
                      </ul>
                      {r.additionalServices.length > 0 && (
                        <ul className="reserva-servicios" aria-label="Servicios adicionales">
                          {r.additionalServices.map((s, i) => (
                            <li key={`${s.type}-${i}`}>
                              {nombreServicio(s)} · {formatPrecio(s.cost)}
                            </li>
                          ))}
                        </ul>
                      )}
                      {r.status === 'CHECKED_IN' && r.digitalKey && (
                        <p className="reserva-llave">
                          <KeyRound size={18} aria-hidden="true" />
                          Llave digital: <code>{r.digitalKey}</code>
                        </p>
                      )}
                    </div>
                    <div className="reserva-side">
                      <p className="reserva-total">
                        <span className="reserva-total-label">Total estimado</span>
                        {formatPrecio(r.estimatedTotal)}
                      </p>
                      {r.status === 'CONFIRMED' && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={(e) => abrirDialogo('checkin', r, e.currentTarget)}
                        >
                          <LogIn size={18} aria-hidden="true" />
                          Hacer check-in
                        </button>
                      )}
                      {r.status === 'CHECKED_IN' && (
                        <button
                          type="button"
                          className="btn btn-accent"
                          onClick={(e) => abrirDialogo('checkout', r, e.currentTarget)}
                        >
                          <LogOut size={18} aria-hidden="true" />
                          Hacer check-out
                        </button>
                      )}
                      {r.status === 'CHECKED_OUT' && (
                        <p className="reserva-fin">Estadia finalizada</p>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {dialogo && (
          <motion.div
            className="dialog-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={procesando ? undefined : cerrarDialogo}
          >
            <motion.div
              ref={dialogRef}
              role="dialog"
              aria-modal="true"
              aria-labelledby="dlg-titulo"
              className={`card dialog${dialogo.tipo === 'checkout' && dialogo.resultado ? ' dialog--factura' : ''}`}
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.92, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 8 }}
              transition={{ duration: 0.25, ease: EASE }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={onDialogKeyDown}
            >
              {!dialogo.resultado ? (
                <>
                  <h2 id="dlg-titulo">
                    {dialogo.tipo === 'checkin' ? 'Hacer check-in' : 'Hacer check-out'}
                  </h2>
                  <p>
                    {dialogo.tipo === 'checkin'
                      ? `Vas a registrar tu llegada a la habitacion ${dialogo.reserva.room.roomNumber}. Recibiras una llave digital.`
                      : `Vas a registrar tu salida de la habitacion ${dialogo.reserva.room.roomNumber}. Se generara la factura final y la llave digital dejara de funcionar.`}
                  </p>
                  {errorAccion && (
                    <p className="dialog-error" role="alert">
                      <CircleAlert size={18} aria-hidden="true" />
                      {errorAccion}
                    </p>
                  )}
                  <div className="dialog-actions">
                    <button
                      type="button"
                      className="btn btn-ghost"
                      onClick={cerrarDialogo}
                      disabled={procesando}
                    >
                      Volver
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={ejecutarAccion}
                      disabled={procesando}
                    >
                      {procesando ? (
                        <>
                          <Loader2 size={18} className="spinner" aria-hidden="true" />
                          Procesando...
                        </>
                      ) : dialogo.tipo === 'checkin' ? (
                        'Confirmar check-in'
                      ) : (
                        'Confirmar check-out'
                      )}
                    </button>
                  </div>
                </>
              ) : dialogo.tipo === 'checkin' ? (
                <div className="dialog-exito">
                  <motion.span
                    className="dialog-exito-icon"
                    initial={reduce ? false : { scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                  >
                    <KeyRound size={36} aria-hidden="true" />
                  </motion.span>
                  <h2 id="dlg-titulo">Bienvenido a la habitacion {dialogo.resultado.roomNumber}</h2>
                  <p>Esta es tu llave digital. Presentala en la puerta de tu habitacion:</p>
                  <code className="llave-grande">{dialogo.resultado.digitalKey}</code>
                  <div className="dialog-actions">
                    <button type="button" className="btn btn-primary" onClick={cerrarDialogo}>
                      Listo
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 id="dlg-titulo">Factura de tu estadia</h2>
                  <Factura factura={dialogo.resultado} />
                  <div className="dialog-actions">
                    <button type="button" className="btn btn-ghost" onClick={() => window.print()}>
                      <Printer size={18} aria-hidden="true" />
                      Imprimir factura
                    </button>
                    <button type="button" className="btn btn-primary" onClick={cerrarDialogo}>
                      Cerrar
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageTransition>
  );
}
