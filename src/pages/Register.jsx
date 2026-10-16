import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import {
  CalendarCheck,
  Check,
  CircleAlert,
  Eye,
  EyeOff,
  Gift,
  Loader2,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageTransition from '../components/PageTransition';
import './Auth.css';

const EASE = [0.22, 1, 0.36, 1];

const BENEFITS = [
  { icon: Gift, text: 'Ofertas exclusivas para miembros' },
  { icon: CalendarCheck, text: 'Reserva en menos de un minuto' },
  { icon: ShieldCheck, text: 'Cancelacion flexible sin cargos' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[\d\s()-]{7,15}$/;

const STRENGTH_LABELS = ['', 'Debil', 'Regular', 'Buena', 'Fuerte'];

const FIELD_IDS = {
  nombre: 'reg-nombre',
  email: 'reg-email',
  telefono: 'reg-telefono',
  password: 'reg-password',
  confirm: 'reg-confirm',
  terminos: 'reg-terminos',
};

function countLetters(value) {
  return (value.match(/\p{L}/gu) || []).length;
}

function validateNombre(value) {
  if (countLetters(value.trim()) < 3) return 'Ingresa tu nombre completo (minimo 3 letras)';
  return '';
}

function validateEmail(value) {
  if (!value.trim()) return 'Ingresa tu correo electronico';
  if (!EMAIL_RE.test(value.trim())) return 'Ingresa un correo valido, por ejemplo nombre@correo.com';
  return '';
}

function validateTelefono(value) {
  if (!value.trim()) return '';
  if (!PHONE_RE.test(value.trim())) return 'Ingresa un telefono valido (numeros, espacios y + opcional)';
  return '';
}

function validatePassword(value) {
  if (!value) return 'Ingresa una contrasena';
  if (value.length < 8) return 'Usa al menos 8 caracteres';
  if (!/[A-Z]/.test(value)) return 'Incluye al menos una letra mayuscula';
  if (!/\d/.test(value)) return 'Incluye al menos un numero';
  return '';
}

function validateConfirm(password, confirm) {
  if (!confirm) return 'Confirma tu contrasena';
  if (confirm !== password) return 'Las contrasenas no coinciden';
  return '';
}

function validateTerminos(checked) {
  return checked ? '' : 'Debes aceptar los terminos y condiciones';
}

function passwordStrength(value) {
  if (!value) return 0;
  let score = 0;
  if (value.length >= 8) score += 1;
  if (value.length >= 12) score += 1;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score += 1;
  if (/\d/.test(value)) score += 1;
  if (/[^A-Za-z0-9]/.test(value)) score += 1;
  if (score <= 1) return 1;
  if (score === 2) return 2;
  if (score === 3) return 3;
  return 4;
}

export default function Register() {
  const { isAuthenticated, register } = useAuth();
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const timerRef = useRef(null);

  const [values, setValues] = useState({
    nombre: '',
    email: '',
    telefono: '',
    password: '',
    confirm: '',
  });
  const [errors, setErrors] = useState({});
  const [terminos, setTerminos] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [shakeKey, setShakeKey] = useState(0);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  // loading cubre el instante entre que el contexto guarda la sesion y se marca el exito
  if (isAuthenticated && !success && !loading) {
    return <Navigate to="/" replace />;
  }

  const list = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06 } },
  };

  const item = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
  };

  const validateField = (name, nextValues = values, nextTerminos = terminos) => {
    switch (name) {
      case 'nombre':
        return validateNombre(nextValues.nombre);
      case 'email':
        return validateEmail(nextValues.email);
      case 'telefono':
        return validateTelefono(nextValues.telefono);
      case 'password':
        return validatePassword(nextValues.password);
      case 'confirm':
        return validateConfirm(nextValues.password, nextValues.confirm);
      case 'terminos':
        return validateTerminos(nextTerminos);
      default:
        return '';
    }
  };

  const handleChange = (name) => (event) => {
    const { value } = event.target;
    setValues((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }));
    if (name === 'password' && errors.confirm) setErrors((prev) => ({ ...prev, confirm: '' }));
  };

  const handleBlur = (name) => () => {
    setErrors((prev) => ({ ...prev, [name]: validateField(name) }));
  };

  const handleTerminos = (event) => {
    const { checked } = event.target;
    setTerminos(checked);
    if (errors.terminos && checked) setErrors((prev) => ({ ...prev, terminos: '' }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError('');
    const next = {
      nombre: validateNombre(values.nombre),
      email: validateEmail(values.email),
      telefono: validateTelefono(values.telefono),
      password: validatePassword(values.password),
      confirm: validateConfirm(values.password, values.confirm),
      terminos: validateTerminos(terminos),
    };
    setErrors(next);
    const firstInvalid = Object.keys(FIELD_IDS).find((name) => next[name]);
    if (firstInvalid) {
      document.getElementById(FIELD_IDS[firstInvalid])?.focus();
      return;
    }
    setLoading(true);
    try {
      await register({
        nombre: values.nombre,
        email: values.email,
        telefono: values.telefono,
        password: values.password,
      });
      setSuccess(true);
      timerRef.current = setTimeout(() => navigate('/', { replace: true }), 900);
    } catch (err) {
      setServerError(err.message);
      setShakeKey((key) => key + 1);
    } finally {
      setLoading(false);
    }
  };

  const strength = passwordStrength(values.password);
  const passwordDescribedBy = [
    'reg-password-hint',
    errors.password ? 'reg-password-error' : '',
  ]
    .filter(Boolean)
    .join(' ');

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
            Crea tu cuenta y empieza a planear tu proxima estancia con nosotros.
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
          <h1 className="auth__title">Crear cuenta</h1>
          <p className="auth__subtitle">Registrate para reservar y gestionar tus estancias.</p>

          {success ? (
            <motion.div
              className="auth__success"
              role="status"
              initial={reduce ? false : { opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <span className="auth__success-icon">
                <Check size={36} aria-hidden="true" />
              </span>
              <p className="auth__success-title">Cuenta creada con exito</p>
              <p className="auth__subtitle">Preparando tu bienvenida...</p>
            </motion.div>
          ) : (
            <>
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
                  <label htmlFor="reg-nombre">
                    Nombre completo{' '}
                    <span className="auth__req" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="reg-nombre"
                    name="nombre"
                    type="text"
                    autoComplete="name"
                    required
                    value={values.nombre}
                    onChange={handleChange('nombre')}
                    onBlur={handleBlur('nombre')}
                    aria-invalid={Boolean(errors.nombre)}
                    aria-describedby={errors.nombre ? 'reg-nombre-error' : undefined}
                  />
                  {errors.nombre && (
                    <p className="field-error" id="reg-nombre-error">
                      {errors.nombre}
                    </p>
                  )}
                </motion.div>

                <motion.div className="field" variants={item}>
                  <label htmlFor="reg-email">
                    Correo electronico{' '}
                    <span className="auth__req" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="reg-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={values.email}
                    onChange={handleChange('email')}
                    onBlur={handleBlur('email')}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'reg-email-error' : undefined}
                  />
                  {errors.email && (
                    <p className="field-error" id="reg-email-error">
                      {errors.email}
                    </p>
                  )}
                </motion.div>

                <motion.div className="field" variants={item}>
                  <label htmlFor="reg-telefono">Telefono (opcional)</label>
                  <input
                    id="reg-telefono"
                    name="telefono"
                    type="tel"
                    autoComplete="tel"
                    value={values.telefono}
                    onChange={handleChange('telefono')}
                    onBlur={handleBlur('telefono')}
                    aria-invalid={Boolean(errors.telefono)}
                    aria-describedby={errors.telefono ? 'reg-telefono-error' : undefined}
                  />
                  {errors.telefono && (
                    <p className="field-error" id="reg-telefono-error">
                      {errors.telefono}
                    </p>
                  )}
                </motion.div>

                <motion.div className="field" variants={item}>
                  <label htmlFor="reg-password">
                    Contrasena{' '}
                    <span className="auth__req" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <div className="auth__password">
                    <input
                      id="reg-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      required
                      value={values.password}
                      onChange={handleChange('password')}
                      onBlur={handleBlur('password')}
                      aria-invalid={Boolean(errors.password)}
                      aria-describedby={passwordDescribedBy}
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
                  <p className="auth__hint" id="reg-password-hint">
                    Minimo 8 caracteres, una mayuscula y un numero.
                  </p>
                  {values.password && (
                    <div className="auth__meter">
                      <div
                        className="auth__meter-track"
                        role="meter"
                        aria-valuemin={0}
                        aria-valuemax={4}
                        aria-valuenow={strength}
                        aria-valuetext={`Fuerza de la contrasena: ${STRENGTH_LABELS[strength]}`}
                      >
                        <motion.div
                          className={`auth__meter-fill auth__meter-fill--${strength}`}
                          initial={false}
                          animate={{ scaleX: strength / 4 }}
                          transition={{ duration: 0.3, ease: EASE }}
                        />
                      </div>
                      <p className="auth__meter-label" aria-live="polite">
                        Fuerza: <strong>{STRENGTH_LABELS[strength]}</strong>
                      </p>
                    </div>
                  )}
                  {errors.password && (
                    <p className="field-error" id="reg-password-error">
                      {errors.password}
                    </p>
                  )}
                </motion.div>

                <motion.div className="field" variants={item}>
                  <label htmlFor="reg-confirm">
                    Confirmar contrasena{' '}
                    <span className="auth__req" aria-hidden="true">
                      *
                    </span>
                  </label>
                  <input
                    id="reg-confirm"
                    name="confirm"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={values.confirm}
                    onChange={handleChange('confirm')}
                    onBlur={handleBlur('confirm')}
                    aria-invalid={Boolean(errors.confirm)}
                    aria-describedby={errors.confirm ? 'reg-confirm-error' : undefined}
                  />
                  {errors.confirm && (
                    <p className="field-error" id="reg-confirm-error">
                      {errors.confirm}
                    </p>
                  )}
                </motion.div>

                <motion.div className="field" variants={item}>
                  <div className="auth__check">
                    <input
                      id="reg-terminos"
                      type="checkbox"
                      checked={terminos}
                      onChange={handleTerminos}
                      aria-invalid={Boolean(errors.terminos)}
                      aria-describedby={errors.terminos ? 'reg-terminos-error' : undefined}
                    />
                    <label htmlFor="reg-terminos">
                      Acepto los terminos y condiciones{' '}
                      <span className="auth__req" aria-hidden="true">
                        *
                      </span>
                    </label>
                  </div>
                  {errors.terminos && (
                    <p className="field-error" id="reg-terminos-error">
                      {errors.terminos}
                    </p>
                  )}
                </motion.div>

                <motion.div variants={item}>
                  <button type="submit" className="btn btn-primary auth__submit" disabled={loading}>
                    {loading && <Loader2 size={20} className="auth__spin" aria-hidden="true" />}
                    {loading ? 'Creando cuenta...' : 'Crear cuenta'}
                  </button>
                </motion.div>
              </motion.form>

              <p className="auth__switch">
                ¿Ya tienes cuenta? <Link to="/login">Inicia sesion</Link>
              </p>
            </>
          )}
        </motion.div>
      </div>
    </PageTransition>
  );
}
