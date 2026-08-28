import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit, FolderOpen, UserCircle, X, AlertTriangle } from 'lucide-react';
import { expedientesApi } from '../../api/expedientes.api';
import { clientesApi } from '../../api/clientes.api';
import ExpedienteModal from './ExpedienteModal';
import Pagination from '../../components/Pagination';
import { usePuede } from '../../utils/permisos';

const ESTADO_COLORS: Record<string, string> = {
  consulta: 'badge-accent', activo: 'badge-info', ganado: 'badge-success',
  perdido: 'badge-danger', suspendido: 'badge-warning', cancelado: 'badge-muted',
};

const ESTADO_LABELS: Record<string, string> = {
  consulta: 'Consulta', activo: 'Activo', ganado: 'Ganado',
  perdido: 'Perdido', suspendido: 'Suspendido', cancelado: 'Cancelado',
};

// ── Barra sutil de uso del plan (expedientes usados / incluidos) ────────────
function LimitePlanBar({ actuales, limite }: { actuales: number; limite: number }) {
  const porcentaje = Math.min(100, Math.round((actuales / limite) * 100));
  const color = porcentaje >= 95 ? 'var(--danger)' : porcentaje >= 80 ? '#f59e0b' : 'var(--success)';
  return (
    <div style={{ marginBottom: 'var(--sp-4)' }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem',
        color: 'var(--text-muted)', marginBottom: 4,
      }}>
        <span>Expedientes de tu plan</span>
        <span>{actuales} / {limite} ({porcentaje}%)</span>
      </div>
      <div style={{ height: 6, borderRadius: 99, background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${porcentaje}%`, background: color, borderRadius: 99, transition: 'width 0.3s ease' }} />
      </div>
    </div>
  );
}

// ── Modal informativo al alcanzar el límite del plan ─────────────────────────
function LimiteAlcanzadoModal({ limite, onClose }: { limite: number; onClose: () => void }) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={18} style={{ color: 'var(--danger)' }} />
            Límite de expedientes alcanzado
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Tu despacho ya tiene {limite} expedientes registrados, el máximo incluido en tu plan actual.
            Contacta al administrador del sistema para ampliar tu plan y seguir creando expedientes.
          </p>
        </div>
        <div className="modal-footer">
          <button className="btn btn-primary" onClick={onClose}>Entendido</button>
        </div>
      </div>
    </div>
  );
}

export default function ExpedientesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const puedeCrear = usePuede('expedientes', 'crear');
  const puedeEditar = usePuede('expedientes', 'editar');
  const [busqueda, setBusqueda] = useState('');
  const [estadoFilter, setEstadoFilter] = useState('');
  const [clienteFilter, setClienteFilter] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editExp, setEditExp] = useState<any>(null);
  const [showLimiteModal, setShowLimiteModal] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['expedientes', busqueda, estadoFilter, clienteFilter, pagina],
    queryFn: () => expedientesApi.list({
      busqueda,
      estado: estadoFilter || undefined,
      clienteId: clienteFilter || undefined,
      pagina,
      limite: 20,
    }),
  });

  const { data: clientes } = useQuery({
    queryKey: ['clientes-list'],
    queryFn: () => clientesApi.list({ limite: 200 }),
  });

  const { data: stats } = useQuery({
    queryKey: ['expedientes-stats'],
    queryFn: expedientesApi.stats,
  });

  const limiteExpedientes: number | null = stats?.limiteExpedientes ?? null;
  const expedientesActuales: number = stats?.expedientesActuales ?? 0;
  const limiteAlcanzado = limiteExpedientes !== null && expedientesActuales >= limiteExpedientes;

  const handleNuevoExpediente = () => {
    if (limiteAlcanzado) { setShowLimiteModal(true); return; }
    setEditExp(null);
    setModalOpen(true);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Expedientes</h1>
          <p className="page-subtitle">{data?.total || 0} expedientes totales</p>
        </div>
        {puedeCrear && (
          <button id="nuevo-expediente-btn" className="btn btn-primary" onClick={handleNuevoExpediente}>
            <Plus size={16} /> Nuevo Expediente
          </button>
        )}
      </div>

      {limiteExpedientes !== null && (
        <LimitePlanBar actuales={expedientesActuales} limite={limiteExpedientes} />
      )}

      {/* Stats */}
      <div className="clientes-stats">
        {stats?.byStatus?.map((s: any) => (
          <div key={s.estado} className="stat-card" style={{ '--gradient': '#6366f1' } as any}>
            <div className="stat-value">{s.total}</div>
            <div className="stat-label">{ESTADO_LABELS[s.estado] || s.estado}</div>
          </div>
        ))}
        {stats?.tasaExito !== undefined && (
          <div className="stat-card" style={{ '--gradient': '#10b981' } as any}>
            <div className="stat-value">{stats.tasaExito}%</div>
            <div className="stat-label">Tasa de Éxito</div>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <div className="search-bar" style={{ flex: 1, minWidth: 200 }}>
            <Search size={16} className="search-icon" />
            <input type="text" className="form-input" placeholder="Buscar por título o número..." value={busqueda}
              onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }} />
          </div>
          {/* Filtro por cliente */}
          <select className="form-select" style={{ minWidth: 200 }} value={clienteFilter}
            onChange={(e) => { setClienteFilter(e.target.value); setPagina(1); }}>
            <option value="">Todos los clientes</option>
            {clientes?.items?.map((c: any) => (
              <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
            ))}
          </select>
          {/* Filtro por estado */}
          <select className="form-select" style={{ maxWidth: 180 }} value={estadoFilter}
            onChange={(e) => { setEstadoFilter(e.target.value); setPagina(1); }}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          {/* Limpiar filtros */}
          {(clienteFilter || estadoFilter || busqueda) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setClienteFilter(''); setEstadoFilter(''); setBusqueda(''); setPagina(1); }}>
              <UserCircle size={14} /> Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Título</th>
              <th>Clientes</th>
              <th>Abogados</th>
              <th>Estado</th>
              <th>Fecha</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}><div className="spinner" /></td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <FolderOpen size={40} style={{ opacity: 0.3 }} />
                  <h3>No hay expedientes</h3>
                  <p>Crea el primer expediente del despacho</p>
                  {puedeCrear && (
                    <button className="btn btn-primary" onClick={handleNuevoExpediente}><Plus size={16} /> Nuevo Expediente</button>
                  )}
                </div>
              </td></tr>
            ) : data?.items?.map((e: any) => (
              <tr key={e.id}>
                <td><code style={{ fontSize: '0.8rem', color: 'var(--accent-400)' }}>{e.numero}</code></td>
                <td>
                  <div style={{ maxWidth: 260, fontWeight: 500 }}>{e.titulo}</div>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {e.clientes?.map((c: any) => `${c.nombre} ${c.apellido}`).join(', ') || '—'}
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  {e.colaboradores?.map((u: any) => u.nombre).join(', ') || '—'}
                </td>
                <td><span className={`badge ${ESTADO_COLORS[e.estado] || 'badge-muted'}`}>{ESTADO_LABELS[e.estado] || e.estado}</span></td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {e.fechaInicio ? new Date(e.fechaInicio).toLocaleDateString('es-MX') : '—'}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => navigate(`/expedientes/${e.id}`)} data-tooltip="Ver detalle"><Eye size={14} /></button>
                    {puedeEditar && (
                      <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => { setEditExp(e); setModalOpen(true); }} data-tooltip="Editar"><Edit size={14} /></button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination
          pagina={pagina}
          totalPaginas={data.totalPaginas}
          total={data.total}
          limite={data.limite}
          onChange={setPagina}
        />
      )}

      {modalOpen && (
        <ExpedienteModal
          expediente={editExp}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            qc.invalidateQueries({ queryKey: ['expedientes'] });
            qc.invalidateQueries({ queryKey: ['expedientes-stats'] });
            qc.invalidateQueries({ queryKey: ['expedientes-cliente'] });
          }}
        />
      )}

      {showLimiteModal && limiteExpedientes !== null && (
        <LimiteAlcanzadoModal limite={limiteExpedientes} onClose={() => setShowLimiteModal(false)} />
      )}
    </div>
  );
}
