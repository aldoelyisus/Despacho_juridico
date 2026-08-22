interface Props {
  visible: boolean;
}

/** Pantalla de carga de la landing — balanza de la justicia animada, sobre fondo difuminado
 *  para que la landing se alcance a ver detrás mientras cargan los datos. */
export default function LandingLoader({ visible }: Props) {
  return (
    <div className={`landing-loader ${visible ? '' : 'landing-loader-hidden'}`} aria-hidden={!visible}>
      <svg className="landing-loader-svg" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="landing-loader-grad" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>

        {/* Base y poste — estáticos */}
        <line x1="30" y1="92" x2="70" y2="92" stroke="url(#landing-loader-grad)" strokeWidth="3" strokeLinecap="round" />
        <line x1="50" y1="92" x2="50" y2="22" stroke="url(#landing-loader-grad)" strokeWidth="3" strokeLinecap="round" />
        <circle cx="50" cy="20" r="3.2" fill="url(#landing-loader-grad)" />

        {/* Viga con los dos platillos — se balancea */}
        <g className="landing-loader-beam">
          <line x1="18" y1="20" x2="82" y2="20" stroke="url(#landing-loader-grad)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="18" y1="20" x2="18" y2="42" stroke="url(#landing-loader-grad)" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M7,42 Q18,56 29,42" stroke="url(#landing-loader-grad)" strokeWidth="1.75" fill="none" strokeLinecap="round" />
          <line x1="82" y1="20" x2="82" y2="42" stroke="url(#landing-loader-grad)" strokeWidth="1.75" strokeLinecap="round" />
          <path d="M71,42 Q82,56 93,42" stroke="url(#landing-loader-grad)" strokeWidth="1.75" fill="none" strokeLinecap="round" />
        </g>
      </svg>
      <span className="landing-loader-label">Cargando…</span>
    </div>
  );
}
