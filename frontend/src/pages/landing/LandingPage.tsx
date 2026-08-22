import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Scale, FolderOpen, CreditCard, Calendar, Building2, ShieldCheck, MessageCircle } from 'lucide-react';
import { landingApi } from '../../api/landing.api';
import PreciosSection from './PreciosSection';
import TestimoniosSection from './TestimoniosSection';
import ContactoSection from './ContactoSection';
import LandingLoader from './LandingLoader';
import './LandingPage.css';

const WHATSAPP_NUMERO = '526182466273';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent('Hola, me interesa el sistema para despachos jurídicos.')}`;

const BENEFICIOS = [
  { icon: FolderOpen, titulo: 'Expedientes bajo control', texto: 'Da seguimiento a cada caso, documento y evento desde un solo lugar, sin hojas de cálculo ni carpetas sueltas.' },
  { icon: CreditCard, titulo: 'Cobros sin confusiones', texto: 'Registra cobros y abonos, imprime recibos y ten claro quién debe qué, en tiempo real.' },
  { icon: Calendar, titulo: 'Agenda compartida', texto: 'Audiencias, vencimientos y citas visibles para todo tu equipo, sin depender de recordatorios sueltos.' },
  { icon: Building2, titulo: 'Pensado para despachos', texto: 'Multiusuario con roles y permisos: cada abogado ve lo que le corresponde, tú ves todo el despacho.' },
];

export default function LandingPage() {
  // Comparten queryKey con PreciosSection/TestimoniosSection — React Query dedupe, sin peticiones extra.
  const { isLoading: loadingPlanes } = useQuery({ queryKey: ['landing-planes'], queryFn: landingApi.planes });
  const { isLoading: loadingTestimonios } = useQuery({ queryKey: ['landing-testimonios'], queryFn: landingApi.testimonios });

  // Tiempo mínimo de exhibición para que la animación no "parpadee" en conexiones rápidas.
  const [tiempoMinimoCumplido, setTiempoMinimoCumplido] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setTiempoMinimoCumplido(true), 600);
    return () => clearTimeout(t);
  }, []);

  const mostrarLoader = loadingPlanes || loadingTestimonios || !tiempoMinimoCumplido;

  return (
    <div className="landing-page">
      <LandingLoader visible={mostrarLoader} />

      {/* Nav */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">
            <Scale size={22} /> Despacho Jurídico
          </div>
          <nav className="landing-nav-links">
            <a href="#precios">Precios</a>
            <a href="#testimonios">Testimonios</a>
            <a href="#contacto">Contacto</a>
            <Link to="/login" className="landing-login-link">Iniciar sesión</Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="landing-hero">
        <div className="landing-hero-content">
          <span className="landing-eyebrow">Sistema web de gestión para despachos jurídicos</span>
          <h1>Tu despacho, organizado de principio a fin.</h1>
          <p>
            Expedientes, clientes, cobros y agenda en un solo sistema pensado para abogados —
            para que dejes de perseguir papeles y te enfoques en tus casos.
          </p>
          <div className="landing-hero-cta">
            <a href="#precios" className="btn btn-primary btn-lg">Ver planes</a>
            <a href="#contacto" className="btn btn-secondary btn-lg">Solicitar demo</a>
          </div>
        </div>
      </section>

      {/* Beneficios */}
      <section className="landing-section">
        <div className="landing-section-header">
          <h2>Todo lo que tu despacho necesita, en un solo lugar</h2>
        </div>
        <div className="landing-beneficios-grid">
          {BENEFICIOS.map((b) => (
            <div key={b.titulo} className="landing-beneficio-card">
              <div className="landing-beneficio-icon"><b.icon size={22} /></div>
              <h3>{b.titulo}</h3>
              <p>{b.texto}</p>
            </div>
          ))}
        </div>
      </section>

      <PreciosSection />
      <TestimoniosSection />
      <ContactoSection />

      {/* Footer */}
      <footer className="landing-footer">
        <div className="landing-logo"><Scale size={18} /> Despacho Jurídico</div>
        <div className="landing-footer-links">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><ShieldCheck size={14} /> Tus datos, protegidos</span>
          <Link to="/login">Iniciar sesión</Link>
        </div>
      </footer>

      {/* WhatsApp flotante */}
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="landing-whatsapp-float" data-tooltip="Escríbenos por WhatsApp">
        <MessageCircle size={26} />
      </a>
    </div>
  );
}
