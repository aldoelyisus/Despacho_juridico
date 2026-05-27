import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, UserCog, ToggleLeft, ToggleRight } from 'lucide-react';
import toast from 'react-hot-toast';
import { usuariosApi } from '../../api/usuarios.api';

export default function UsuariosPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', rolId: '', telefono: '' });

  const { data: usuarios } = useQuery({ queryKey: ['usuarios'], queryFn: usuariosApi.list });
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: usuariosApi.roles });

  const createM = useMutation({
    mutationFn: (data: any) => usuariosApi.create({ ...data, rolId: +data.rolId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); setModalOpen(false); toast.success('Usuario creado'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al crear usuario'),
  });

  const toggleM = useMutation({
    mutationFn: (id: number) => usuariosApi.toggle(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['usuarios'] }); toast.success('Estado actualizado'); },
  });

  const resetForm = () => setForm({ nombre: '', apellido: '', email: '', password: '', rolId: '', telefono: '' });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">{usuarios?.length || 0} usuarios en el despacho</p>
        </div>
        <button id="nuevo-usuario-btn" className="btn btn-primary" onClick={() => { resetForm(); setModalOpen(true); }}>
          <Plus size={16} /> Nuevo Usuario
        </button>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Usuario</th>
              <th>Email</th>
              <th>Rol</th>
              <th>Último Acceso</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {!usuarios?.length ? (
              <tr><td colSpan={6}>
                <div className="empty-state">
                  <UserCog size={40} style={{ opacity: 0.3 }} />
                  <h3>Sin usuarios</h3>
                  <p>Agrega usuarios para que colaboren en el despacho</p>
                  <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Nuevo Usuario</button>
                </div>
              </td></tr>
            ) : usuarios?.map((u: any) => (
              <tr key={u.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <div className="avatar avatar-sm">{u.nombre[0]}{u.apellido[0]}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{u.nombre} {u.apellido}</div>
                      {u.telefono && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{u.telefono}</div>}
                    </div>
                  </div>
                </td>
                <td style={{ fontSize: '0.875rem' }}>{u.email}</td>
                <td>
                  <span className="badge badge-accent" style={{ textTransform: 'capitalize' }}>
                    {u.rol?.nombre || '—'}
                  </span>
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {u.ultimoAcceso ? new Date(u.ultimoAcceso).toLocaleDateString('es-MX') : 'Nunca'}
                </td>
                <td>
                  <span className={`badge ${u.activo ? 'badge-success' : 'badge-muted'}`}>
                    {u.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <button
                    className="btn btn-ghost btn-icon btn-icon-sm"
                    onClick={() => toggleM.mutate(u.id)}
                    data-tooltip={u.activo ? 'Desactivar' : 'Activar'}
                  >
                    {u.activo
                      ? <ToggleRight size={18} style={{ color: 'var(--success)' }} />
                      : <ToggleLeft size={18} style={{ color: 'var(--text-muted)' }} />}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Roles info */}
      {roles && roles.length > 0 && (
        <div className="card" style={{ marginTop: 'var(--sp-4)' }}>
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Roles del Sistema</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--sp-3)' }}>
            {roles.map((r: any) => (
              <div key={r.id} style={{ padding: 'var(--sp-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontWeight: 600, textTransform: 'capitalize', marginBottom: 'var(--sp-1)' }}>{r.nombre}</div>
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{r.descripcion}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create Modal */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setModalOpen(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Nuevo Usuario</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setModalOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createM.mutate(form); }}>
              <div className="modal-body">
                <div className="form-grid-2">
                  <div className="form-group">
                    <label className="form-label">Nombre *</label>
                    <input id="usr-nombre" type="text" className="form-input" required value={form.nombre}
                      onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Apellido *</label>
                    <input id="usr-apellido" type="text" className="form-input" required value={form.apellido}
                      onChange={(e) => setForm(f => ({ ...f, apellido: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Email *</label>
                    <input id="usr-email" type="email" className="form-input" required value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contraseña *</label>
                    <input id="usr-password" type="password" className="form-input" required minLength={6} value={form.password}
                      onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Rol *</label>
                    <select id="usr-rol" className="form-select" required value={form.rolId}
                      onChange={(e) => setForm(f => ({ ...f, rolId: e.target.value }))}>
                      <option value="">Seleccionar rol...</option>
                      {roles?.map((r: any) => (
                        <option key={r.id} value={r.id}>
                          {r.nombre.charAt(0).toUpperCase() + r.nombre.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Teléfono</label>
                    <input id="usr-telefono" type="tel" className="form-input" value={form.telefono}
                      onChange={(e) => setForm(f => ({ ...f, telefono: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button id="usr-submit" type="submit" className="btn btn-primary" disabled={createM.isPending}>
                  {createM.isPending && <Loader2 size={16} className="spinning" />}
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
