import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, X, Loader2, CreditCard, DollarSign, FileText, Receipt } from 'lucide-react';
import toast from 'react-hot-toast';
import { pagosApi } from '../../api/pagos.api';
import { clientesApi } from '../../api/clientes.api';
import { catalogosApi } from '../../api/catalogos.api';
import { expedientesApi } from '../../api/expedientes.api';

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'badge-warning', parcial: 'badge-info',
  pagado: 'badge-success', cancelado: 'badge-muted',
};

const FORM_INIT = {
  clienteId: '', expedienteId: '', servicioId: '',
  concepto: '', fechaVencimiento: '', notas: '',
};

export default function PagosPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [abonoModal, setAbonoModal] = useState<any>(null);
  const [pagina, setPagina] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [form, setForm] = useState(FORM_INIT);
  const [servicioSeleccionado, setServicioSeleccionado] = useState<any>(null);
  const [abonoForm, setAbonoForm] = useState({
    monto: '', fechaPago: new Date().toISOString().split('T')[0],
    metodoPago: 'Efectivo', referencia: '',
  });

  const { data: stats } = useQuery({ queryKey: ['pagos-stats'], queryFn: () => pagosApi.stats() });
  const { data } = useQuery({
    queryKey: ['pagos', estadoFilter, pagina],
    queryFn: () => pagosApi.list({ estado: estadoFilter || undefined, pagina, limite: 20 }),
  });
  const { data: clientes } = useQuery({
    queryKey: ['clientes-list'],
    queryFn: () => clientesApi.list({ limite: 200 }),
  });
  const { data: servicios } = useQuery({
    queryKey: ['servicios-list'],
    queryFn: () => catalogosApi.servicios(),
  });
  // Expedientes del cliente seleccionado — solo los asociados a él
  const { data: expedientesCliente } = useQuery({
    queryKey: ['expedientes-cliente', form.clienteId],
    queryFn: () => expedientesApi.list({ clienteId: form.clienteId, limite: 100 }),
    enabled: !!form.clienteId,
  });

  // Cuando cambia el servicio seleccionado, actualizar objeto para mostrar costo
  useEffect(() => {
    if (form.servicioId) {
      const s = servicios?.find((sv: any) => sv.id === +form.servicioId);
      setServicioSeleccionado(s || null);
    } else {
      setServicioSeleccionado(null);
    }
  }, [form.servicioId, servicios]);

  // Al cambiar cliente, limpiar expediente
  const handleClienteChange = (val: string) => {
    setForm(f => ({ ...f, clienteId: val, expedienteId: '' }));
  };

  const resetModal = () => {
    setForm(FORM_INIT);
    setServicioSeleccionado(null);
    setModalOpen(false);
  };

  const createM = useMutation({
    mutationFn: pagosApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos'] });
      qc.invalidateQueries({ queryKey: ['pagos-stats'] });
      qc.invalidateQueries({ queryKey: ['expedientes'] });
      resetModal();
      toast.success('Cobro registrado');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al registrar cobro'),
  });

  const abonoM = useMutation({
    mutationFn: ({ id, data }: any) => pagosApi.registrarAbono(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['pagos'] });
      qc.invalidateQueries({ queryKey: ['pagos-stats'] });
      setAbonoModal(null);
      toast.success('Abono registrado');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createM.mutate({
      clienteId: +form.clienteId,
      servicioId: +form.servicioId,
      expedienteId: form.expedienteId ? +form.expedienteId : undefined,
      concepto: form.concepto || servicioSeleccionado?.nombre,
      fechaVencimiento: form.fechaVencimiento || undefined,
      notas: form.notas || undefined,
    });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Pagos</h1>
          <p className="page-subtitle">Gestión de cobros y comprobantes</p>
        </div>
        <button id="nuevo-pago-btn" className="btn btn-primary" onClick={() => setModalOpen(true)}>
          <Plus size={16} /> Registrar Cobro
        </button>
      </div>

      {/* Stats */}
      <div className="clientes-stats">
        <div className="stat-card" style={{ '--gradient': '#10b981' } as any}>
          <div className="stat-icon" style={{ background: '#10b98122', color: '#10b981' }}><DollarSign size={20} /></div>
          <div className="stat-value">${Number(stats?.totalRecaudado || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</div>
          <div className="stat-label">Total Recaudado</div>
        </div>
        <div className="stat-card" style={{ '--gradient': '#6366f1' } as any}>
          <div className="stat-icon" style={{ background: '#6366f122', color: '#6366f1' }}><CreditCard size={20} /></div>
          <div className="stat-value">{stats?.totalPagos || 0}</div>
          <div className="stat-label">Total de Cobros</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <select className="form-select" style={{ maxWidth: 200 }} value={estadoFilter}
          onChange={(e) => { setEstadoFilter(e.target.value); setPagina(1); }}>
          <option value="">Todos los estados</option>
          {['pendiente', 'parcial', 'pagado', 'cancelado'].map(s =>
            <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
          )}
        </select>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Número</th>
              <th>Cliente ID</th>
              <th>Servicio / Concepto</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Pendiente</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {data?.items?.length === 0 ? (
              <tr><td colSpan={8}>
                <div className="empty-state">
                  <CreditCard size={40} style={{ opacity: 0.3 }} />
                  <h3>Sin cobros registrados</h3>
                  <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Registrar Cobro</button>
                </div>
              </td></tr>
            ) : data?.items?.map((p: any) => (
              <tr key={p.id}>
                <td><code style={{ fontSize: '0.8rem', color: 'var(--accent-400)' }}>{p.numero}</code></td>
                <td style={{ fontSize: '0.875rem' }}>{p.clienteId}</td>
                <td style={{ fontSize: '0.875rem', maxWidth: 200 }}>{p.concepto || '—'}</td>
                <td style={{ fontWeight: 600 }}>${Number(p.montoTotal).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td style={{ color: 'var(--success)' }}>${Number(p.montoPagado).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</td>
                <td style={{ color: Number(p.montoPendiente) > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                  ${Number(p.montoPendiente).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </td>
                <td><span className={`badge ${ESTADO_COLORS[p.estado] || 'badge-muted'}`}>{p.estado}</span></td>
                <td>
                  {p.estado !== 'pagado' && p.estado !== 'cancelado' && (
                    <button className="btn btn-ghost btn-sm" onClick={() => setAbonoModal(p)}>
                      <Plus size={12} /> Abono
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Registrar Cobro Modal ── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && resetModal()}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Registrar Cobro</h3>
              <button className="btn btn-ghost btn-icon" onClick={resetModal}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">

                  {/* CLIENTE */}
                  <div className="form-group">
                    <label className="form-label">Cliente *</label>
                    <select id="pago-cliente" className="form-select" required value={form.clienteId}
                      onChange={(e) => handleClienteChange(e.target.value)}>
                      <option value="">Seleccionar cliente...</option>
                      {clientes?.items?.map((c: any) =>
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
                        background: 'var(--success-bg, #10b98115)',
                        border: '1px solid #10b98133',
                        borderRadius: 'var(--radius)',
                        padding: 'var(--sp-3) var(--sp-4)',
                        display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
                      }}>
                        <Receipt size={18} style={{ color: '#10b981' }} />
                        <div>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{servicioSeleccionado.nombre}</div>
                          <div style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10b981' }}>
                            ${Number(servicioSeleccionado.costo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                          </div>
                          {servicioSeleccionado.descripcion && (
                            <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{servicioSeleccionado.descripcion}</div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* EXPEDIENTE — solo si hay cliente seleccionado */}
                  {form.clienteId && (
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
                          ✅ Este cobro se sumará al costo total del expediente seleccionado
                        </small>
                      )}
                    </div>
                  )}

                  {/* CONCEPTO */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Concepto <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional, se toma del servicio)</span></label>
                    <input id="pago-concepto" type="text" className="form-input"
                      placeholder={servicioSeleccionado?.nombre || 'Ej: Consulta jurídica inicial'}
                      value={form.concepto}
                      onChange={(e) => setForm(f => ({ ...f, concepto: e.target.value }))} />
                  </div>

                  {/* VENCIMIENTO */}
                  <div className="form-group">
                    <label className="form-label">Fecha de Vencimiento</label>
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
                <button type="button" className="btn btn-secondary" onClick={resetModal}>Cancelar</button>
                <button id="pago-submit" type="submit" className="btn btn-primary" disabled={createM.isPending}>
                  {createM.isPending && <Loader2 size={16} className="spinning" />} Registrar Cobro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Abono Modal ── */}
      {abonoModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setAbonoModal(null)}>
          <div className="modal">
            <div className="modal-header">
              <h3>Registrar Abono — {abonoModal.numero}</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setAbonoModal(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)' }}>
                Pendiente: <strong style={{ color: 'var(--warning)' }}>
                  ${Number(abonoModal.montoPendiente).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                </strong>
              </p>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Monto del Abono *</label>
                  <input id="abono-monto" type="number" step="0.01" className="form-input" required value={abonoForm.monto}
                    onChange={(e) => setAbonoForm(f => ({ ...f, monto: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha de Pago</label>
                  <input id="abono-fecha" type="date" className="form-input" value={abonoForm.fechaPago}
                    onChange={(e) => setAbonoForm(f => ({ ...f, fechaPago: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Método de Pago</label>
                  <select id="abono-metodo" className="form-select" value={abonoForm.metodoPago}
                    onChange={(e) => setAbonoForm(f => ({ ...f, metodoPago: e.target.value }))}>
                    {['Efectivo', 'Transferencia bancaria', 'Tarjeta de crédito', 'Tarjeta de débito', 'Cheque', 'Otro'].map(m =>
                      <option key={m}>{m}</option>
                    )}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Referencia</label>
                  <input id="abono-ref" type="text" className="form-input" value={abonoForm.referencia}
                    onChange={(e) => setAbonoForm(f => ({ ...f, referencia: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setAbonoModal(null)}>Cancelar</button>
              <button id="abono-submit" className="btn btn-primary"
                onClick={() => abonoM.mutate({ id: abonoModal.id, data: { ...abonoForm, monto: +abonoForm.monto } })}
                disabled={abonoM.isPending}>
                {abonoM.isPending && <Loader2 size={16} className="spinning" />} Registrar Abono
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
