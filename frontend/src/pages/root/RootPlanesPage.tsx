import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, Package, Pencil, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { planesApi } from '../../api/planes.api';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

const emptyForm = {
  nombre: '', costoMensualidad: '', iva: '16', isPersonaMoral: true, isPersonaFisica: true,
  numeroUsuarios: '', precioUsuarioExtra: '',
};

function PlanModal({ plan, onClose, onSuccess }: any) {
  const [form, setForm] = useState(plan ? {
    nombre: plan.nombre,
    costoMensualidad: plan.costoMensualidad,
    iva: plan.iva,
    isPersonaMoral: plan.isPersonaMoral,
    isPersonaFisica: plan.isPersonaFisica,
    numeroUsuarios: plan.numeroUsuarios,
    precioUsuarioExtra: plan.precioUsuarioExtra,
  } : emptyForm);
  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }));
  const setBool = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.checked }));

  const mutation = useMutation({
    mutationFn: (data: any) => plan ? planesApi.update(plan.id, data) : planesApi.create(data),
    onSuccess: () => {
      toast.success(plan ? 'Plan actualizado' : 'Plan creado');
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al guardar plan'),
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>{plan ? 'Editar Plan' : 'Nuevo Plan'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={e => {
          e.preventDefault();
          mutation.mutate({
            ...form,
            costoMensualidad: Number(form.costoMensualidad),
            iva: Number(form.iva),
            numeroUsuarios: Number(form.numeroUsuarios),
            precioUsuarioExtra: Number(form.precioUsuarioExtra || 0),
          });
        }}>
          <div className="modal-body">
            <div className="form-grid-2">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Nombre *</label>
                <input className="form-input" required value={form.nombre} onChange={set('nombre')} />
              </div>
              <div className="form-group">
                <label className="form-label">Costo mensualidad ($) *</label>
                <input className="form-input" type="number" step="0.01" required value={form.costoMensualidad} onChange={set('costoMensualidad')} />
              </div>
              <div className="form-group">
                <label className="form-label">IVA (%) *</label>
                <input className="form-input" type="number" step="0.01" required value={form.iva} onChange={set('iva')} />
              </div>
              <div className="form-group">
                <label className="form-label">Usuarios incluidos *</label>
                <input className="form-input" type="number" required value={form.numeroUsuarios} onChange={set('numeroUsuarios')} />
              </div>
              <div className="form-group">
                <label className="form-label">Precio por usuario extra ($)</label>
                <input className="form-input" type="number" step="0.01" value={form.precioUsuarioExtra} onChange={set('precioUsuarioExtra')} />
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.isPersonaFisica} onChange={setBool('isPersonaFisica')} />
                <label className="form-label" style={{ margin: 0 }}>Disponible para persona física</label>
              </div>
              <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input type="checkbox" checked={form.isPersonaMoral} onChange={setBool('isPersonaMoral')} />
                <label className="form-label" style={{ margin: 0 }}>Disponible para persona moral</label>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />} Guardar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RootPlanesPage() {
  const qc = useQueryClient();
  const [modalPlan, setModalPlan] = useState<any>(undefined);
  const [showModal, setShowModal] = useState(false);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const { data: planes, isLoading } = useQuery({ queryKey: ['root-planes'], queryFn: planesApi.list });

  const removeM = useMutation({
    mutationFn: planesApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['root-planes'] });
      toast.success('Plan eliminado');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al eliminar plan'),
  });

  const openNew = () => { setModalPlan(undefined); setShowModal(true); };
  const openEdit = (p: any) => { setModalPlan(p); setShowModal(true); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Planes</h1>
          <p className="page-subtitle">{planes?.length ?? 0} planes configurados</p>
        </div>
        <button className="btn btn-primary" onClick={openNew}>
          <Plus size={16} /> Nuevo Plan
        </button>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Plan</th>
                <th>Costo mensual</th>
                <th>IVA</th>
                <th>Usuarios incluidos</th>
                <th>Precio usuario extra</th>
                <th>Tipo persona</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}><div className="spinner" /></td></tr>
              )}
              {planes?.map((p: any) => (
                <tr key={p.id}>
                  <td style={{ fontWeight: 600 }}>{p.nombre}</td>
                  <td style={{ fontWeight: 600, color: '#10b981' }}>
                    ${Number(p.costoMensualidad).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  </td>
                  <td>{Number(p.iva)}%</td>
                  <td>{p.numeroUsuarios}</td>
                  <td>${Number(p.precioUsuarioExtra).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                  <td style={{ fontSize: '0.8rem' }}>
                    {p.isPersonaFisica && <span className="badge badge-accent" style={{ marginRight: 4 }}>Física</span>}
                    {p.isPersonaMoral && <span className="badge badge-accent">Moral</span>}
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                      <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => openEdit(p)} data-tooltip="Editar">
                        <Pencil size={15} />
                      </button>
                      <button
                        className="btn btn-ghost btn-icon btn-icon-sm"
                        onClick={() => askConfirm({
                          title: 'Eliminar plan',
                          message: `¿Eliminar el plan "${p.nombre}"? Esta acción no se puede deshacer.`,
                          confirmLabel: 'Eliminar',
                          danger: true,
                          onConfirm: () => removeM.mutate(p.id),
                        })}
                        data-tooltip="Eliminar"
                      >
                        <Trash2 size={15} style={{ color: 'var(--danger)' }} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && !planes?.length && (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <div className="empty-icon"><Package size={40} /></div>
                    <h3>Sin planes</h3>
                    <p>Crea el primer plan para poder asignarlo a un despacho</p>
                    <button className="btn btn-primary" onClick={openNew}><Plus size={16} /> Nuevo Plan</button>
                  </div>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <PlanModal
          plan={modalPlan}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); qc.invalidateQueries({ queryKey: ['root-planes'] }); }}
        />
      )}
      {confirmDialog}
    </div>
  );
}
