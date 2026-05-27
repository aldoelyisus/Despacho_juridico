import { useQuery } from '@tanstack/react-query';
import { rootApi } from '../../api/root.api';
import {
  Building2, Users, TrendingUp, AlertTriangle,
  CheckCircle2, XCircle, Clock, DollarSign,
} from 'lucide-react';

function StatCard({ icon: Icon, label, value, color, sub }: any) {
  return (
    <div style={{
      background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)',
      border: '1px solid var(--border-default)', padding: 'var(--sp-5)',
      display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-4)',
    }}>
      <div style={{
        width: 48, height: 48, borderRadius: 'var(--radius-md)',
        background: `${color}18`, display: 'flex', alignItems: 'center',
        justifyContent: 'center', flexShrink: 0,
      }}>
        <Icon size={22} color={color} />
      </div>
      <div>
        <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{label}</div>
        {sub && <div style={{ fontSize: '0.75rem', color, marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  );
}

export default function RootDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ['root-dashboard'],
    queryFn: rootApi.dashboard,
    refetchInterval: 30000,
  });

  if (isLoading) return <div style={{ padding: 'var(--sp-8)', textAlign: 'center' }}><div className="spinner" /></div>;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard del Sistema</h1>
          <p className="page-subtitle">Vista global de todos los despachos</p>
        </div>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 'var(--sp-4)', marginBottom: 'var(--sp-6)' }}>
        <StatCard icon={Building2}     label="Despachos Totales"    value={data?.totalDespachos ?? 0}        color="#6366f1" />
        <StatCard icon={CheckCircle2}  label="Despachos Activos"    value={data?.despachosActivos ?? 0}      color="#10b981" />
        <StatCard icon={XCircle}       label="Despachos Bloqueados" value={data?.despachosBloqueados ?? 0}   color="#ef4444" />
        <StatCard icon={DollarSign}    label="Ingresos Totales"
          value={`$${Number(data?.ingresosTotales ?? 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          color="#f59e0b" />
        <StatCard icon={Clock}         label="Mensualidades Pendientes" value={data?.mensualidadesPendientes ?? 0} color="#3b82f6" />
        <StatCard icon={AlertTriangle} label="Mensualidades Vencidas"   value={data?.mensualidadesVencidas ?? 0}   color="#ef4444"
          sub={data?.mensualidadesVencidas > 0 ? '⚠ Requieren atención' : undefined} />
      </div>

      {/* Tabla por despacho */}
      <div className="card">
        <h3 style={{ marginBottom: 'var(--sp-4)' }}>Estadísticas por Despacho</h3>
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Despacho</th>
                <th>Estado</th>
                <th>Clientes</th>
                <th>Ingresos (mensualidades)</th>
              </tr>
            </thead>
            <tbody>
              {data?.statsPorDespacho?.map((d: any) => (
                <tr key={d.despachoId}>
                  <td style={{ fontWeight: 500 }}>{d.nombre}</td>
                  <td>
                    <span className={`badge ${d.bloqueado ? 'badge-danger' : 'badge-success'}`}>
                      {d.bloqueado ? '🔒 Bloqueado' : '✅ Activo'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} style={{ color: 'var(--text-muted)' }} />
                      {d.clientes}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600, color: '#10b981' }}>
                    ${Number(d.ingresosMensualidades).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              ))}
              {!data?.statsPorDespacho?.length && (
                <tr><td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sin despachos registrados</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
