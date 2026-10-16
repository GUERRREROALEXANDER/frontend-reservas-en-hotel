import { Link } from 'react-router-dom';
import { MapPin, Phone, Mail } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container footer-grid">
        <div className="footer-col">
          <p className="footer-brand">Hotel Aurora</p>
          <p className="footer-text">
            Un refugio de calma y elegancia en el corazon de la ciudad. Habitaciones disenadas para
            el descanso, servicio de primer nivel y experiencias que vale la pena repetir.
          </p>
        </div>

        <nav className="footer-col" aria-label="Enlaces del sitio">
          <p className="footer-heading">Enlaces</p>
          <ul className="footer-links">
            <li>
              <Link to="/">Inicio</Link>
            </li>
            <li>
              <Link to="/habitaciones">Habitaciones</Link>
            </li>
            <li>
              <Link to="/mis-reservas">Mis reservas</Link>
            </li>
            <li>
              <Link to="/login">Iniciar sesion</Link>
            </li>
            <li>
              <Link to="/registro">Registrarse</Link>
            </li>
          </ul>
        </nav>

        <div className="footer-col">
          <p className="footer-heading">Contacto</p>
          <ul className="footer-contact">
            <li>
              <MapPin size={18} aria-hidden="true" />
              <span>Cra 7 # 32-16, Bogota, Colombia</span>
            </li>
            <li>
              <Phone size={18} aria-hidden="true" />
              <a href="tel:+576017430000">+57 (601) 743 0000</a>
            </li>
            <li>
              <Mail size={18} aria-hidden="true" />
              <a href="mailto:reservas@hotelaurora.co">reservas@hotelaurora.co</a>
            </li>
          </ul>
        </div>
      </div>

      <div className="container footer-bottom">
        <p>© {year} Hotel Aurora. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
