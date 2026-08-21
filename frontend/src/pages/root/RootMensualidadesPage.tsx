import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, CheckCircle2, Clock, AlertTriangle, Trash2, RefreshCw, Lock } from 'lucide-react';
import toast from 'react-hot-toast';
import { rootApi } from '../../api/root.api';
import { facturacionApi } from '../../api/facturacion.api';
import { formatFecha } from '../../utils/date';

const ESTADOS = ['pendiente', 'pagado', 'vencido'];
const ESTADO_STYLE: Record<string, { class: string; icon: any; label: string }> = {
  pagado:   { class: 'badge-success', icon: CheckCircle2, label: 'Pagado' },
  pendiente: { class: 'badge-info',    icon: Clock,         label: 'Pendiente' },
  vencido:  { class: 'badge-danger',  icon: AlertTriangle, label: 'Vencido' },
};

const METODOS_PAGO = ['Transferencia', 'Depósito', 'Efectivo', 'Otro'];

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];
const formatPeriodo = (mes: number, anio: number) => `${MESES[mes - 1]} ${anio}`;

function RegistrarCobroModal({ mensualidad, onClose, onSuccess }: any) {
  const [form, setForm] = useState({
    fechaPago: new Date().toISOString().split('T')[0],
    metodoPago: METODOS_PAGO[0],
    referencia: '',
  });
  const set = (f: string) => (e: any) => setForm(p => ({ ...p, [f]: e.target.value }));

  const mutation = useMutation({
    mutationFn: () => rootApi.updateMensualidad(mensualidad.id, { estado: 'pagado', ...form }),
    onSuccess: () => { toast.success('Cobro registrado — despacho desbloqueado'); onSuccess(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al registrar cobro'),
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Registrar Cobro</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={e => { e.preventDefault(); mutation.mutate(); }}>
          <div className="modal-body">
            <p style={{ marginBottom: 'var(--sp-3)', fontSize: '0.875rem' }}>
              Monto: <strong>${Number(mensualidad.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>
            </p>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Fecha de pago *</label>
                <input className="form-input" type="date" required value={form.fechaPago} onChange={set('fechaPago')} />
              </div>
              <div className="form-group">
                <label className="form-label">Método de pago *</label>
                <select className="form-select" required value={form.metodoPago} onChange={set('metodoPago')}>
                  {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Referencia / Folio</label>
                <input className="form-input" value={form.referencia} onChange={set('referencia')} placeholder="Folio de transferencia, ficha de depósito..." />
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />} Registrar Cobro
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ConfirmarBorrarModal({ mensualidad, despachoNombre, onClose, onConfirm, isPending }: any) {
  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3>Eliminar Mensualidad</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <p>
            ¿Seguro que quieres eliminar la mensualidad de <strong>{despachoNombre}</strong> por{' '}
            <strong>${Number(mensualidad.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</strong>?
          </p>
          <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 'var(--sp-2)' }}>
            Esta acción no se puede deshacer.
          </p>
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button type="button" className="btn btn-danger" onClick={onConfirm} disabled={isPending}>
            {isPending && <Loader2 size={16} className="spinning" />} Sí, eliminar
          </button>
        </div>
      </div>
    </div>
  );
}

function NuevaMensualidadModal({ despachos, onClose, onSuccess }: any) {
  const [despachoId, setDespachoId] = useState('');
  const [periodos, setPeriodos] = useState(1);
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0]);
  const [metodoPago, setMetodoPago] = useState(METODOS_PAGO[0]);
  const [referencia, setReferencia] = useState('');

  // Fallback manual para despachos sin plan asignado
  const [manual, setManual] = useState({ monto: '', fechaVencimiento: '', estado: 'pendiente', notas: '' });
  const setManualField = (f: string) => (e: any) => setManual(p => ({ ...p, [f]: e.target.value }));

  const handleDespachoChange = (e: any) => {
    setDespachoId(e.target.value);
    setPeriodos(1);
  };

  const despachoSeleccionado = despachos?.find((d: any) => String(d.id) === despachoId);
  const tienePlan = !!despachoSeleccionado && (!!despachoSeleccionado.planId || Number(despachoSeleccionado.planMensual) > 0);

  const { data: estadoPagos } = useQuery({
    queryKey: ['estado-pagos', despachoId],
    queryFn: () => rootApi.estadoPagos(+despachoId),
    enabled: !!despachoId && tienePlan,
  });

  // Simula qué periodos cubrirían los N solicitados: primero pendientes existentes, luego nuevos
  const preview: { mes: number; anio: number; monto: number; esNuevo: boolean }[] = [];
  if (estadoPagos) {
    let restantes = periodos;
    for (const p of estadoPagos.pendientes) {
      if (restantes <= 0) break;
      preview.push({ mes: p.periodoMes, anio: p.periodoAnio, monto: Number(p.monto), esNuevo: false });
      restantes--;
    }
    let { mes, anio } = estadoPagos.siguientePeriodoNuevo;
    while (restantes > 0) {
      preview.push({ mes, anio, monto: Number(estadoPagos.monto), esNuevo: true });
      restantes--;
      mes++;
      if (mes > 12) { mes = 1; anio++; }
    }
  }
  const total = preview.reduce((acc, p) => acc + p.monto, 0);

  const mutationPeriodos = useMutation({
    mutationFn: () => rootApi.pagarPeriodos(+despachoId, { periodos, fechaPago, metodoPago, referencia }),
    onSuccess: (r) => { toast.success(`${r.periodosPagados} periodo(s) registrado(s)`); onSuccess(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al registrar el pago'),
  });

  const mutationManual = useMutation({
    mutationFn: () => rootApi.createMensualidad({
      despachoId: +despachoId, monto: +manual.monto, fechaVencimiento: manual.fechaVencimiento,
      fechaPago, estado: manual.estado, metodoPago, referencia, notas: manual.notas,
    }),
    onSuccess: () => { toast.success('Mensualidad registrada'); onSuccess(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al registrar'),
  });

  const isPending = mutationPeriodos.isPending || mutationManual.isPending;
  const handleSubmit = (e: any) => {
    e.preventDefault();
    if (tienePlan) mutationPeriodos.mutate(); else mutationManual.mutate();
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal modal-lg">
        <div className="modal-header">
          <h3>Registrar Mensualidad</h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-grid-2">
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Despacho *</label>
                <select className="form-select" required value={despachoId} onChange={handleDespachoChange}>
                  <option value="">Seleccionar despacho...</option>
                  {despachos?.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
                </select>
              </div>
            </div>

            {despachoSeleccionado && tienePlan && (
              <>
                <div style={{
                  background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)', padding: 'var(--sp-3)', marginTop: 'var(--sp-3)', fontSize: '0.85rem',
                }}>
                  <div>
                    Último periodo pagado:{' '}
                    <strong>
                      {estadoPagos?.ultimoPagado
                        ? formatPeriodo(estadoPagos.ultimoPagado.periodoMes, estadoPagos.ultimoPagado.periodoAnio)
                        : 'Sin pagos registrados'}
                    </strong>
                  </div>
                  {estadoPagos?.pendientes?.length > 0 && (
                    <div style={{ color: 'var(--warning)', marginTop: 4 }}>
                      Periodos pendientes sin pagar: {estadoPagos.pendientes.map((p: any) => formatPeriodo(p.periodoMes, p.periodoAnio)).join(', ')}
                    </div>
                  )}
                </div>

                <div className="form-grid-2" style={{ marginTop: 'var(--sp-3)' }}>
                  <div className="form-group">
                    <label className="form-label">Periodos a cubrir *</label>
                    <input className="form-input" type="number" min={1} required value={periodos}
                      onChange={e => setPeriodos(Math.max(1, +e.target.value || 1))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha de pago *</label>
                    <input className="form-input" type="date" required value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Método de pago *</label>
                    <select className="form-select" required value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                      {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Referencia / Folio</label>
                    <input className="form-input" value={referencia} onChange={e => setReferencia(e.target.value)}
                      placeholder="Folio de transferencia, ficha de depósito..." />
                  </div>
                </div>

                {preview.length > 0 && (
                  <div style={{ marginTop: 'var(--sp-3)' }}>
                    <p className="form-label" style={{ marginBottom: 6 }}>Se va a registrar:</p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {preview.map((p, i) => (
                        <span key={i} className={`badge ${p.esNuevo ? 'badge-accent' : 'badge-info'}`}>
                          {formatPeriodo(p.mes, p.anio)} · ${p.monto.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          {!p.esNuevo && ' (pendiente existente)'}
                        </span>
                      ))}
                    </div>
                    <p style={{ marginTop: 8, fontWeight: 700 }}>
                      Total: ${total.toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                )}
              </>
            )}

            {despachoSeleccionado && !tienePlan && (
              <div className="form-grid-2" style={{ marginTop: 'var(--sp-3)' }}>
                <p style={{ gridColumn: '1 / -1', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Este despacho no tiene un plan asignado — completa los datos manualmente.
                </p>
                <div className="form-group">
                  <label className="form-label">Monto ($) *</label>
                  <input className="form-input" type="number" step="0.01" required value={manual.monto} onChange={setManualField('monto')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Estado *</label>
                  <select className="form-select" required value={manual.estado} onChange={setManualField('estado')}>
                    {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_STYLE[e].label}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Pago</label>
                  <input className="form-input" type="date" value={fechaPago} onChange={e => setFechaPago(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Vencimiento *</label>
                  <input className="form-input" type="date" required value={manual.fechaVencimiento} onChange={setManualField('fechaVencimiento')} />
                </div>
                <div className="form-group">
                  <label className="form-label">Método de Pago</label>
                  <select className="form-select" value={metodoPago} onChange={e => setMetodoPago(e.target.value)}>
                    {METODOS_PAGO.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Referencia / Folio</label>
                  <input className="form-input" value={referencia} onChange={e => setReferencia(e.target.value)} />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Notas</label>
                  <textarea className="form-textarea" rows={2} value={manual.notas} onChange={setManualField('notas')} />
                </div>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button type="submit" className="btn btn-primary" disabled={isPending || !despachoId}>
              {isPending && <Loader2 size={16} className="spinning" />} Registrar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function RootMensualidadesPage() {
  const qc = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [cobroModal, setCobroModal] = useState<any>(null);
  const [borrarModal, setBorrarModal] = useState<any>(null);
  const [filtroDespacho, setFiltroDespacho] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');

  const { data: mensualidadesRaw, isLoading } = useQuery({
    queryKey: ['root-mensualidades', filtroDespacho, filtroEstado],
    queryFn: () => rootApi.mensualidades({
      despachoId: filtroDespacho || undefined,
      estado: filtroEstado === 'adeudo' ? undefined : (filtroEstado || undefined),
    }),
  });
  const mensualidades = filtroEstado === 'adeudo'
    ? mensualidadesRaw?.filter((m: any) => m.estado !== 'pagado')
    : mensualidadesRaw;

  const { data: despachos } = useQuery({
    queryKey: ['root-despachos'],
    queryFn: rootApi.despachos,
  });

  const generarAdeudosM = useMutation({
    mutationFn: facturacionApi.generarAdeudos,
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['root-mensualidades'] }); toast.success(`${r.generados} adeudos generados, ${r.omitidos} omitidos (${r.periodo})`); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al generar adeudos'),
  });

  const bloquearMorososM = useMutation({
    mutationFn: facturacionApi.bloquearMorosos,
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ['root-mensualidades'] }); qc.invalidateQueries({ queryKey: ['root-despachos'] }); toast.success(`${r.bloqueados} despachos bloqueados de ${r.revisados} revisados`); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al bloquear morosos'),
  });

  const marcarVencidaM = useMutation({
    mutationFn: (id: number) => rootApi.updateMensualidad(id, { estado: 'vencido' }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['root-mensualidades'] }); toast.success('Marcada como vencida'); },
  });

  const deleteM = useMutation({
    mutationFn: rootApi.deleteMensualidad,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['root-mensualidades'] });
      toast.success('Mensualidad eliminada');
      setBorrarModal(null);
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al eliminar'),
  });

  const despachoNombre = (id: number) => despachos?.find((d: any) => d.id === id)?.nombre || `Despacho #${id}`;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mensualidades</h1>
          <p className="page-subtitle">Registro de pagos y suscripciones por despacho</p>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
          <button className="btn btn-secondary" onClick={() => generarAdeudosM.mutate()} disabled={generarAdeudosM.isPending}
            data-tooltip="Normalmente se ejecuta solo el día 1 de cada mes">
            {generarAdeudosM.isPending ? <Loader2 size={16} className="spinning" /> : <RefreshCw size={16} />} Generar adeudos del mes
          </button>
          <button className="btn btn-secondary" onClick={() => bloquearMorososM.mutate()} disabled={bloquearMorososM.isPending}
            data-tooltip="Normalmente se ejecuta solo cada noche">
            {bloquearMorososM.isPending ? <Loader2 size={16} className="spinning" /> : <Lock size={16} />} Bloquear morosos
          </button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} /> Registrar Pago
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap' }}>
          <select className="form-select" style={{ minWidth: 220 }} value={filtroDespacho}
            onChange={e => setFiltroDespacho(e.target.value)}>
            <option value="">Todos los despachos</option>
            {despachos?.map((d: any) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
          </select>
          <select className="form-select" style={{ minWidth: 160 }} value={filtroEstado}
            onChange={e => setFiltroEstado(e.target.value)}>
            <option value="">Todos los estados</option>
            <option value="adeudo">Con adeudo (pendiente + vencido)</option>
            {ESTADOS.map(e => <option key={e} value={e}>{ESTADO_STYLE[e].label}</option>)}
          </select>
          {(filtroDespacho || filtroEstado) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setFiltroDespacho(''); setFiltroEstado(''); }}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      <div className="card">
        <div className="table-container">
          <table className="table">
            <thead>
              <tr>
                <th>Despacho</th>
                <th>Monto</th>
                <th>Vencimiento</th>
                <th>Fecha Pago</th>
                <th>Método</th>
                <th>Referencia</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={8} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}><div className="spinner" /></td></tr>}
              {mensualidades?.map((m: any) => {
                const est = ESTADO_STYLE[m.estado] || ESTADO_STYLE.pendiente;
                const Icon = est.icon;
                return (
                  <tr key={m.id}>
                    <td style={{ fontWeight: 500 }}>{despachoNombre(m.despachoId)}</td>
                    <td style={{ fontWeight: 700, color: '#10b981' }}>
                      ${Number(m.monto).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </td>
                    <td>{formatFecha(m.fechaVencimiento)}</td>
                    <td>{m.fechaPago ? formatFecha(m.fechaPago) : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                    <td style={{ fontSize: '0.82rem' }}>{m.metodoPago || '—'}</td>
                    <td style={{ fontSize: '0.82rem' }}>{m.referencia || '—'}</td>
                    <td>
                      <span className={`badge ${est.class}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Icon size={11} /> {est.label}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                        {m.estado !== 'pagado' && (
                          <button className="btn btn-success btn-sm"
                            onClick={() => setCobroModal(m)}>
                            Registrar cobro
                          </button>
                        )}
                        {m.estado === 'pendiente' && (
                          <button className="btn btn-secondary btn-sm"
                            onClick={() => marcarVencidaM.mutate(m.id)}
                            disabled={marcarVencidaM.isPending}>
                            Vencer
                          </button>
                        )}
                        <button className="btn btn-ghost btn-icon btn-icon-sm"
                          style={{ color: 'var(--danger)' }}
                          onClick={() => setBorrarModal(m)}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!isLoading && !mensualidades?.length && (
                <tr><td colSpan={8} style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 'var(--sp-8)' }}>
                  Sin mensualidades registradas
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <NuevaMensualidadModal
          despachos={despachos}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
            qc.invalidateQueries({ queryKey: ['root-mensualidades'] });
            qc.invalidateQueries({ queryKey: ['root-despachos'] });
          }}
        />
      )}
      {cobroModal && (
        <RegistrarCobroModal
          mensualidad={cobroModal}
          onClose={() => setCobroModal(null)}
          onSuccess={() => {
            setCobroModal(null);
            qc.invalidateQueries({ queryKey: ['root-mensualidades'] });
            qc.invalidateQueries({ queryKey: ['root-despachos'] });
          }}
        />
      )}
      {borrarModal && (
        <ConfirmarBorrarModal
          mensualidad={borrarModal}
          despachoNombre={despachoNombre(borrarModal.despachoId)}
          onClose={() => setBorrarModal(null)}
          onConfirm={() => deleteM.mutate(borrarModal.id)}
          isPending={deleteM.isPending}
        />
      )}
    </div>
  );
}
