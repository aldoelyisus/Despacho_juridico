import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2, Tag } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogosApi } from '../../api/catalogos.api';
import { getErrorMessage } from '../../utils/errors';
import ModalErrorBanner from '../../components/ModalErrorBanner';

interface Props {
  area: { id: number; nombre: string };
  subarea?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function SubareaModal({ area, subarea, onClose, onSuccess }: Props) {
  const isEdit = !!subarea;
  const [nombre, setNombre] = useState(subarea?.nombre || '');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: { nombre: string; areaId: number }) =>
      isEdit ? catalogosApi.updateSubarea(subarea.id, data) : catalogosApi.createSubarea(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Subárea actualizada' : 'Subárea creada');
      onSuccess();
    },
    onError: (err: any) => setError(getErrorMessage(err, 'Error al guardar la subárea')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombre.trim()) { setError('El nombre de la subárea es obligatorio'); return; }
    mutation.mutate({ nombre, areaId: area.id });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Tag size={18} style={{ color: 'var(--accent-400)' }} />
            {isEdit ? 'Editar Subárea' : 'Nueva Subárea'}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <ModalErrorBanner message={error} />
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)' }}>
              Área: <strong style={{ color: 'var(--text-secondary)' }}>{area.nombre}</strong>
            </p>
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input
                id="subarea-modal-nombre" type="text" className="form-input" required autoFocus
                value={nombre} placeholder="Ej: Delitos patrimoniales"
                onChange={(e) => setNombre(e.target.value)}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button id="subarea-modal-submit" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />}
              {isEdit ? 'Guardar cambios' : 'Crear subárea'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
