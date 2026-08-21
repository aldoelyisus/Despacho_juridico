import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Loader2, Users, Briefcase, FolderOpen, Info, CalendarClock, StickyNote } from 'lucide-react';
import toast from 'react-hot-toast';
import { expedientesApi } from '../../api/expedientes.api';
import { catalogosApi } from '../../api/catalogos.api';
import { clientesApi } from '../../api/clientes.api';
import { usuariosApi } from '../../api/usuarios.api';
import { getErrorMessage } from '../../utils/errors';
import ModalErrorBanner from '../../components/ModalErrorBanner';

// ── Encabezado de sección — agrupa visualmente los campos relacionados ──────
function SectionHeader({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 6, margin: '0 0 var(--sp-3)',
      fontSize: '0.75rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase',
      color: 'var(--text-muted)',
    }}>
      <Icon size={13} /> {title}
    </div>
  );
}

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
    areaId: expediente?.areaId ? String(expediente.areaId) : '',
    subareaId: expediente?.subareaId ? String(expediente.subareaId) : '',
    fechaInicio: expediente?.fechaInicio
      ? new Date(expediente.fechaInicio).toISOString().split('T')[0]
      : '',
    fechaCierre: expediente?.fechaCierre
      ? new Date(expediente.fechaCierre).toISOString().split('T')[0]
      : '',
    notas: expediente?.notas || '',
  });
  const [error, setError] = useState<string | null>(null);

  const { data: areasData } = useQuery({ queryKey: ['areas'], queryFn: () => catalogosApi.areas({ limite: 100 }) });
  const areas = areasData?.items || [];
  const { data: subareasData } = useQuery({
    queryKey: ['subareas', form.areaId],
    queryFn: () => catalogosApi.subareas({ areaId: form.areaId, limite: 100 }),
    enabled: !!form.areaId,
  });
  const subareas = subareasData?.items || [];
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

  // Si cambia el área, la subárea seleccionada deja de ser válida
  useEffect(() => {
    if (form.subareaId && !subareas.some((s: any) => String(s.id) === form.subareaId)) {
      setForm((f) => ({ ...f, subareaId: '' }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.areaId, subareasData]);

  const mutation = useMutation({
    mutationFn: (data: any) =>
      isEdit ? expedientesApi.update(expediente.id, data) : expedientesApi.create(data),
    onSuccess: () => {
      toast.success(isEdit ? 'Expediente actualizado' : 'Expediente creado');
      onSuccess();
    },
    onError: (err: any) => setError(getErrorMessage(err, 'Error al guardar el expediente')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.titulo.trim()) {
      setError('El título del expediente es obligatorio');
      return;
    }
    if (!isEdit && clienteIds.length === 0) {
      setError('Debes asociar al menos un cliente al expediente');
      return;
    }
    if (form.fechaCierre && form.fechaInicio && form.fechaCierre < form.fechaInicio) {
      setError('La fecha de cierre no puede ser anterior a la fecha de inicio');
      return;
    }

    mutation.mutate({
      titulo: form.titulo,
      descripcion: form.descripcion || undefined,
      areaId: form.areaId ? +form.areaId : undefined,
      subareaId: form.subareaId ? +form.subareaId : undefined,
      fechaInicio: form.fechaInicio || undefined,
      fechaCierre: isEdit ? (form.fechaCierre || undefined) : undefined,
      notas: form.notas || undefined,
      clienteIds,
      colaboradorIds,
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-xl">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FolderOpen size={18} style={{ color: 'var(--accent-400)' }} />
            {isEdit ? `Editar Expediente ${expediente.numero || ''}` : 'Nuevo Expediente'}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <ModalErrorBanner message={error} />

            {/* ── INFORMACIÓN GENERAL ──────────────────────────────────── */}
            <SectionHeader icon={Info} title="Información general" />
            <div className="form-grid-2" style={{ marginBottom: 'var(--sp-5)' }}>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Título del expediente *</label>
                <input id="exp-titulo" type="text" className="form-input" required autoFocus
                  placeholder="Ej: Divorcio incausado - Familia Ramírez"
                  value={form.titulo}
                  onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Descripción</label>
                <textarea id="exp-desc" className="form-textarea" rows={2}
                  placeholder="Resumen breve del caso"
                  value={form.descripcion}
                  onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))} />
              </div>
            </div>

            <div className="divider" />

            {/* ── PERSONAS INVOLUCRADAS ────────────────────────────────── */}
            <SectionHeader icon={Users} title="Personas involucradas" />
            <div className="form-grid-2" style={{ marginBottom: 'var(--sp-5)' }}>
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
            </div>

            <div className="divider" />

            {/* ── CLASIFICACIÓN ─────────────────────────────────────────── */}
            <SectionHeader icon={FolderOpen} title="Clasificación del caso" />
            <div className="form-grid-2" style={{ marginBottom: 'var(--sp-5)' }}>
              <div className="form-group">
                <label className="form-label">Área del Derecho</label>
                <select id="exp-area" className="form-select" value={form.areaId}
                  onChange={(e) => setForm(f => ({ ...f, areaId: e.target.value }))}>
                  <option value="">Seleccionar área...</option>
                  {areas?.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Subárea</label>
                <select id="exp-subarea" className="form-select" value={form.subareaId}
                  disabled={!form.areaId}
                  onChange={(e) => setForm(f => ({ ...f, subareaId: e.target.value }))}>
                  <option value="">{form.areaId ? 'Seleccionar subárea...' : 'Primero elige un área'}</option>
                  {subareas?.map((s: any) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
                </select>
              </div>
            </div>

            <div className="divider" />

            {/* ── FECHAS ───────────────────────────────────────────────── */}
            <SectionHeader icon={CalendarClock} title="Fechas" />
            <div className={isEdit ? 'form-grid-2' : undefined} style={{ marginBottom: isEdit ? 'var(--sp-3)' : 'var(--sp-5)' }}>
              <div className="form-group">
                <label className="form-label">Fecha de inicio</label>
                <input id="exp-fecha-inicio" type="date" className="form-input" value={form.fechaInicio}
                  onChange={(e) => setForm(f => ({ ...f, fechaInicio: e.target.value }))} />
              </div>
              {isEdit && (
                <div className="form-group">
                  <label className="form-label">Fecha de cierre</label>
                  <input id="exp-fecha-cierre" type="date" className="form-input" value={form.fechaCierre}
                    onChange={(e) => setForm(f => ({ ...f, fechaCierre: e.target.value }))} />
                  <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Se completa automáticamente al marcar el expediente como ganado, perdido o cancelado
                  </small>
                </div>
              )}
            </div>

            {isEdit && (
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--sp-5)' }}>
                El estado del expediente se cambia desde su vista de detalle, donde solo se permiten las transiciones válidas.
              </p>
            )}

            {/* COSTO ACUMULADO — solo lectura en edición */}
            {isEdit && (
              <div className="form-group" style={{ marginBottom: 'var(--sp-5)' }}>
                <label className="form-label">Costo total acumulado</label>
                <div style={{
                  padding: 'var(--sp-3) var(--sp-4)', background: 'var(--bg-elevated)',
                  borderRadius: 'var(--radius-md)', fontWeight: 700, fontSize: '1.1rem',
                  color: 'var(--success)', border: '1px solid var(--border-subtle)',
                }}>
                  ${Number(expediente.montoTotal || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 400, marginLeft: 8 }}>
                    (se actualiza al registrar cobros)
                  </span>
                </div>
              </div>
            )}

            <div className="divider" />

            {/* ── NOTAS ────────────────────────────────────────────────── */}
            <SectionHeader icon={StickyNote} title="Notas internas" />
            <div className="form-group" style={{ marginBottom: 0 }}>
              <textarea id="exp-notas" className="form-textarea" rows={2}
                placeholder="Notas visibles solo para el equipo del despacho"
                value={form.notas}
                onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button id="exp-submit" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />}
              {isEdit ? 'Guardar cambios' : 'Crear expediente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
