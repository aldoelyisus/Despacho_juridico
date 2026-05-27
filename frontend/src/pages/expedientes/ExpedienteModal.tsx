import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Loader2, UserCheck, Users, Briefcase } from 'lucide-react';
import toast from 'react-hot-toast';
import { expedientesApi } from '../../api/expedientes.api';
import { catalogosApi } from '../../api/catalogos.api';
import { clientesApi } from '../../api/clientes.api';
import { usuariosApi } from '../../api/usuarios.api';

const ESTADOS = ['activo', 'en_proceso', 'cerrado', 'ganado', 'perdido', 'suspendido'];
const ESTADO_LABELS: Record<string, string> = {
  activo: 'Activo', en_proceso: 'En proceso', cerrado: 'Cerrado',
  ganado: 'Ganado', perdido: 'Perdido', suspendido: 'Suspendido',
};

// ── Chip reutilizable ──────────────────────────────────────────────────────
function Chip({ label, color, onRemove }: { label: string; color: string; onRemove: () => void }) {
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      background: `${color}18`, border: `1px solid ${color}44`,
      borderRadius: 99, padding: '3px 10px',
      fontSize: '0.8rem', fontWeight: 500, color,
    }}>
      {label}
      <button type="button" onClick={onRemove} style={{
        background: 'none', border: 'none', cursor: 'pointer',
        color, padding: 0, marginLeft: 2, lineHeight: 1, fontSize: '1rem',
      }}>×</button>
    </span>
  );
}

// ── Selector con chips ─────────────────────────────────────────────────────
function ChipSelector({ id, label, icon: Icon, required, color, placeholder, addLabel, items, selectedIds, onToggle, warning }: any) {
  const selected = items.filter((x: any) => selectedIds.includes(x.id));
  const available = items.filter((x: any) => !selectedIds.includes(x.id));
  return (
    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
      <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={14} /> {label} {required && '*'}
      </label>
      {selected.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
          {selected.map((item: any) => (
            <Chip key={item.id}
              label={item.nombre + (item.apellido ? ` ${item.apellido}` : '')}
              color={color}
              onRemove={() => onToggle(item.id)}
            />
          ))}
        </div>
      )}
      <select id={id} className="form-select" value=""
        onChange={(e) => { if (e.target.value) onToggle(+e.target.value); }}>
        <option value="">{selected.length === 0 ? placeholder : addLabel}</option>
        {available.map((item: any) => (
          <option key={item.id} value={item.id}>
            {item.nombre}{item.apellido ? ` ${item.apellido}` : ''}
          </option>
        ))}
      </select>
      {warning && selected.length === 0 && (
        <small style={{ color: 'var(--warning)', marginTop: 4, display: 'block' }}>{warning}</small>
      )}
    </div>
  );
}

// ── Modal principal ────────────────────────────────────────────────────────
export default function ExpedienteModal({ expediente, onClose, onSuccess }: any) {
  const isEdit = !!expediente;

  const [clienteIds, setClienteIds] = useState<number[]>(
    expediente?.clientes?.map((c: any) => c.id) || []
  );
  const [colaboradorIds, setColaboradorIds] = useState<number[]>(
    expediente?.colaboradores?.map((u: any) => u.id) || []
  );
  const [form, setForm] = useState({
    titulo: expediente?.titulo || '',
    descripcion: expediente?.descripcion || '',
    areaId: expediente?.areaId || '',
    estado: expediente?.estado || 'activo',
    fechaInicio: expediente?.fechaInicio
      ? new Date(expediente.fechaInicio).toISOString().split('T')[0]
      : '',
    notas: expediente?.notas || '',
  });

  const { data: areas } = useQuery({ queryKey: ['areas'], queryFn: catalogosApi.areas });
  const { data: clientesData } = useQuery({
    queryKey: ['clientes-list'],
    queryFn: () => clientesApi.list({ limite: 200 }),
  });
  const { data: usuariosData } = useQuery({
    queryKey: ['usuarios-list'],
    queryFn: () => usuariosApi.list(),
  });

  const clientes = clientesData?.items || [];
  const usuarios = usuariosData?.items || usuariosData || [];

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? expedientesApi.update(expediente.id, data) : expedientesApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Expediente actualizado' : 'Expediente creado');
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al guardar'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEdit && clienteIds.length === 0) {
      toast.error('Debes asociar al menos un cliente al expediente');
      return;
    }
    mutation.mutate({
      ...form,
      areaId: form.areaId ? +form.areaId : undefined,
      clienteIds,
      colaboradorIds,
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>{isEdit ? 'Editar Expediente' : 'Nuevo Expediente'}</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid-2">

              {/* TÍTULO */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Título del Expediente *</label>
                <input id="exp-titulo" type="text" className="form-input" required
                  value={form.titulo}
                  onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>

              {/* CLIENTES */}
              <ChipSelector
                id="exp-clientes"
                label="Clientes asociados"
                icon={Users}
                required={!isEdit}
                color="#6366f1"
                placeholder="Seleccionar cliente..."
                addLabel="+ Agregar otro cliente"
                items={clientes}
                selectedIds={clienteIds}
                onToggle={(id: number) =>
                  setClienteIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
                }
                warning="⚠ Debes asociar al menos un cliente para registrar cobros"
              />

              {/* ABOGADOS / COLABORADORES */}
              <ChipSelector
                id="exp-colaboradores"
                label="Abogados / Colaboradores"
                icon={Briefcase}
                required={false}
                color="#f59e0b"
                placeholder="Asignar abogado..."
                addLabel="+ Asignar otro abogado"
                items={usuarios}
                selectedIds={colaboradorIds}
                onToggle={(id: number) =>
                  setColaboradorIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
                }
              />

              {/* ÁREA */}
              <div className="form-group">
                <label className="form-label">Área del Derecho</label>
                <select id="exp-area" className="form-select" value={form.areaId}
                  onChange={(e) => setForm(f => ({ ...f, areaId: e.target.value }))}>
                  <option value="">Seleccionar área...</option>
                  {areas?.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>

              {/* ESTADO */}
              <div className="form-group">
                <label className="form-label">Estado</label>
                <select id="exp-estado" className="form-select" value={form.estado}
                  onChange={(e) => setForm(f => ({ ...f, estado: e.target.value }))}>
                  {ESTADOS.map(s => <option key={s} value={s}>{ESTADO_LABELS[s]}</option>)}
                </select>
              </div>

              {/* FECHA INICIO */}
              <div className="form-group">
                <label className="form-label">Fecha de Inicio</label>
                <input id="exp-fecha" type="date" className="form-input" value={form.fechaInicio}
                  onChange={(e) => setForm(f => ({ ...f, fechaInicio: e.target.value }))} />
              </div>

              {/* COSTO ACUMULADO — solo lectura en edición */}
              {isEdit && (
                <div className="form-group">
                  <label className="form-label">Costo Total Acumulado</label>
                  <div style={{
                    padding: 'var(--sp-3) var(--sp-4)', background: 'var(--bg-3)',
                    borderRadius: 'var(--radius)', fontWeight: 700, fontSize: '1.1rem',
                    color: '#10b981', border: '1px solid var(--border)',
                  }}>
                    ${Number(expediente.montoTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                      (se actualiza al registrar cobros)
                    </span>
                  </div>
                </div>
              )}

              {/* DESCRIPCIÓN */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Descripción</label>
                <textarea id="exp-desc" className="form-textarea" rows={3}
                  value={form.descripcion}
                  onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>

              {/* NOTAS */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notas</label>
                <textarea id="exp-notas" className="form-textarea" rows={2}
                  value={form.notas}
                  onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>

            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button id="exp-submit" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />}
              {isEdit ? 'Actualizar' : 'Crear Expediente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
