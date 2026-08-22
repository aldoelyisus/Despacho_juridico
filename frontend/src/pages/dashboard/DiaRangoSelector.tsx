import { CalendarRange } from 'lucide-react';

export interface DiaRangoValue { desde: string; hasta: string }

interface Props {
  value: DiaRangoValue;
  onChange: (next: DiaRangoValue) => void;
  anio: number;
  mes: number; // 1-12
}

function isoHoy() {
  return new Date().toISOString().split('T')[0];
}

export default function DiaRangoSelector({ value, onChange, anio, mes }: Props) {
  const min = `${anio}-${String(mes).padStart(2, '0')}-01`;
  const ultimoDia = new Date(anio, mes, 0).getDate();
  const max = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDia).padStart(2, '0')}`;

  const setHoy = () => {
    const hoy = isoHoy();
    onChange({ desde: hoy >= min && hoy <= max ? hoy : max, hasta: hoy >= min && hoy <= max ? hoy : max });
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', flexWrap: 'wrap' }}>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
        <CalendarRange size={14} /> Rango de días
      </span>
      <input
        type="date"
        className="form-input"
        style={{ width: 155 }}
        value={value.desde}
        min={min}
        max={value.hasta}
        onChange={(e) => onChange({ ...value, desde: e.target.value })}
      />
      <span style={{ color: 'var(--text-muted)' }}>—</span>
      <input
        type="date"
        className="form-input"
        style={{ width: 155 }}
        value={value.hasta}
        min={value.desde}
        max={max}
        onChange={(e) => onChange({ ...value, hasta: e.target.value })}
      />
      <button className="btn btn-ghost btn-sm" onClick={setHoy}>Hoy</button>
    </div>
  );
}
