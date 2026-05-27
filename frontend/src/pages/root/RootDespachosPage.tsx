import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, Lock, Unlock, Users, Eye, X, Loader2,
  Building2, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { rootApi } from '../../api/root.api';

// ── Modal nuevo despacho ───────────────────────────────────────────────────
function NuevoDespachoModal({ onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    nombre: '', nombreComercial: '', email: '', telefono: '', ciudad: '', estado: '',
    planMensual: '', fechaVencimientoPago: '',
    nombreAdmin: '', apellidoAdmin: '', emailAdmin: '', passwordAdmin: '',
  });
  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }));

  const mutation = useMutation({
    mutationFn: rootApi.createDespacho,
    onSuccess: (data) => {
      toast.success(`Despacho creado. Admin: ${data.usuario.email}`);
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al crear despacho'),
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>Nuevo Despacho</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(form); }}>
          <div className="modal-body">
            <p style={{ color: 'var(--accent-400)', fontWeight: 600, marginBottom: 'var(--sp-3)', fontSize: '0.85rem' }}>
              DATOS DEL DESPACHO
            </p>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" required value={form.nombre} onChange={set('nombre')} />
              </div>
              <div className="form-group">
                <label className="form-label">Nombre Comercial</label>
                <input className="form-input" value={form.nombreComercial} onChange={set('nombreComercial')} />
              </div>
              <div className="form-group">
                <label className="form-label">Email del despacho</label>
                <input className="form-input" type="email" value={form.email} onChange={set('email')} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input className="form-input" value={form.telefono} onChange={set('telefono')} />
              </div>
              <div className="form-group">
                <label className="form-label">Plan mensual ($)</label>
                <input className="form-input" type="number" step="0.01" value={form.planMensual} onChange={set('planMensual')} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha primer vencimiento</label>
                <input className="form-input" type="date" value={form.fechaVencimientoPago} onChange={set('fechaVencimientoPago')} />
              </div>
            </div>

            <p style={{ color: 'var(--accent-400)', fontWeight: 600, margin: 'var(--sp-4) 0 var(--sp-3)', fontSize: '0.85rem' }}>
              USUARIO ADMINISTRADOR INICIAL
            </p>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" required value={form.nombreAdmin} onChange={set('nombreAdmin')} />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido *</label>
                <input className="form-input" required value={form.apellidoAdmin} onChange={set('apellidoAdmin')} />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" required value={form.emailAdmin} onChange={set('emailAdmin')} />
              </div>
              <div className="form-group">
                <label className="form-label">Contraseña *</label>
                <input className="form-input" type="password" required value={form.passwordAdmin} onChange={set('passwordAdmin')} minLength={6} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />} Crear Despacho
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Panel de usuarios del despacho ────────────────────────────────────────
function UsuariosPanel({ despachoId, onClose }: any) {
  const { data: usuarios, refetch } = useQuery({
    queryKey: ['root-usuarios', despachoId],
    queryFn: () => rootApi.usuariosDespacho(despachoId),
  });
  const toggleM = useMutation({
    mutationFn: rootApi.toggleUsuario,
    onSuccess: () => { refetch(); toast.success('Usuario actualizado'); },
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3><Users size={16} style={{ display: 'inline', marginRight: 6 }} />Usuarios del Despacho</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {usuarios?.map((u: any) => (
              <div key={u.id} style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                padding: 'var(--sp-3)', background: 'var(--bg-elevated)',
                borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{u.nombre} {u.apellido}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.email} · {u.rol?.nombre}</div>
                </div>
                <span className={`badge ${u.activo ? 'badge-success' : 'badge-muted'}`}>
                  {u.activo ? 'Activo' : 'Inactivo'}
                </span>
                <button className={`btn btn-sm ${u.activo ? 'btn-secondary' : 'btn-primary'}`}
                  onClick={() => toggleM.mutate(u.id)} disabled={toggleM.isPending}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              </div>
            ))}
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ───────────────────────────────────────────────────────
export default function RootDespachosPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [usuariosPanel, setUsuariosPanel] = useState<number | null>(null);

  const { data: despachos, isLoading } = useQuery({
    queryKey: ['root-despachos'],
    queryFn: rootApi.despachos,
  });

  const toggleBloqueoM = useMutation({
    mutationFn: rootApi.toggleBloqueo,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['root-despachos'] });
      toast.success(data.bloqueado ? '🔒 Despacho bloqueado' : '🔓 Despacho desbloqueado');
    },
    onError: () => toast.error('Error al cambiar estado'),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Gestión de Despachos</h1>
          <p className="page-subtitle">{despachos?.length ?? 0} despachos registrados</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Nuevo Despacho
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Despacho</th>
                <th>Contacto</th>
                <th>Plan Mensual</th>
                <th>Vencimiento</th>
                <th>Usuarios</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}><div className="spinner" /></td></tr>
              )}
              {despachos?.map((d: any) => (
                <tr key={d.id}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{d.nombre}</div>
                    {d.nombreComercial && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.nombreComercial}</div>}
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>
                    <div>{d.email || '—'}</div>
                    <div style={{ color: 'var(--text-muted)' }}>{d.telefono || ''}</div>
                  </td>
                  <td style={{ fontWeight: 600, color: '#10b981' }}>
                    {d.planMensual > 0
                      ? `$${Number(d.planMensual).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>
                    {d.fechaVencimientoPago
                      ? new Date(d.fechaVencimientoPago).toLocaleDateString('es-MX')
                      : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>
                    <button className="btn btn-ghost btn-sm" onClick={() => setUsuariosPanel(d.id)}
                      style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <Users size={13} /> {d.totalUsuarios}
                    </button>
                  </td>
                  <td>
                    <span className={`badge ${!d.activo ? 'badge-muted' : d.bloqueado ? 'badge-danger' : 'badge-success'}`}>
                      {!d.activo ? 'Desactivado' : d.bloqueado ? '🔒 Bloqueado' : '✅ Activo'}
                    </span>
                    {d.proximaMensualidad && (
                      <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: 2 }}>
                        Pago pendiente
                      </div>
                    )}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                      <button
                        className={`btn btn-sm ${d.bloqueado ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => toggleBloqueoM.mutate(d.id)}
                        disabled={toggleBloqueoM.isPending}
                        title={d.bloqueado ? 'Desbloquear acceso' : 'Bloquear acceso'}>
                        {d.bloqueado ? <Unlock size={13} /> : <Lock size={13} />}
                        {d.bloqueado ? ' Desbloquear' : ' Bloquear'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !despachos?.length && (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-icon"><Building2 size={40} /></div>
                    <h3>Sin despachos</h3>
                    <p>Crea el primer despacho para comenzar</p>
                    <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={16} /> Nuevo Despacho</button>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <NuevoDespachoModal
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); qc.invalidateQueries({ queryKey: ['root-despachos'] }); }}
        />
      )}
      {usuariosPanel !== null && (
        <UsuariosPanel despachoId={usuariosPanel} onClose={() => setUsuariosPanel(null)} />
      )}
    </div>
  );
}
