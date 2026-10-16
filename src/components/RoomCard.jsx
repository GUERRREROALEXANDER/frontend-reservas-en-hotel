import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Users, BedDouble, Ruler } from 'lucide-react';
import { formatCOP } from '../data/rooms';
import './RoomCard.css';

// Tarjeta de habitacion. `search` conserva los query params de fechas (ej. "?checkIn=...&checkOut=...").
export default function RoomCard({ room, search = '' }) {
  const reduce = useReducedMotion();

  const item = {
    hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] },
    },
    exit: reduce
      ? { opacity: 0, transition: { duration: 0.15 } }
      : { opacity: 0, scale: 0.96, transition: { duration: 0.15 } },
  };

  return (
    <motion.article
      className="room-card"
      layout
      variants={item}
      exit="exit"
      whileHover={reduce ? undefined : { y: -6 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="room-card-media">
        <img src={room.imagen} alt={`Vista de ${room.nombre}`} loading="lazy" />
        <span className="room-card-badge">{room.tipo}</span>
      </div>
      <div className="room-card-body">
        <h3 className="room-card-name">{room.nombre}</h3>
        <ul className="room-card-meta">
          <li>
            <Users size={16} aria-hidden="true" />
            <span>
              {room.capacidad} {room.capacidad === 1 ? 'huesped' : 'huespedes'}
            </span>
          </li>
          <li>
            <BedDouble size={16} aria-hidden="true" />
            <span>{room.camas}</span>
          </li>
          <li>
            <Ruler size={16} aria-hidden="true" />
            <span>{room.tamano} m²</span>
          </li>
        </ul>
        <ul className="room-card-amenities" aria-label="Amenidades">
          {room.amenidades.map((a) => (
            <li key={a}>{a}</li>
          ))}
        </ul>
        <div className="room-card-footer">
          <p className="room-card-price">
            <strong>{formatCOP(room.precio)}</strong> <span>/ noche</span>
          </p>
          <Link to={`/reservar/${room.id}${search}`} className="btn btn-primary room-card-btn">
            Reservar
          </Link>
        </div>
      </div>
    </motion.article>
  );
}
