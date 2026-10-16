import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { Home } from 'lucide-react';
import PageTransition from '../components/PageTransition';
import './NotFound.css';

const EASE = [0.22, 1, 0.36, 1];

export default function NotFound() {
  const reduce = useReducedMotion();
  return (
    <PageTransition className="notfound-page">
      <div className="container notfound-inner">
        <motion.p
          className="notfound-code"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
        >
          4
          <motion.span
            className="notfound-zero"
            animate={reduce ? undefined : { y: [0, -14, 0] }}
            transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}
          >
            0
          </motion.span>
          4
        </motion.p>
        <h1 className="notfound-title">Pagina no encontrada</h1>
        <p className="notfound-text">
          La pagina que buscas no existe o fue movida. Vuelve al inicio y sigue planeando tu
          proxima estadia con nosotros.
        </p>
        <Link className="btn btn-primary" to="/">
          <Home size={18} aria-hidden="true" />
          Volver al inicio
        </Link>
      </div>
    </PageTransition>
  );
}
