import { useQuery } from '@tanstack/react-query';
import { Check, Package } from 'lucide-react';
import { landingApi } from '../../api/landing.api';

function money(v: any) {
  return `$${Number(v || 0).toLocaleString('es-MX')}`;
}

export default function PreciosSection() {
  const { data: planes, isLoading } = useQuery({ queryKey: ['landing-planes'], queryFn: landingApi.planes });

  return (
    <section id="precios" className="landing-section">
      <div className="landing-section-header">
        <h2>Elige el plan de tu despacho</h2>
        <p>Sin contratos forzosos. Cambia o cancela cuando quieras.</p>
      </div>

      {isLoading ? (
        <div className="spinner" style={{ margin: 'var(--sp-8) auto' }} />
      ) : planes?.length ? (
        <div className="landing-precios-grid">
          {planes.map((p: any) => (
            <div key={p.id} className="landing-plan-card">
              <div className="landing-plan-nombre">{p.nombre}</div>
              <div className="landing-plan-precio">
                {money(p.costoMensualidad)}<span>/mes</span>
              </div>
              <ul className="landing-plan-features">
                <li><Check size={16} /> {p.numeroUsuarios ?? 'Usuarios ilimitados'}{p.numeroUsuarios ? ' usuarios' : ''}</li>
                <li><Check size={16} /> {p.numeroExpedientes ?? 'Expedientes ilimitados'}{p.numeroExpedientes ? ' expedientes' : ''}</li>
                {p.soporte && <li><Check size={16} /> {p.soporte}</li>}
                {p.nivelDashboard && <li><Check size={16} /> {p.nivelDashboard}</li>}
              </ul>
              <a href="#contacto" className="btn btn-primary landing-plan-cta">Solicitar información</a>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <div className="empty-icon"><Package size={40} /></div>
          <h3>Precios próximamente</h3>
          <p>Contáctanos para conocer los planes disponibles</p>
        </div>
      )}
    </section>
  );
}
