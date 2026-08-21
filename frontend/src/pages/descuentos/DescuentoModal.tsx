import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2, Tag, Percent, DollarSign, Check } from 'lucide-react';
import toast from 'react-hot-toast';
import { descuentosApi } from '../../api/descuentos.api';
import { getErrorMessage } from '../../utils/errors';
import ModalErrorBanner from '../../components/ModalErrorBanner';

const TIPO_OPTS = [
  { value: 'porcentaje', label: 'Porcentaje (%)', icon: Percent },
  { value: 'monto_fijo', label: 'Monto fijo ($)', icon: DollarSign },
];

interface Props {
  descuento?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function DescuentoModal({ descuento, onClose, onSuccess }: Props) {
  const isEdit = !!descuento;
  const [form, setForm] = useState({
    nombre: descuento?.nombre || '',
    descripcion: descuento?.descripcion || '',
    tipo: descuento?.tipo || 'porcentaje',
    valor: descuento?.valor != null ? String(descuento.valor) : '',
    activo: descuento?.activo ?? true,
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: { nombre: string; descripcion: string; tipo: string; valor: number; activo: boolean }) =>
      isEdit ? descuentosApi.update(descuento.id, data) : descuentosApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Descuento actualizado' : 'Descuento creado');
      onSuccess();
    },
    onError: (err: any) => setError(getErrorMessage(err, 'Error al guardar el descuento')),
  });

  const previewDescuento = (valor: number) => {
    if (!valor) return null;
    if (form.tipo === 'porcentaje') return `Descuento del ${valor}%`;
    return `Descuento de $${valor.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.nombre.trim()) {
      setError('El nombre del descuento es obligatorio');
      return;
    }

    const valorTexto = form.valor.trim();
    if (!valorTexto) {
      setError('Indica el valor del descuento');
      return;
    }
    const valor = Number(valorTexto);
    if (Number.isNaN(valor)) {
      setError('El valor debe ser un número válido');
      return;
    }
    if (valor <= 0) {
      setError('El valor debe ser mayor a 0');
      return;
    }
    if (form.tipo === 'porcentaje' && valor > 100) {
      setError('Un descuento de porcentaje no puede ser mayor a 100%');
      return;
    }

    mutation.mutate({ nombre: form.nombre, descripcion: form.descripcion, tipo: form.tipo, valor, activo: form.activo });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={18} style={{ color: 'var(--accent-400)' }} />
            {isEdit ? 'Editar Descuento' : 'Nuevo Descuento'}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <ModalErrorBanner message={error} />

            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input id="descuento-modal-nombre" type="text" className="form-input" required autoFocus
                value={form.nombre} placeholder="Ej: Clientes frecuentes, Estudiantes..."
                onChange={(e) => setForm(f => ({ ...f, nombre: e.target.value }))} />
            </div>

            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input id="descuento-modal-desc" type="text" className="form-input" value={form.descripcion}
                placeholder="Descripción opcional..."
                onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))} />
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
                      onClick={() => setForm(f => ({ ...f, tipo: opt.value }))}
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
              <input
                id="descuento-modal-valor" className="form-input" type="number" step="0.01" min="0"
                max={form.tipo === 'porcentaje' ? 100 : undefined}
                value={form.valor}
                onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))}
                placeholder={form.tipo === 'porcentaje' ? '10' : '100'}
              />
              {previewDescuento(Number(form.valor)) && (
                <small style={{ color: 'var(--accent-400)', marginTop: 4, display: 'block' }}>
                  → {previewDescuento(Number(form.valor))}
                </small>
              )}
            </div>

            {/* Activo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <input
                id="descuento-modal-activo"
                type="checkbox"
                checked={form.activo}
                onChange={(e) => setForm(f => ({ ...f, activo: e.target.checked }))}
                style={{ width: 16, height: 16, accentColor: 'var(--accent-400)', cursor: 'pointer' }}
              />
              <label htmlFor="descuento-modal-activo" style={{ cursor: 'pointer', fontSize: '0.875rem' }}>
                Descuento activo (disponible al registrar pagos)
              </label>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button id="descuento-modal-submit" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={15} className="spinning" /> : <Check size={15} />}
              {isEdit ? 'Guardar cambios' : 'Crear descuento'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
