import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import './Navbar.css';

const EASE = [0.22, 1, 0.36, 1];

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const reduce = useReducedMotion();

  // Transparente solo sobre el hero (home, sin scroll); glass en cualquier otro caso.
  const glass = scrolled || location.pathname !== '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Cierra el panel movil al navegar.
  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    setOpen(false);
    navigate('/');
  };

  const primerNombre = user?.nombre?.trim().split(' ')[0] ?? '';

  const links = [
    { to: '/', label: 'Inicio' },
    { to: '/habitaciones', label: 'Habitaciones' },
    ...(isAuthenticated ? [{ to: '/mis-reservas', label: 'Mis reservas' }] : []),
  ];

  return (
    <header className={`navbar${glass ? ' navbar--glass' : ''}`}>
      <div className="container navbar-inner">
        <Link to="/" className="navbar-logo">
          Hotel Aurora
        </Link>

        <nav className="navbar-links" aria-label="Navegacion principal">
          {links.map((link) => (
            <NavLink key={link.to} to={link.to} end={link.to === '/'} className="nav-link">
              {({ isActive }) => (
                <>
                  {link.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-underline"
                      className="nav-underline"
                      transition={{ duration: 0.25, ease: EASE }}
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="navbar-actions">
          {isAuthenticated ? (
            <>
              <span className="navbar-greeting">Hola, {primerNombre}</span>
              <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                <LogOut size={18} aria-hidden="true" />
                Salir
              </button>
            </>
          ) : (
            <>
              <Link to="/login" className="btn btn-ghost">
                Iniciar sesion
              </Link>
              <Link to="/registro" className="btn btn-accent">
                Registrarse
              </Link>
            </>
          )}
        </div>

        <button
          type="button"
          className="navbar-toggle"
          aria-expanded={open}
          aria-controls="navbar-panel"
          aria-label={open ? 'Cerrar menu de navegacion' : 'Abrir menu de navegacion'}
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={24} aria-hidden="true" /> : <Menu size={24} aria-hidden="true" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="navbar-panel"
            className="navbar-panel"
            aria-label="Navegacion movil"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={
              reduce
                ? { opacity: 0, transition: { duration: 0.15 } }
                : { opacity: 0, y: -12, transition: { duration: 0.15 } }
            }
            transition={{ duration: 0.25, ease: EASE }}
          >
            {links.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === '/'} className="navbar-panel-link">
                {link.label}
              </NavLink>
            ))}
            <div className="navbar-panel-actions">
              {isAuthenticated ? (
                <>
                  <span className="navbar-greeting">Hola, {primerNombre}</span>
                  <button type="button" className="btn btn-ghost" onClick={handleLogout}>
                    <LogOut size={18} aria-hidden="true" />
                    Salir
                  </button>
                </>
              ) : (
                <>
                  <Link to="/login" className="btn btn-ghost">
                    Iniciar sesion
                  </Link>
                  <Link to="/registro" className="btn btn-accent">
                    Registrarse
                  </Link>
                </>
              )}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
