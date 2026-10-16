import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CalendarCheck,
  CircleAlert,
  Eye,
  EyeOff,
  Loader2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/PageTransition';
import './Auth.css';

const EASE = [0.22, 1, 0.36, 1];

const BENEFITS = [
  { icon: CalendarCheck, text: 'Gestiona tus reservas en un solo lugar' },
  { icon: ShieldCheck, text: 'Tus datos siempre protegidos' },
  { icon: Sparkles, text: 'Experiencias pensadas para ti' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(value) {
  if (!value.trim()) return 'Ingresa tu correo electronico';
  if (!EMAIL_RE.test(value.trim())) return 'Ingresa un correo valido, por ejemplo nombre@correo.com';
  return '';
}

function validatePassword(value) {
  if (!value) return 'Ingresa tu contrasena';
  return '';
}

function resolveFrom(state) {
  const from = state?.from;
  if (typeof from === 'string') return from;
  if (from?.pathname) return from.pathname;
  return '/';
}

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const reduce = useReducedMotion();

  const [values, setValues] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [serverError, setServerError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);

  if (isAuthenticated) {
    return <Navigate to={resolveFrom(location.state)} replace />;
  }

  const list = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };

  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  };

  const handleChange = (name) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleBlur = (name) => () => {
    const validator = name === 'email' ? validateEmail : validatePassword;
    setErrors((prev) => ({ ...prev, [name]: validator(values[name]) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const next = {
      email: validateEmail(values.email),
      password: validatePassword(values.password),
    };
    setErrors(next);
    if (next.email || next.password) {
      document.getElementById(next.email ? 'login-email' : 'login-password')?.focus();
      return;
    }
    setLoading(true);
    try {
      await login({ email: values.email, password: values.password });
      navigate(resolveFrom(location.state), { replace: true });
    } catch (err) {
      setServerError(err.message);
      setShakeKey((key) => key + 1);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageTransition className="auth">
      <motion.aside
        className="auth__aside"
        variants={list}
        initial={reduce ? false : 'hidden'}
        animate="show"
      >
        <div className="auth__aside-content">
          <motion.p className="auth__brand" variants={item}>
            Hotel Aurora
          </motion.p>
          <motion.p className="auth__tagline" variants={item}>
            Tu refugio de calma y elegancia. Inicia sesion para continuar con tu reserva.
          </motion.p>
          <ul className="auth__benefits">
            {BENEFITS.map(({ icon: Icon, text }) => (
              <motion.li className="auth__benefit" key={text} variants={item}>
                <span className="auth__benefit-icon" aria-hidden="true">
                  <Icon size={22} />
                </span>
                <span>{text}</span>
              </motion.li>
            ))}
          </ul>
        </div>
      </motion.aside>

      <div className="auth__panel">
        <motion.div
          className="auth__card"
          initial={reduce ? false : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: EASE }}
        >
          <h1 className="auth__title">Iniciar sesion</h1>
          <p className="auth__subtitle">Accede a tu cuenta para gestionar tus reservas.</p>

          {serverError && (
            <motion.div
              key={shakeKey}
              className="auth__alert"
              aria-live="polite"
              initial={reduce ? false : { opacity: 0, y: -8 }}
              animate={
                reduce
                  ? { opacity: 1 }
                  : { opacity: 1, y: 0, x: [0, -9, 9, -6, 6, -2, 0] }
              }
              transition={{ duration: 0.4, ease: EASE }}
            >
              <CircleAlert size={20} aria-hidden="true" />
              <span>{serverError}</span>
            </motion.div>
          )}

          <motion.form
            onSubmit={handleSubmit}
            noValidate
            variants={list}
            initial={reduce ? false : 'hidden'}
            animate="show"
          >
            <motion.div className="field" variants={item}>
              <label htmlFor="login-email">
                Correo electronico{' '}
                <span className="auth__req" aria-hidden="true">
                  *
                </span>
              </label>
              <input
                id="login-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={values.email}
                onChange={handleChange('email')}
                onBlur={handleBlur('email')}
                aria-invalid={Boolean(errors.email)}
                aria-describedby={errors.email ? 'login-email-error' : undefined}
              />
              {errors.email && (
                <p className="field-error" id="login-email-error">
                  {errors.email}
                </p>
              )}
            </motion.div>

            <motion.div className="field" variants={item}>
              <label htmlFor="login-password">
                Contrasena{' '}
                <span className="auth__req" aria-hidden="true">
                  *
                </span>
              </label>
              <div className="auth__password">
                <input
                  id="login-password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={values.password}
                  onChange={handleChange('password')}
                  onBlur={handleBlur('password')}
                  aria-invalid={Boolean(errors.password)}
                  aria-describedby={errors.password ? 'login-password-error' : undefined}
                />
                <button
                  type="button"
                  className="auth__toggle"
                  onClick={() => setShowPassword((show) => !show)}
                  aria-label={showPassword ? 'Ocultar contrasena' : 'Mostrar contrasena'}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff size={20} aria-hidden="true" />
                  ) : (
                    <Eye size={20} aria-hidden="true" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="field-error" id="login-password-error">
                  {errors.password}
                </p>
              )}
            </motion.div>

            <motion.label className="auth__check" variants={item}>
              <input
                type="checkbox"
                checked={remember}
                onChange={(event) => setRemember(event.target.checked)}
              />
              <span>Recordarme en este dispositivo</span>
            </motion.label>

            <motion.div variants={item}>
              <button type="submit" className="btn btn-primary auth__submit" disabled={loading}>
                {loading && <Loader2 size={20} className="auth__spin" aria-hidden="true" />}
                {loading ? 'Ingresando...' : 'Iniciar sesion'}
              </button>
            </motion.div>
          </motion.form>

          <p className="auth__switch">
            ¿No tienes cuenta? <Link to="/registro">Crea una aqui</Link>
          </p>
        </motion.div>
      </div>
    </PageTransition>
  );
}
