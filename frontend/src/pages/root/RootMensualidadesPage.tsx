import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, CheckCircle2, Clock, AlertTriangle, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { rootApi } from '../../api/root.api';

const ESTADOS = ['pendiente', 'pagado', 'vencido'];
const ESTADO_STYLE: Record<string, { class: string; icon: any; label: string }> = {
  pagado:   { class: 'badge-success', icon: CheckCircle2, label: 'Pagado' },
  pendiente: { class: 'badge-info',    icon: Clock,         label: 'Pendiente' },
  vencido:  { class: 'badge-danger',  icon: AlertTriangle, label: 'Vencido' },
};

function NuevaMensualidadModal({ despachos, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    despachoId: '', monto: '', fechaVencimiento: '',
    fechaPago: '', estado: 'pendiente', metodoPago: '', referencia: '', notas: '',
  });
  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => rootApi.createMensualidad({ ...form, despachoId: +form.despachoId, monto: +form.monto }),
    onSuccess: () => { toast.success('Mensualidad registrada'); onSuccess(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al registrar'),
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>Registrar Mensualidad</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
          <div className="modal-body">
            <div className="form-grid-2">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Despacho *</label>
                <select className="form-select" required value={form.despachoId} onChange={set('despachoId')}>
                  <option value="">Seleccionar despacho...</option>
                  {despachos?.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Monto ($) *</label>
                <input className="form-input" type="number" step="0.01" required value={form.monto} onChange={set('monto')} />
              </div>
              <div className="form-group">
                <label className="form-label">Estado *</label>
                <select className="form-select" required value={form.estado} onChange={set('estado')}>
                  {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_STYLE[e].label}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de Pago</label>
                <input className="form-input" type="date" value={form.fechaPago} onChange={set('fechaPago')} />
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de Vencimiento *</label>
                <input className="form-input" type="date" required value={form.fechaVencimiento} onChange={set('fechaVencimiento')} />
              </div>
              <div className="form-group">
                <label className="form-label">Método de Pago</label>
                <input className="form-input" placeholder="Transferencia, efectivo..." value={form.metodoPago} onChange={set('metodoPago')} />
              </div>
              <div className="form-group">
                <label className="form-label">Referencia / Folio</label>
                <input className="form-input" value={form.referencia} onChange={set('referencia')} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notas</label>
                <textarea className="form-textarea" rows={2} value={form.notas} onChange={set('notas')} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />} Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RootMensualidadesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [filtroDespacho, setFiltroDespacho] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const { data: mensualidades, isLoading } = useQuery({
    queryKey: ['root-mensualidades', filtroDespacho, filtroEstado],
    queryFn: () => rootApi.mensualidades({
      despachoId: filtroDespacho || undefined,
      estado: filtroEstado || undefined,
    }),
  });

  const { data: despachos } = useQuery({
    queryKey: ['root-despachos'],
    queryFn: rootApi.despachos,
  });

  const marcarPagadaM = useMutation({
    mutationFn: (id: number) => rootApi.updateMensualidad(id, {
      estado: 'pagado', fechaPago: new Date().toISOString().split('T')[0],
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['root-mensualidades'] }); toast.success('Marcada como pagada ✅ — despacho desbloqueado'); },
    onError: () => toast.error('Error al actualizar'),
  });

  const marcarVencidaM = useMutation({
    mutationFn: (id: number) => rootApi.updateMensualidad(id, { estado: 'vencido' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['root-mensualidades'] }); toast.success('Marcada como vencida'); },
  });

  const deleteM = useMutation({
    mutationFn: rootApi.deleteMensualidad,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['root-mensualidades'] }); toast.success('Eliminada'); },
  });

  const despachoNombre = (id: number) => despachos?.find((d: any) => d.id === id)?.nombre || `Despacho #${id}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mensualidades</h1>
          <p className="page-subtitle">Registro de pagos y suscripciones por despacho</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>
          <Plus size={16} /> Registrar Pago
        </button>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <select className="form-select" style={{ minWidth: 220 }} value={filtroDespacho}
            onChange={e => setFiltroDespacho(e.target.value)}>
            <option value="">Todos los despachos</option>
            {despachos?.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
          <select className="form-select" style={{ minWidth: 160 }} value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_STYLE[e].label}</option>)}
          </select>
          {(filtroDespacho || filtroEstado) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFiltroDespacho(''); setFiltroEstado(''); }}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Despacho</th>
                <th>Monto</th>
                <th>Vencimiento</th>
                <th>Fecha Pago</th>
                <th>Método</th>
                <th>Referencia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}><div className="spinner" /></td></tr>}
              {mensualidades?.map((m: any) => {
                const est = ESTADO_STYLE[m.estado] || ESTADO_STYLE.pendiente;
                const Icon = est.icon;
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{despachoNombre(m.despachoId)}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>
                      ${Number(m.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td>{new Date(m.fechaVencimiento).toLocaleDateString('es-MX')}</td>
                    <td>{m.fechaPago ? new Date(m.fechaPago).toLocaleDateString('es-MX') : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontSize: '0.82rem' }}>{m.metodoPago || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{m.referencia || '—'}</td>
                    <td>
                      <span className={`badge ${est.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon size={11} /> {est.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                        {m.estado !== 'pagado' && (
                          <button className="btn btn-success btn-sm"
                            onClick={() => marcarPagadaM.mutate(m.id)}
                            disabled={marcarPagadaM.isPending}>
                            ✅ Pagada
                          </button>
                        )}
                        {m.estado === 'pendiente' && (
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => marcarVencidaM.mutate(m.id)}
                            disabled={marcarVencidaM.isPending}>
                            Vencer
                          </button>
                        )}
                        <button className="btn btn-ghost btn-icon btn-icon-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => deleteM.mutate(m.id)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && !mensualidades?.length && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--sp-8)' }}>
                  Sin mensualidades registradas
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <NuevaMensualidadModal
          despachos={despachos}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); qc.invalidateQueries({ queryKey: ['root-mensualidades'] }); }}
        />
      )}
    </div>
  );
}
