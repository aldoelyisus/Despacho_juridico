import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { X, Loader2, Receipt, Tag, FileText, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';
import { pagosApi } from '../../api/pagos.api';
import { clientesApi } from '../../api/clientes.api';
import { catalogosApi } from '../../api/catalogos.api';
import { expedientesApi } from '../../api/expedientes.api';
import { descuentosApi } from '../../api/descuentos.api';
import { getErrorMessage } from '../../utils/errors';
import ModalErrorBanner from '../../components/ModalErrorBanner';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

const FORM_INIT = {
  clienteId: '', expedienteId: '', servicioId: '', descuentoId: '',
  concepto: '', fechaVencimiento: '', notas: '',
};

interface ExpedienteContext {
  id: number;
  numero: string;
  clientes: { id: number; nombre: string; apellido: string }[];
}

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  /** Cuando se abre desde el detalle de un expediente: fija el expediente y limita el cliente a los ya asociados a él */
  expedienteContext?: ExpedienteContext;
}

export default function PagoModal({ onClose, onSuccess, expedienteContext }: Props) {
  const [form, setForm] = useState({
    ...FORM_INIT,
    expedienteId: expedienteContext ? String(expedienteContext.id) : '',
    clienteId: expedienteContext?.clientes.length === 1 ? String(expedienteContext.clientes[0].id) : '',
  });
  const [error, setError] = useState<string | null>(null);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const { data: clientes } = useQuery({
    queryKey: ['clientes-list'],
    queryFn: () => clientesApi.list({ limite: 200 }),
    enabled: !expedienteContext,
  });
  const clientesDisponibles = expedienteContext?.clientes || clientes?.items || [];

  const { data: servicios } = useQuery({ queryKey: ['servicios-list'], queryFn: () => catalogosApi.servicios() });
  const { data: expedientesCliente } = useQuery({
    queryKey: ['expedientes-cliente', form.clienteId],
    queryFn: () => expedientesApi.list({ clienteId: form.clienteId, limite: 100 }),
    enabled: !expedienteContext && !!form.clienteId,
  });
  const { data: descuentos } = useQuery({ queryKey: ['descuentos-activos'], queryFn: () => descuentosApi.list({ activos: true }) });

  const servicioSeleccionado = servicios?.find((s: any) => s.id === +form.servicioId) || null;
  const descuentoSeleccionado = descuentos?.find((d: any) => d.id === +form.descuentoId) || null;
  const clienteSeleccionado = clientesDisponibles.find((c: any) => c.id === +form.clienteId) || null;

  // Al cambiar de servicio, el descuento elegido deja de tener contexto — se limpia para evitar previews inconsistentes
  useEffect(() => {
    setForm((f) => (f.descuentoId ? { ...f, descuentoId: '' } : f));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.servicioId]);

  const handleClienteChange = (val: string) => {
    setForm((f) => ({ ...f, clienteId: val, expedienteId: expedienteContext ? f.expedienteId : '' }));
  };

  const mutation = useMutation({
    mutationFn: (data: any) => pagosApi.create(data),
    onSuccess: () => {
      toast.success('Cobro registrado');
      onSuccess();
    },
    onError: (err: any) => setError(getErrorMessage(err, 'Error al registrar el cobro')),
  });

  const preview = (() => {
    if (!servicioSeleccionado) return null;
    const costo = Number(servicioSeleccionado.costo);
    if (!descuentoSeleccionado) return { costo, montoDescuento: 0, total: costo };
    const val = Number(descuentoSeleccionado.valor);
    const montoDescuento = descuentoSeleccionado.tipo === 'porcentaje'
      ? Math.round(costo * val / 100 * 100) / 100
      : Math.min(val, costo);
    return { costo, montoDescuento, total: costo - montoDescuento };
  })();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.clienteId) { setError('Debes seleccionar el cliente al que se le registra el cobro'); return; }
    if (!form.servicioId) { setError('Debes seleccionar el servicio que se está cobrando'); return; }

    const payload = {
      clienteId: +form.clienteId,
      servicioId: +form.servicioId,
      expedienteId: form.expedienteId ? +form.expedienteId : undefined,
      descuentoId: form.descuentoId ? +form.descuentoId : undefined,
      concepto: form.concepto || undefined,
      fechaVencimiento: form.fechaVencimiento || undefined,
      notas: form.notas || undefined,
    };

    const nombreCliente = clienteSeleccionado ? `${clienteSeleccionado.nombre} ${clienteSeleccionado.apellido}` : 'el cliente';
    askConfirm({
      title: 'Registrar cobro',
      message: `Vas a registrar un adeudo de ${preview ? `$${preview.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}` : '—'} a nombre de ${nombreCliente} por "${form.concepto || servicioSeleccionado?.nombre}".${expedienteContext ? ` Se sumará al expediente ${expedienteContext.numero}.` : ''}\n\n¿Confirmar el registro?`,
      confirmLabel: 'Registrar cobro',
      onConfirm: () => mutation.mutate(payload),
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CreditCard size={18} style={{ color: 'var(--accent-400)' }} />
            {expedienteContext ? `Agregar Servicio al Expediente ${expedienteContext.numero}` : 'Registrar Cobro'}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <ModalErrorBanner message={error} />
            <div className="form-grid-2">

              {/* CLIENTE */}
              <div className="form-group">
                <label className="form-label">Cliente *</label>
                <select id="pago-cliente" className="form-select" required value={form.clienteId} autoFocus
                  disabled={expedienteContext && expedienteContext.clientes.length === 1}
                  onChange={(e) => handleClienteChange(e.target.value)}>
                  <option value="">Seleccionar cliente...</option>
                  {clientesDisponibles.map((c: any) =>
                    <option key={c.id} value={c.id}>{c.nombre} {c.apellido}</option>
                  )}
                </select>
              </div>

              {/* SERVICIO */}
              <div className="form-group">
                <label className="form-label">Servicio *</label>
                <select id="pago-servicio" className="form-select" required value={form.servicioId}
                  onChange={(e) => setForm(f => ({ ...f, servicioId: e.target.value }))}>
                  <option value="">Seleccionar servicio...</option>
                  {servicios?.map((s: any) =>
                    <option key={s.id} value={s.id}>
                      {s.nombre} — ${Number(s.costo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </option>
                  )}
                </select>
              </div>

              {/* Costo del servicio — solo lectura */}
              {servicioSeleccionado && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <div style={{
                    background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.25)',
                    borderRadius: 'var(--radius-md)', padding: 'var(--sp-3) var(--sp-4)',
                    display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                  }}>
                    <Receipt size={18} style={{ color: 'var(--success)' }} />
                    <div>
                      <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{servicioSeleccionado.nombre}</div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--success)' }}>
                        ${Number(servicioSeleccionado.costo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                      </div>
                      {servicioSeleccionado.descripcion && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{servicioSeleccionado.descripcion}</div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* DESCUENTO — solo si hay servicio seleccionado; un único descuento por cobro */}
              {servicioSeleccionado && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <Tag size={14} /> Descuento <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional — solo se puede aplicar uno por cobro)</span>
                  </label>
                  <select id="pago-descuento" className="form-select" value={form.descuentoId}
                    onChange={(e) => setForm(f => ({ ...f, descuentoId: e.target.value }))}>
                    <option value="">Sin descuento</option>
                    {descuentos?.map((d: any) => (
                      <option key={d.id} value={d.id}>
                        {d.nombre} — {d.tipo === 'porcentaje' ? `${Number(d.valor)}%` : `$${Number(d.valor).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`}
                      </option>
                    ))}
                  </select>

                  {preview && (
                    <div style={{
                      marginTop: 'var(--sp-2)', padding: 'var(--sp-3)',
                      background: preview.montoDescuento > 0 ? 'rgba(245,158,11,0.08)' : 'var(--bg-elevated)',
                      border: `1px solid ${preview.montoDescuento > 0 ? 'rgba(245,158,11,0.25)' : 'var(--border-subtle)'}`,
                      borderRadius: 'var(--radius-sm)', fontSize: '0.875rem',
                    }}>
                      {preview.montoDescuento > 0 && (
                        <>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-muted)' }}>
                            <span>Precio original</span>
                            <span>${preview.costo.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--warning)' }}>
                            <span>Descuento ({descuentoSeleccionado.nombre})</span>
                            <span>−${preview.montoDescuento.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </>
                      )}
                      <div style={{
                        display: 'flex', justifyContent: 'space-between', fontWeight: 700, color: 'var(--success)', fontSize: '1rem',
                        ...(preview.montoDescuento > 0 ? { borderTop: '1px solid rgba(245,158,11,0.2)', marginTop: 6, paddingTop: 6 } : {}),
                      }}>
                        <span>Total a cobrar</span>
                        <span>${preview.total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* EXPEDIENTE — fijo si venimos desde el detalle de un expediente; si no, opcional y elegible */}
              {expedienteContext ? (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} /> Expediente
                  </label>
                  <div style={{
                    padding: 'var(--sp-3) var(--sp-4)', background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)',
                    fontSize: '0.875rem', color: 'var(--text-secondary)',
                  }}>
                    {expedienteContext.numero}
                  </div>
                  <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                    Este cobro se sumará al costo total del expediente
                  </small>
                </div>
              ) : form.clienteId && (
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} /> Expediente asociado <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
                  </label>
                  <select id="pago-expediente" className="form-select" value={form.expedienteId}
                    onChange={(e) => setForm(f => ({ ...f, expedienteId: e.target.value }))}>
                    <option value="">Sin expediente</option>
                    {expedientesCliente?.items?.map((exp: any) =>
                      <option key={exp.id} value={exp.id}>
                        {exp.numero} — {exp.titulo}
                      </option>
                    )}
                  </select>
                  {form.expedienteId && (
                    <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                      Este cobro se sumará al costo total del expediente seleccionado
                    </small>
                  )}
                </div>
              )}

              {/* CONCEPTO */}
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Concepto <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional, se toma del servicio)</span></label>
                <input id="pago-concepto" type="text" className="form-input"
                  placeholder={servicioSeleccionado?.nombre || 'Ej: Honorarios, Consulta, Audiencia...'}
                  value={form.concepto}
                  onChange={(e) => setForm(f => ({ ...f, concepto: e.target.value }))} />
              </div>

              {/* VENCIMIENTO */}
              <div className="form-group">
                <label className="form-label">Fecha de vencimiento</label>
                <input id="pago-vencimiento" type="date" className="form-input" value={form.fechaVencimiento}
                  onChange={(e) => setForm(f => ({ ...f, fechaVencimiento: e.target.value }))} />
              </div>

              {/* NOTAS */}
              <div className="form-group">
                <label className="form-label">Notas</label>
                <input id="pago-notas" type="text" className="form-input" value={form.notas}
                  onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>

            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button id="pago-submit" type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />} Registrar cobro
            </button>
          </div>
        </form>
      </div>
      {confirmDialog}
    </div>
  );
}
