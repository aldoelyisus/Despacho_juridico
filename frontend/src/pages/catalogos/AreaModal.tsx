import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2, BookOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogosApi } from '../../api/catalogos.api';
import { getErrorMessage } from '../../utils/errors';
import ModalErrorBanner from '../../components/ModalErrorBanner';

interface Props {
  area?: any;
  onClose: () => void;
  onSuccess: (updated?: any) => void;
}

export default function AreaModal({ area, onClose, onSuccess }: Props) {
  const isEdit = !!area;
  const [form, setForm] = useState({
    nombre: area?.nombre || '',
    descripcion: area?.descripcion || '',
    color: area?.color || '#6366f1',
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit ? catalogosApi.updateArea(area.id, data) : catalogosApi.createArea(data),
    onSuccess: (updated) => {
      toast.success(isEdit ? 'Área actualizada' : 'Área creada');
      onSuccess(updated);
    },
    onError: (err: any) => setError(getErrorMessage(err, 'Error al guardar el área')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!form.nombre.trim()) { setError('El nombre del área es obligatorio'); return; }
    mutation.mutate(form);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BookOpen size={18} style={{ color: 'var(--accent-400)' }} />
            {isEdit ? 'Editar Área' : 'Nueva Área del Derecho'}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <ModalErrorBanner message={error} />
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input
                id="area-modal-nombre" type="text" className="form-input" required autoFocus
                value={form.nombre} placeholder="Ej: Derecho Penal"
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Color identificador</label>
              <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                <input
                  type="color" value={form.color}
                  onChange={(e) => setForm((f) => ({ ...f, color: e.target.value }))}
                  style={{ width: 44, height: 38, border: 'none', background: 'none', cursor: 'pointer', padding: 2 }}
                />
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{form.color}</span>
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input
                id="area-modal-desc" type="text" className="form-input" value={form.descripcion}
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button id="area-modal-submit" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />}
              {isEdit ? 'Guardar cambios' : 'Crear área'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
