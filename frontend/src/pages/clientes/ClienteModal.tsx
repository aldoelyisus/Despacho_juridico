import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientesApi } from '../../api/clientes.api';
import { getErrorMessage } from '../../utils/errors';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Validación ligera en el cliente para dar feedback inmediato antes de llamar al backend */
function validar(form: Record<string, string>): string | null {
  if (!form.nombre.trim()) return 'El nombre es obligatorio';
  if (!form.apellido.trim()) return 'El apellido es obligatorio';
  if (!form.celular.trim()) return 'El celular es obligatorio';
  if (form.email && !EMAIL_REGEX.test(form.email.trim())) return 'El email no tiene un formato válido';
  return null;
}

interface Props {
  cliente?: any;
  onClose: () => void;
  onSuccess: () => void;
}

export default function ClienteModal({ cliente, onClose, onSuccess }: Props) {
  const isEdit = !!cliente;
  const [form, setForm] = useState({
    nombre: cliente?.nombre || '',
    apellido: cliente?.apellido || '',
    email: cliente?.email || '',
    telefono: cliente?.telefono || '',
    celular: cliente?.celular || '',
    rfc: cliente?.rfc || '',
    curp: cliente?.curp || '',
    direccion: cliente?.direccion || '',
    ciudad: cliente?.ciudad || '',
    estado: cliente?.estado || '',
    notas: cliente?.notas || '',
  });

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [f]: e.target.value }));

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? clientesApi.update(cliente.id, data) : clientesApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Cliente actualizado' : 'Cliente registrado');
      onSuccess();
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Error al guardar el cliente')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const error = validar(form);
    if (error) { toast.error(error); return; }
    mutation.mutate(form);
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>{isEdit ? 'Editar Cliente' : 'Nuevo Cliente'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input id="cl-nombre" type="text" className="form-input" value={form.nombre} onChange={set('nombre')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Apellido *</label>
                <input id="cl-apellido" type="text" className="form-input" value={form.apellido} onChange={set('apellido')} required />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input id="cl-email" type="email" className="form-input" value={form.email} onChange={set('email')} />                
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono</label>
                <input id="cl-telefono" type="tel" className="form-input" value={form.telefono} onChange={set('telefono')} />
              </div>
              <div className="form-group">
                <label className="form-label">Celular *</label>
                <input id="cl-celular" type="tel" className="form-input" value={form.celular} onChange={set('celular')} required />
              </div>
              <div className="form-group">
                <label className="form-label">RFC</label>
                <input id="cl-rfc" type="text" className="form-input" value={form.rfc} onChange={set('rfc')} maxLength={13} />
              </div>
              <div className="form-group">
                <label className="form-label">CURP</label>
                <input id="cl-curp" type="text" className="form-input" value={form.curp} onChange={set('curp')} maxLength={18} />
              </div>
              <div className="form-group">
                <label className="form-label">Ciudad</label>
                <input id="cl-ciudad" type="text" className="form-input" value={form.ciudad} onChange={set('ciudad')} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Dirección</label>
                <input id="cl-direccion" type="text" className="form-input" value={form.direccion} onChange={set('direccion')} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notas</label>
                <textarea id="cl-notas" className="form-textarea" value={form.notas} onChange={set('notas')} rows={3} />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button id="cl-submit" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending ? <Loader2 size={16} className="spinning" /> : null}
              {isEdit ? 'Actualizar' : 'Registrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
