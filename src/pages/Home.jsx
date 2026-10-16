import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from 'framer-motion';
import {
  CalendarDays,
  Car,
  ChevronLeft,
  ChevronRight,
  Dumbbell,
  Flower2,
  Star,
  UtensilsCrossed,
  Waves,
  Wifi,
} from 'lucide-react';
import PageTransition from '../components/PageTransition';
import RoomCard from '../components/RoomCard';
import { rooms } from '../data/rooms';
import './Home.css';

const EASE = [0.22, 1, 0.36, 1];
const HERO_IMG =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=2000&q=70';

const servicios = [
  {
    icon: Flower2,
    nombre: 'Spa y bienestar',
    detalle: 'Masajes, sauna y rituales de relajacion para renovar cuerpo y mente.',
  },
  {
    icon: Waves,
    nombre: 'Piscina',
    detalle: 'Piscina climatizada al aire libre con zona de camastros y bar.',
  },
  {
    icon: UtensilsCrossed,
    nombre: 'Restaurante',
    detalle: 'Cocina local e internacional de autor, de 6:00 a 23:00.',
  },
  {
    icon: Wifi,
    nombre: 'Wi-Fi gratis',
    detalle: 'Internet de alta velocidad en todas las areas del hotel.',
  },
  {
    icon: Car,
    nombre: 'Parqueadero',
    detalle: 'Estacionamiento privado y vigilado las 24 horas.',
  },
  {
    icon: Dumbbell,
    nombre: 'Gimnasio',
    detalle: 'Equipos modernos disponibles a cualquier hora del dia.',
  },
];

const testimonios = [
  {
    nombre: 'Camila Rodriguez',
    ciudad: 'Bogota',
    estrellas: 5,
    texto:
      'La atencion fue impecable de principio a fin. La suite supero todas nuestras expectativas y la vista al amanecer es algo que nunca vamos a olvidar.',
  },
  {
    nombre: 'Andres Mejia',
    ciudad: 'Medellin',
    estrellas: 5,
    texto:
      'Reservar fue facilisimo y el personal nos recibio con una calidez enorme. El spa y el restaurante valen cada peso. Volvemos seguro.',
  },
  {
    nombre: 'Valentina Torres',
    ciudad: 'Cartagena',
    estrellas: 5,
    texto:
      'Viajamos con dos ninos y la suite fue perfecta: espaciosa, limpia y con todo lo que necesitabamos. Los chicos no se querian ir.',
  },
];

const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const sumarDia = (iso) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return toISODate(d);
};

const fadeUp = (reduce) => ({
  hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
});

function Hero() {
  const ref = useRef(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '15%']);

  const titulo = 'El descanso que tu viaje merece';
  const palabras = titulo.split(' ');

  const contenedor = {
    visible: { transition: { staggerChildren: 0.06, delayChildren: 0.1 } },
  };
  const palabra = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
  };

  return (
    <section className="hero" ref={ref}>
      <motion.div className="hero-media" style={reduce ? undefined : { y }}>
        <img src={HERO_IMG} alt="Piscina iluminada del Hotel Aurora al atardecer" />
      </motion.div>
      <div className="hero-overlay" aria-hidden="true" />
      <div className="container hero-content">
        <motion.h1
          className="hero-title"
          aria-label={titulo}
          variants={contenedor}
          initial={reduce ? false : 'hidden'}
          animate="visible"
        >
          {palabras.map((p, i) => (
            <motion.span key={i} className="hero-word" variants={palabra} aria-hidden="true">
              {p}
            </motion.span>
          ))}
        </motion.h1>
        <motion.p
          className="hero-subtitle"
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.5 }}
        >
          Habitaciones y suites disenadas para desconectarte, en el corazon de la ciudad y con un
          servicio que se siente como en casa.
        </motion.p>
        <motion.div
          initial={reduce ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE, delay: 0.65 }}
        >
          <Link to="/habitaciones" className="btn btn-accent hero-cta">
            Reservar ahora
          </Link>
        </motion.div>
      </div>
    </section>
  );
}

function SearchWidget() {
  const navigate = useNavigate();
  const hoy = toISODate(new Date());
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [huespedes, setHuespedes] = useState('2');
  const [error, setError] = useState('');

  const handleCheckIn = (value) => {
    setCheckIn(value);
    if (checkOut && value && checkOut <= value) setCheckOut('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!checkIn) return setError('Selecciona la fecha de llegada.');
    if (checkIn < hoy) return setError('La fecha de llegada no puede ser anterior a hoy.');
    if (!checkOut) return setError('Selecciona la fecha de salida.');
    if (checkOut <= checkIn) return setError('La salida debe ser posterior a la llegada.');
    setError('');
    const params = new URLSearchParams({ checkIn, checkOut, huespedes });
    navigate(`/habitaciones?${params.toString()}`);
  };

  return (
    <section className="container search-widget" aria-label="Buscar disponibilidad">
      <form className="search-form" onSubmit={handleSubmit} noValidate>
        <div className="field">
          <label htmlFor="buscar-llegada">Llegada</label>
          <input
            id="buscar-llegada"
            type="date"
            min={hoy}
            value={checkIn}
            onChange={(e) => handleCheckIn(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="buscar-salida">Salida</label>
          <input
            id="buscar-salida"
            type="date"
            min={checkIn ? sumarDia(checkIn) : sumarDia(hoy)}
            value={checkOut}
            onChange={(e) => setCheckOut(e.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="buscar-huespedes">Huespedes</label>
          <select
            id="buscar-huespedes"
            value={huespedes}
            onChange={(e) => setHuespedes(e.target.value)}
          >
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n} {n === 1 ? 'huesped' : 'huespedes'}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary search-submit">
          <CalendarDays size={18} aria-hidden="true" />
          Buscar
        </button>
        {error && (
          <p className="field-error search-error" role="alert">
            {error}
          </p>
        )}
      </form>
    </section>
  );
}

function Destacadas() {
  const reduce = useReducedMotion();
  const destacadas = rooms.slice(0, 3);
  const grid = { visible: { transition: { staggerChildren: 0.06 } } };

  return (
    <section className="home-section container" aria-labelledby="destacadas-titulo">
      <motion.div
        className="section-head"
        variants={fadeUp(reduce)}
        initial={reduce ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <h2 id="destacadas-titulo">Habitaciones destacadas</h2>
        <p>Espacios pensados para cada tipo de viaje, del descanso express a la gran ocasion.</p>
      </motion.div>
      <motion.div
        className="home-rooms-grid"
        variants={grid}
        initial={reduce ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        {destacadas.map((room) => (
          <RoomCard key={room.id} room={room} />
        ))}
      </motion.div>
      <div className="home-rooms-more">
        <Link to="/habitaciones" className="btn btn-ghost">
          Ver todas las habitaciones
        </Link>
      </div>
    </section>
  );
}

function Servicios() {
  const reduce = useReducedMotion();
  const grid = { visible: { transition: { staggerChildren: 0.06 } } };
  const item = fadeUp(reduce);

  return (
    <section className="home-section container" aria-labelledby="servicios-titulo">
      <motion.div
        className="section-head"
        variants={item}
        initial={reduce ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <h2 id="servicios-titulo">Servicios incluidos</h2>
        <p>Todo lo que necesitas para una estadia sin preocupaciones.</p>
      </motion.div>
      <motion.ul
        className="servicios-grid"
        variants={grid}
        initial={reduce ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        {servicios.map((s) => (
          <motion.li
            key={s.nombre}
            className="servicio"
            variants={item}
            whileHover={reduce ? undefined : { y: -6 }}
          >
            <span className="servicio-icon">
              <s.icon size={24} aria-hidden="true" />
            </span>
            <h3>{s.nombre}</h3>
            <p>{s.detalle}</p>
          </motion.li>
        ))}
      </motion.ul>
    </section>
  );
}

function Testimonios() {
  const reduce = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [pausado, setPausado] = useState(false);
  const total = testimonios.length;
  const t = testimonios[index];

  useEffect(() => {
    if (pausado || reduce) return undefined;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % total), 6000);
    return () => window.clearInterval(id);
  }, [pausado, reduce, total]);

  const anterior = () => setIndex((i) => (i - 1 + total) % total);
  const siguiente = () => setIndex((i) => (i + 1) % total);

  return (
    <section
      className="testimonials"
      aria-labelledby="testimonios-titulo"
      aria-roledescription="carrusel"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocusCapture={() => setPausado(true)}
      onBlurCapture={() => setPausado(false)}
    >
      <div className="container">
        <div className="section-head">
          <h2 id="testimonios-titulo">Lo que dicen nuestros huespedes</h2>
        </div>
        <div className="testimonial-stage">
          <AnimatePresence mode="wait">
            <motion.figure
              key={index}
              className="testimonial"
              initial={reduce ? { opacity: 0 } : { opacity: 0, x: 48 }}
              animate={{ opacity: 1, x: 0 }}
              exit={
                reduce
                  ? { opacity: 0, transition: { duration: 0.15 } }
                  : { opacity: 0, x: -48, transition: { duration: 0.2 } }
              }
              transition={{ duration: 0.3, ease: EASE }}
            >
              <div
                className="testimonial-stars"
                role="img"
                aria-label={`Calificacion: ${t.estrellas} de 5 estrellas`}
              >
                {Array.from({ length: t.estrellas }, (_, i) => (
                  <Star key={i} size={18} fill="currentColor" aria-hidden="true" />
                ))}
              </div>
              <blockquote className="testimonial-text">“{t.texto}”</blockquote>
              <figcaption className="testimonial-author">
                {t.nombre} <span>· {t.ciudad}</span>
              </figcaption>
            </motion.figure>
          </AnimatePresence>
          <div className="testimonial-controls">
            <button
              type="button"
              className="testimonial-btn"
              onClick={anterior}
              aria-label="Testimonio anterior"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <div className="testimonial-dots" aria-hidden="true">
              {testimonios.map((_, i) => (
                <span key={i} className={`dot${i === index ? ' active' : ''}`} />
              ))}
            </div>
            <button
              type="button"
              className="testimonial-btn"
              onClick={siguiente}
              aria-label="Testimonio siguiente"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
          <p className="sr-only" role="status">
            Testimonio {index + 1} de {total}
          </p>
        </div>
      </div>
    </section>
  );
}

function CtaBand() {
  const reduce = useReducedMotion();
  return (
    <section className="cta-band">
      <motion.div
        className="container cta-inner"
        variants={fadeUp(reduce)}
        initial={reduce ? false : 'hidden'}
        whileInView="visible"
        viewport={{ once: true, margin: '-80px' }}
      >
        <h2>Tu proxima escapada empieza aqui</h2>
        <p>Reserva en minutos y asegura la mejor tarifa garantizada reservando directo con nosotros.</p>
        <Link to="/habitaciones" className="btn btn-accent cta-btn">
          Reservar ahora
        </Link>
      </motion.div>
    </section>
  );
}

export default function Home() {
  return (
    <PageTransition className="home">
      <Hero />
      <SearchWidget />
      <Destacadas />
      <Servicios />
      <Testimonios />
      <CtaBand />
    </PageTransition>
  );
}
