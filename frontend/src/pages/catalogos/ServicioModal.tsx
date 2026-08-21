import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2, BadgeDollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogosApi } from '../../api/catalogos.api';
import { getErrorMessage } from '../../utils/errors';
import ModalErrorBanner from '../../components/ModalErrorBanner';

interface Props {
  servicio?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ServicioModal({ servicio, onClose, onSuccess }: Props) {
  const isEdit = !!servicio;
  const [form, setForm] = useState({
    nombre: servicio?.nombre || '',
    descripcion: servicio?.descripcion || '',
    costo: servicio?.costo != null ? String(servicio.costo) : '',
  });
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: { nombre: string; descripcion: string; costo: number }) =>
      isEdit ? catalogosApi.updateServicio(servicio.id, data) : catalogosApi.createServicio(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Servicio actualizado' : 'Servicio creado');
      onSuccess();
    },
    onError: (err: any) => setError(getErrorMessage(err, 'Error al guardar el servicio')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.nombre.trim()) {
      setError('El nombre del servicio es obligatorio');
      return;
    }

    const costoTexto = form.costo.trim();
    if (!costoTexto) {
      setError('Indica el costo del servicio');
      return;
    }
    const costo = Number(costoTexto);
    if (Number.isNaN(costo)) {
      setError('El costo debe ser un número válido (ej: 1500.00)');
      return;
    }
    if (costo < 0) {
      setError('El costo no puede ser negativo');
      return;
    }

    mutation.mutate({ nombre: form.nombre, descripcion: form.descripcion, costo });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <BadgeDollarSign size={18} style={{ color: 'var(--accent-400)' }} />
            {isEdit ? 'Editar Servicio' : 'Nuevo Servicio Legal'}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <ModalErrorBanner message={error} />
            <div className="form-group">
              <label className="form-label">Nombre del servicio *</label>
              <input
                id="servicio-modal-nombre" type="text" className="form-input" required autoFocus
                value={form.nombre} placeholder="Ej: Consulta Jurídica"
                onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Costo ($) *</label>
              <input
                id="servicio-modal-costo" type="number" step="0.01" min="0" className="form-input"
                value={form.costo} placeholder="0.00"
                onChange={(e) => setForm((f) => ({ ...f, costo: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Descripción</label>
              <input
                id="servicio-modal-desc" type="text" className="form-input" value={form.descripcion}
                placeholder="Descripción opcional del servicio"
                onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
              />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button id="servicio-modal-submit" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />}
              {isEdit ? 'Guardar cambios' : 'Crear servicio'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
