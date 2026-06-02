import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Plus, X, Loader2, Pencil, Trash2, Tag,
  Percent, DollarSign, Check,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { descuentosApi } from '../../api/descuentos.api';

const TIPO_OPTS = [
  { value: 'porcentaje', label: 'Porcentaje (%)', icon: Percent },
  { value: 'monto_fijo', label: 'Monto fijo ($)', icon: DollarSign },
];

function DescuentoModal({ initial, onClose, onSave }: any) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    nombre: initial?.nombre || '',
    descripcion: initial?.descripcion || '',
    tipo: initial?.tipo || 'porcentaje',
    valor: initial?.valor ?? '',
    activo: initial?.activo ?? true,
  });
  const set = (f: string) => (e: any) =>
    setForm(p => ({ ...p, [f]: e.target.value }));

  const previewDescuento = () => {
    const v = Number(form.valor);
    if (!v) return null;
    if (form.tipo === 'porcentaje') return `Descuento del ${v}%`;
    return `Descuento de $${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={16} style={{ color: 'var(--accent-400)' }} />
            {isEdit ? 'Editar Descuento' : 'Nuevo Descuento'}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); onSave(form); }}>
          <div className="modal-body">
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input className="form-input" required value={form.nombre} onChange={set('nombre')}
                placeholder="Ej: Clientes frecuentes, Estudiantes..." />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input className="form-input" value={form.descripcion} onChange={set('descripcion')}
                placeholder="Descripción opcional..." />
            </div>

            {/* Tipo de descuento */}
            <div className="form-group">
              <label className="form-label">Tipo de descuento *</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-2)' }}>
                {TIPO_OPTS.map(opt => {
                  const Icon = opt.icon;
                  const selected = form.tipo === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setForm(p => ({ ...p, tipo: opt.value }))}
                      style={{
                        padding: 'var(--sp-3)',
                        border: `2px solid ${selected ? 'var(--accent-400)' : 'var(--border-default)'}`,
                        borderRadius: 'var(--radius-md)',
                        background: selected ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        gap: 8, color: selected ? 'var(--accent-400)' : 'var(--text-muted)',
                        fontWeight: selected ? 600 : 400, transition: 'all 0.15s',
                      }}>
                      <Icon size={16} /> {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Valor */}
            <div className="form-group">
              <label className="form-label">
                Valor * {form.tipo === 'porcentaje' ? '(%)' : '($)'}
              </label>
              <div className="input-icon-right">
                <input
                  className="form-input"
                  type="number"
                  step="0.01"
                  min="0"
                  max={form.tipo === 'porcentaje' ? 100 : undefined}
                  required
                  value={form.valor}
                  onChange={set('valor')}
                  placeholder={form.tipo === 'porcentaje' ? '10' : '100'}
                />
              </div>
              {previewDescuento() && (
                <small style={{ color: 'var(--accent-400)', marginTop: 4, display: 'block' }}>
                  → {previewDescuento()}
                </small>
              )}
            </div>

            {/* Activo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                id="descuento-activo"
                type="checkbox"
                checked={form.activo}
                onChange={e => setForm(p => ({ ...p, activo: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-400)', cursor: 'pointer' }}
              />
              <label htmlFor="descuento-activo" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                Descuento activo (disponible al crear pagos)
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary">
              <Check size={15} /> {isEdit ? 'Guardar cambios' : 'Crear descuento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function DescuentosPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<'new' | 'edit' | null>(null);
  const [editing, setEditing] = useState<any>(null);

  const { data: descuentos, isLoading } = useQuery({
    queryKey: ['descuentos'],
    queryFn: () => descuentosApi.list(),
  });

  const createM = useMutation({
    mutationFn: descuentosApi.create,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descuentos'] }); setModal(null); toast.success('Descuento creado'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }: any) => descuentosApi.update(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descuentos'] }); setModal(null); setEditing(null); toast.success('Descuento actualizado'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const deleteM = useMutation({
    mutationFn: descuentosApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descuentos'] }); toast.success('Descuento eliminado'); },
    onError: () => toast.error('Error al eliminar'),
  });

  const handleSave = (form: any) => {
    const payload = { ...form, valor: Number(form.valor) };
    if (modal === 'edit' && editing) {
      updateM.mutate({ id: editing.id, data: payload });
    } else {
      createM.mutate(payload);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo de Descuentos</h1>
          <p className="page-subtitle">Define descuentos para aplicar a los cobros de clientes</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModal('new'); }}>
          <Plus size={16} /> Nuevo Descuento
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 'var(--sp-8)' }}><div className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {descuentos?.map((d: any) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                          background: 'var(--accent-glow)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {d.tipo === 'porcentaje'
                            ? <Percent size={14} style={{ color: 'var(--accent-400)' }} />
                            : <DollarSign size={14} style={{ color: '#10b981' }} />}
                        </div>
                        <span style={{ fontWeight: 600 }}>{d.nombre}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${d.tipo === 'porcentaje' ? 'badge-info' : 'badge-success'}`}>
                        {d.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {d.tipo === 'porcentaje'
                        ? <span style={{ color: 'var(--accent-400)' }}>{Number(d.valor)}%</span>
                        : <span style={{ color: '#10b981' }}>${Number(d.valor).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{d.descripcion || '—'}</td>
                    <td>
                      <span className={`badge ${d.activo ? 'badge-success' : 'badge-muted'}`}>
                        {d.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-icon-sm"
                          onClick={() => { setEditing(d); setModal('edit'); }}
                          title="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-icon-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => { if (confirm('¿Eliminar este descuento?')) deleteM.mutate(d.id); }}
                          title="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!descuentos?.length && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <div className="empty-icon"><Tag size={40} /></div>
                        <h3>Sin descuentos registrados</h3>
                        <p>Crea tu primer descuento para aplicarlo a los cobros</p>
                        <button className="btn btn-primary" onClick={() => setModal('new')}>
                          <Plus size={16} /> Nuevo Descuento
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(modal === 'new' || modal === 'edit') && (
        <DescuentoModal
          initial={modal === 'edit' ? editing : null}
          onClose={() => { setModal(null); setEditing(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
