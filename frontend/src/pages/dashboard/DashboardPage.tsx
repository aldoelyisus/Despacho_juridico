import { useQuery } from '@tanstack/react-query';
import {
  Users, FolderOpen, CreditCard, TrendingUp,
  CheckCircle, Clock, AlertCircle, Award
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { dashboardApi } from '../../api/dashboard.api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import './DashboardPage.css';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const ESTADO_LABELS: Record<string, string> = {
  activo: 'Activo',
  en_proceso: 'En proceso',
  cerrado: 'Cerrado',
  ganado: 'Ganado',
  perdido: 'Perdido',
  suspendido: 'Suspendido',
};

function StatCard({ title, value, icon: Icon, color, change, suffix = '' }: any) {
  return (
    <div className="stat-card" style={{ '--gradient': color } as any}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="stat-label">{title}</div>
          <div className="stat-value">{typeof value === 'number' ? value.toLocaleString('es-MX') : value}{suffix}</div>
          {change !== undefined && (
            <span className={`stat-change ${change >= 0 ? 'positive' : 'negative'}`}>
              {change >= 0 ? '+' : ''}{change}% vs mes anterior
            </span>
          )}
        </div>
        <div className="stat-icon" style={{ background: `${color}22`, color }}>
          <Icon size={22} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: kpis, isLoading } = useQuery({
    queryKey: ['dashboard-kpis'],
    queryFn: dashboardApi.kpis,
  });

  const { data: ingresosHistorico } = useQuery({
    queryKey: ['ingresos-historico'],
    queryFn: () => dashboardApi.ingresosHistorico(6),
  });

  const { data: rendimiento } = useQuery({
    queryKey: ['rendimiento-usuarios'],
    queryFn: dashboardApi.rendimientoUsuarios,
  });

  const expedientesPieData = kpis?.expedientes?.byStatus?.map((s: any) => ({
    name: ESTADO_LABELS[s.estado] || s.estado,
    value: +s.total,
  })) || [];

  if (isLoading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner spinner-lg" />
        <p>Cargando indicadores...</p>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            {format(new Date(), "EEEE, d 'de' MMMM 'de' yyyy", { locale: es })}
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="dashboard-grid-4">
        <StatCard
          title="Expedientes Activos"
          value={kpis?.expedientes?.byStatus?.find((s: any) => s.estado === 'activo')?.total || 0}
          icon={FolderOpen}
          color="#6366f1"
        />
        <StatCard
          title="Total Clientes"
          value={kpis?.clientes?.total || 0}
          icon={Users}
          color="#10b981"
        />
        <StatCard
          title="Ingresos del Mes"
          value={`$${Number(kpis?.financiero?.ingresosMes || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
          icon={CreditCard}
          color="#f59e0b"
        />
        <StatCard
          title="Tasa de Éxito"
          value={kpis?.expedientes?.tasaExito || 0}
          suffix="%"
          icon={Award}
          color="#8b5cf6"
        />
      </div>

      {/* Charts Row 1 */}
      <div className="dashboard-grid-2">
        {/* Ingresos histórico */}
        <div className="card">
          <h3 className="chart-title">Ingresos Últimos 6 Meses</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={ingresosHistorico || []}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
              <XAxis dataKey="mes" stroke="#5a6a8e" tick={{ fontSize: 12 }} />
              <YAxis stroke="#5a6a8e" tick={{ fontSize: 12 }}
                tickFormatter={(v) => `$${v.toLocaleString()}`} />
              <Tooltip
                contentStyle={{ background: '#141f38', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }}
                labelStyle={{ color: '#f0f4ff' }}
                formatter={(v: any) => [`$${Number(v).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`, 'Ingresos']}
              />
              <Line type="monotone" dataKey="total" stroke="#6366f1" strokeWidth={2}
                dot={{ fill: '#6366f1', r: 4 }} activeDot={{ r: 6 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Expedientes por estado (pie) */}
        <div className="card">
          <h3 className="chart-title">Expedientes por Estado</h3>
          {expedientesPieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={expedientesPieData}
                  cx="50%" cy="50%"
                  innerRadius={60} outerRadius={90}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {expedientesPieData.map((_: any, index: number) => (
                    <Cell key={index} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#141f38', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }}
                  labelStyle={{ color: '#f0f4ff' }}
                />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(v) => <span style={{ color: '#94a3c4', fontSize: '0.8rem' }}>{v}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="empty-state">
              <FolderOpen size={32} style={{ opacity: 0.3 }} />
              <p>Sin expedientes aún</p>
            </div>
          )}
        </div>
      </div>

      {/* Rendimiento por abogado */}
      {rendimiento && rendimiento.length > 0 && (
        <div className="card">
          <h3 className="chart-title">Rendimiento por Abogado</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={rendimiento}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(99,102,241,0.1)" />
              <XAxis dataKey="nombre" stroke="#5a6a8e" tick={{ fontSize: 12 }} />
              <YAxis stroke="#5a6a8e" tick={{ fontSize: 12 }} />
              <Tooltip
                contentStyle={{ background: '#141f38', border: '1px solid rgba(99,102,241,0.2)', borderRadius: 10 }}
                labelStyle={{ color: '#f0f4ff' }}
              />
              <Legend
                formatter={(v) => <span style={{ color: '#94a3c4', fontSize: '0.8rem' }}>{v}</span>}
              />
              <Bar dataKey="totalExpedientes" name="Total" fill="#6366f1" radius={[4, 4, 0, 0]} />
              <Bar dataKey="ganados" name="Ganados" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="perdidos" name="Perdidos" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Bottom row */}
      <div className="dashboard-grid-2">
        {/* Próximos eventos */}
        <div className="card">
          <h3 className="chart-title">Próximos Eventos (7 días)</h3>
          {kpis?.agenda?.proximosEventos?.length ? (
            <div className="events-list">
              {kpis.agenda.proximosEventos.map((ev: any) => (
                <div key={ev.id} className="event-item">
                  <div className="event-dot" style={{ background: ev.color || '#6366f1' }} />
                  <div className="event-info">
                    <div className="event-title">{ev.titulo}</div>
                    <div className="event-date">
                      {format(new Date(ev.fechaInicio), 'dd MMM, HH:mm', { locale: es })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--sp-8) 0' }}>
              <Clock size={24} style={{ opacity: 0.3 }} />
              <p>Sin eventos próximos</p>
            </div>
          )}
        </div>

        {/* Actividad reciente */}
        <div className="card">
          <h3 className="chart-title">Actividad Reciente</h3>
          {kpis?.actividadReciente?.length ? (
            <div className="activity-list">
              {kpis.actividadReciente.slice(0, 6).map((log: any) => (
                <div key={log.id} className="activity-item">
                  <div className="activity-icon">
                    {log.accion === 'CREAR' && <CheckCircle size={14} color="#10b981" />}
                    {log.accion === 'ACTUALIZAR' && <Clock size={14} color="#f59e0b" />}
                    {log.accion === 'ELIMINAR' && <AlertCircle size={14} color="#ef4444" />}
                    {!['CREAR', 'ACTUALIZAR', 'ELIMINAR'].includes(log.accion) && <TrendingUp size={14} color="#6366f1" />}
                  </div>
                  <div className="activity-info">
                    <div className="activity-desc">
                      <strong>{log.usuarioNombre}</strong> — {log.accion} en {log.modulo}
                    </div>
                    <div className="activity-time">
                      {format(new Date(log.createdAt), 'dd/MM HH:mm', { locale: es })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state" style={{ padding: 'var(--sp-8) 0' }}>
              <TrendingUp size={24} style={{ opacity: 0.3 }} />
              <p>Sin actividad registrada</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
