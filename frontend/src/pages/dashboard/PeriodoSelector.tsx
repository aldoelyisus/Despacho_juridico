import { ChevronLeft, ChevronRight } from 'lucide-react';

export type TipoPeriodo = 'mes' | 'bimestre' | 'trimestre' | 'semestre' | 'anio';
export interface PeriodoValue { tipo: TipoPeriodo; anio: number; valor?: number }

const TIPOS: { key: TipoPeriodo; label: string }[] = [
  { key: 'mes', label: 'Mes' },
  { key: 'bimestre', label: 'Bimestre' },
  { key: 'trimestre', label: 'Trimestre' },
  { key: 'semestre', label: 'Semestre' },
  { key: 'anio', label: 'Año' },
];

const MESES_ABR = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_POR_BLOQUE: Record<Exclude<TipoPeriodo, 'anio'>, number> = { mes: 1, bimestre: 2, trimestre: 3, semestre: 6 };

function opcionesValor(tipo: TipoPeriodo): { valor: number; label: string; sub?: string }[] {
  if (tipo === 'anio') return [];
  if (tipo === 'mes') return MESES_ABR.map((m, i) => ({ valor: i + 1, label: m }));

  const bloque = MESES_POR_BLOQUE[tipo];
  const cantidad = 12 / bloque;
  const prefijo = { bimestre: 'Bim', trimestre: 'Q', semestre: 'S' }[tipo];
  return Array.from({ length: cantidad }, (_, i) => {
    const mesInicio = i * bloque;
    const sub = bloque === 1 ? undefined : `${MESES_ABR[mesInicio]}-${MESES_ABR[mesInicio + bloque - 1]}`;
    return { valor: i + 1, label: `${prefijo}${i + 1}`, sub };
  });
}

/** Bloque (1-based) del tipo dado que contiene un mes de calendario (1-12) */
function bloqueDeMes(tipo: TipoPeriodo, mes: number): number | undefined {
  if (tipo === 'anio') return undefined;
  return Math.ceil(mes / MESES_POR_BLOQUE[tipo]);
}

interface Props {
  value: PeriodoValue;
  onChange: (next: PeriodoValue) => void;
}

export default function PeriodoSelector({ value, onChange }: Props) {
  const hoy = new Date();

  const cambiarTipo = (tipo: TipoPeriodo) => {
    const anio = value.anio;
    const valorPorDefecto = anio === hoy.getFullYear() ? bloqueDeMes(tipo, hoy.getMonth() + 1) : (tipo === 'anio' ? undefined : 1);
    onChange({ tipo, anio, valor: valorPorDefecto });
  };

  const cambiarAnio = (delta: number) => {
    onChange({ ...value, anio: value.anio + delta });
  };

  const cambiarValor = (valor: number) => {
    onChange({ ...value, valor });
  };

  const opciones = opcionesValor(value.tipo);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--sp-3)' }}>
        <div className="tabs" style={{ marginBottom: 0, borderBottom: 'none' }}>
          {TIPOS.map((t) => (
            <button
              key={t.key}
              className={`tab-btn ${value.tipo === t.key ? 'active' : ''}`}
              onClick={() => cambiarTipo(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="year-stepper">
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => cambiarAnio(-1)} data-tooltip="Año anterior">
            <ChevronLeft size={16} />
          </button>
          <span className="year-stepper-value">{value.anio}</span>
          <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => cambiarAnio(1)} data-tooltip="Año siguiente">
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      {opciones.length > 0 && (
        <div className="periodo-bar">
          {opciones.map((op) => (
            <button
              key={op.valor}
              className={`periodo-pill ${value.valor === op.valor ? 'active' : ''}`}
              onClick={() => cambiarValor(op.valor)}
            >
              {op.label}
              {op.sub && <span className="periodo-pill-sub">{op.sub}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
