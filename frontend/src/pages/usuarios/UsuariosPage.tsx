import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, UserCog, ToggleLeft, ToggleRight,
  Wand2, Eye, EyeOff, KeyRound, Download, AlertTriangle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { usuariosApi } from '../../api/usuarios.api';
import { evaluatePasswordPolicy, generateStrongPassword } from '../../utils/password';
import { downloadCsv } from '../../utils/csv';
import PasswordChecklist from '../../components/PasswordChecklist';
import ModalErrorBanner from '../../components/ModalErrorBanner';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

// ── Modal: credenciales generadas (crear / restablecer) ────────────────────
function CredencialesModal({ email, password, onClose }: { email: string; password: string; onClose: () => void }) {
  const [showPass, setShowPass] = useState(false);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3><KeyRound size={16} style={{ display: 'inline', marginRight: 6 }} />Credenciales de acceso</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{
            background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 'var(--radius-md)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)',
            display: 'flex', gap: 10, alignItems: 'flex-start',
          }}>
            <AlertTriangle size={16} style={{ color: '#f59e0b', flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              Esta contraseña es temporal y solo se muestra una vez. El usuario deberá fijar su propia
              contraseña definitiva al iniciar sesión. Envíasela de forma segura.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Email</label>
            <input className="form-input" readOnly value={email} />
          </div>
          <div className="form-group">
            <label className="form-label">Contraseña temporal</label>
            <div className="input-icon-right">
              <input className="form-input" readOnly type={showPass ? 'text' : 'password'}
                value={password} style={{ fontFamily: 'monospace' }} />
              <button type="button" className="input-toggle-pass" onClick={() => setShowPass((v) => !v)}>
                {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button
            className="btn btn-primary"
            onClick={() => downloadCsv('credenciales-usuario.csv', [{ email, password }])}
          >
            <Download size={15} /> Descargar CSV
          </button>
        </div>
      </div>
    </div>
  );
}

export default function UsuariosPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', rolId: '', telefono: '' });
  const [credenciales, setCredenciales] = useState<{ email: string; password: string } | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const { data: usuarios, isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: usuariosApi.list });
  const { data: roles } = useQuery({ queryKey: ['roles'], queryFn: usuariosApi.roles });

  const createM = useMutation({
    mutationFn: (data: any) => usuariosApi.create({ ...data, rolId: +data.rolId }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      qc.invalidateQueries({ queryKey: ['usuarios-list'] });
      setModalOpen(false);
      setCreateError(null);
      toast.success('Usuario creado');
      setCredenciales({ email: form.email, password: form.password });
    },
    onError: (e: any) => {
      const info = e.response?.data;
      if (e.response?.status === 402 && info?.requiereConfirmacion) {
        askConfirm({
          title: 'Límite de usuarios del plan',
          message: `${info.message}\n\n¿Deseas continuar y aceptar el cargo extra de $${Number(info.precioUsuarioExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })}?`,
          confirmLabel: 'Aceptar cargo extra',
          onConfirm: () => createM.mutate({ ...form, rolId: +form.rolId, confirmExtra: true }),
        });
        return;
      }
      setCreateError(info?.message || 'Error al crear usuario');
    },
  });

  const toggleM = useMutation({
    mutationFn: ({ id, confirmExtra }: { id: number; confirmExtra?: boolean }) => usuariosApi.toggle(id, confirmExtra),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      qc.invalidateQueries({ queryKey: ['usuarios-list'] });
      toast.success('Estado actualizado');
    },
    onError: (e: any, variables) => {
      const info = e.response?.data;
      if (e.response?.status === 402 && info?.requiereConfirmacion) {
        askConfirm({
          title: 'Límite de usuarios del plan',
          message: `${info.message}\n\n¿Deseas continuar y aceptar el cargo extra de $${Number(info.precioUsuarioExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })}?`,
          confirmLabel: 'Aceptar cargo extra',
          onConfirm: () => toggleM.mutate({ id: variables.id, confirmExtra: true }),
        });
        return;
      }
      toast.error(info?.message || 'Error al actualizar el estado del usuario');
    },
  });

  const resetM = useMutation({
    mutationFn: (id: number) => usuariosApi.resetPassword(id),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['usuarios'] });
      toast.success('Contraseña restablecida');
      setCredenciales({ email: data.email, password: data.password });
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al restablecer la contraseña'),
  });

  const resetForm = () => setForm({ nombre: '', apellido: '', email: '', password: '', rolId: '', telefono: '' });

  const passwordValid = evaluatePasswordPolicy(form.password);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Usuarios</h1>
          <p className="page-subtitle">{usuarios?.length || 0} usuarios en el despacho</p>
        </div>
        <button id="nuevo-usuario-btn" className="btn btn-primary" onClick={() => { resetForm(); setCreateError(null); setModalOpen(true); }}>
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
            {isLoading ? (
              <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
                <div className="spinner" />
              </td></tr>
            ) : !usuarios?.length ? (
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
                  {u.debeCambiarPassword && (
                    <div style={{ fontSize: '0.7rem', color: 'var(--warning)', marginTop: 2 }}>
                      Debe cambiar contraseña
                    </div>
                  )}
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button
                      className="btn btn-ghost btn-icon btn-icon-sm"
                      onClick={() => askConfirm({
                        title: 'Restablecer contraseña',
                        message: `¿Restablecer la contraseña de ${u.nombre} ${u.apellido}? Se generará una contraseña temporal.`,
                        confirmLabel: 'Restablecer',
                        onConfirm: () => resetM.mutate(u.id),
                      })}
                      disabled={resetM.isPending}
                      data-tooltip="Restablecer contraseña"
                    >
                      <KeyRound size={16} />
                    </button>
                    <button
                      className="btn btn-ghost btn-icon btn-icon-sm"
                      onClick={() => {
                        if (!u.activo) { toggleM.mutate({ id: u.id }); return; }
                        askConfirm({
                          title: 'Desactivar usuario',
                          message: `¿Desactivar a ${u.nombre} ${u.apellido}? Perderá acceso al sistema de inmediato.`,
                          confirmLabel: 'Desactivar',
                          danger: true,
                          onConfirm: () => toggleM.mutate({ id: u.id }),
                        });
                      }}
                      data-tooltip={u.activo ? 'Desactivar' : 'Activar'}
                    >
                      {u.activo
                        ? <ToggleRight size={18} style={{ color: 'var(--success)' }} />
                        : <ToggleLeft size={18} style={{ color: 'var(--text-muted)' }} />}
                    </button>
                  </div>
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
            <form onSubmit={(e) => { e.preventDefault(); setCreateError(null); createM.mutate(form); }}>
              <div className="modal-body">
                <ModalErrorBanner message={createError} />
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
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Contraseña temporal *</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <div className="input-icon-right" style={{ flex: 1 }}>
                        <input id="usr-password" type={showPass ? 'text' : 'password'} className="form-input" required
                          value={form.password} style={{ fontFamily: 'monospace' }}
                          onChange={(e) => setForm(f => ({ ...f, password: e.target.value }))} />
                        <button type="button" className="input-toggle-pass" onClick={() => setShowPass(v => !v)}>
                          {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      </div>
                      <button type="button" className="btn btn-secondary" style={{ whiteSpace: 'nowrap' }}
                        onClick={() => { setForm(f => ({ ...f, password: generateStrongPassword() })); setShowPass(true); }}>
                        <Wand2 size={15} /> Generar
                      </button>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      El usuario deberá fijar su propia contraseña definitiva al iniciar sesión por primera vez.
                    </p>
                    <PasswordChecklist password={form.password} />
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
                <button id="usr-submit" type="submit" className="btn btn-primary" disabled={createM.isPending || !passwordValid}>
                  {createM.isPending && <Loader2 size={16} className="spinning" />}
                  Crear Usuario
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {credenciales && (
        <CredencialesModal
          email={credenciales.email}
          password={credenciales.password}
          onClose={() => setCredenciales(null)}
        />
      )}
      {confirmDialog}
    </div>
  );
}
