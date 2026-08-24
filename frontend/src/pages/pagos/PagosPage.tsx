import { Fragment, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, CreditCard, DollarSign, Tag, ChevronDown, ChevronRight, Receipt, Printer } from 'lucide-react';
import { pagosApi } from '../../api/pagos.api';
import Pagination from '../../components/Pagination';
import PagoModal from './PagoModal';
import AbonoModal from './AbonoModal';
import ReciboModal from './ReciboModal';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADO_COLORS: Record<string, string> = {
  pendiente: 'badge-warning', parcial: 'badge-info',
  pagado: 'badge-success', cancelado: 'badge-muted',
};
const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado', cancelado: 'Cancelado',
};

function money(v: any) {
  return `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
}

export default function PagosPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [abonoModal, setAbonoModal] = useState<any>(null);
  const [recibo, setRecibo] = useState<{ pago: any; abono: any } | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [pagina, setPagina] = useState(1);
  const [estadoFilter, setEstadoFilter] = useState('');
  const [desde, setDesde] = useState('');
  const [hasta, setHasta] = useState('');

  const { data: stats } = useQuery({ queryKey: ['pagos-stats'], queryFn: () => pagosApi.stats() });
  const { data, isLoading } = useQuery({
    queryKey: ['pagos', estadoFilter, desde, hasta, pagina],
    queryFn: () => pagosApi.list({ estado: estadoFilter || undefined, desde: desde || undefined, hasta: hasta || undefined, pagina, limite: 20 }),
  });

  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['pagos'] });
    qc.invalidateQueries({ queryKey: ['pagos-stats'] });
    qc.invalidateQueries({ queryKey: ['expedientes'] });
    qc.invalidateQueries({ queryKey: ['expediente'] });
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
          <div className="stat-value">{money(stats?.totalRecaudado)}</div>
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
        <div style={{ display: 'flex', gap: 'var(--sp-4)', flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-select" style={{ maxWidth: 200 }} value={estadoFilter}
            onChange={(e) => { setEstadoFilter(e.target.value); setPagina(1); }}>
            <option value="">Todos los estados</option>
            {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Desde</label>
            <input type="date" className="form-input" style={{ width: 155 }} value={desde}
              max={hasta || undefined}
              onChange={(e) => { setDesde(e.target.value); setPagina(1); }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
            <label style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Hasta</label>
            <input type="date" className="form-input" style={{ width: 155 }} value={hasta}
              min={desde || undefined}
              onChange={(e) => { setHasta(e.target.value); setPagina(1); }} />
          </div>
          {(estadoFilter || desde || hasta) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setEstadoFilter(''); setDesde(''); setHasta(''); setPagina(1); }}>
              Limpiar
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th></th>
              <th>Número</th>
              <th>Cliente</th>
              <th>Servicio / Concepto</th>
              <th>Descuento</th>
              <th>Total</th>
              <th>Pagado</th>
              <th>Pendiente</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={10} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
                <div className="spinner" />
              </td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={10}>
                <div className="empty-state">
                  <CreditCard size={40} style={{ opacity: 0.3 }} />
                  <h3>Sin cobros registrados</h3>
                  <p>Registra el primer cobro para empezar a llevar el control de pagos</p>
                  <button className="btn btn-primary" onClick={() => setModalOpen(true)}><Plus size={16} /> Registrar Cobro</button>
                </div>
              </td></tr>
            ) : data?.items?.map((p: any) => {
              const puedeAbonar = p.estado !== 'pagado' && p.estado !== 'cancelado';
              const expandido = expandedId === p.id;
              const tieneAbonos = (p.detalles?.length || 0) > 0;
              return (
                <Fragment key={p.id}>
                  <tr style={{ cursor: tieneAbonos ? 'pointer' : 'default' }}
                    onClick={() => tieneAbonos && setExpandedId(expandido ? null : p.id)}>
                    <td style={{ width: 28 }}>
                      {tieneAbonos && (expandido ? <ChevronDown size={14} style={{ color: 'var(--text-muted)' }} /> : <ChevronRight size={14} style={{ color: 'var(--text-muted)' }} />)}
                    </td>
                    <td><code style={{ fontSize: '0.8rem', color: 'var(--accent-400)' }}>{p.numero}</code></td>
                    <td style={{ fontSize: '0.875rem', fontWeight: 500 }}>
                      {p.cliente ? `${p.cliente.nombre} ${p.cliente.apellido}` : '—'}
                    </td>
                    <td style={{ fontSize: '0.875rem', maxWidth: 220 }}>{p.concepto || p.servicio?.nombre || '—'}</td>
                    <td>
                      {Number(p.montoDescuento) > 0 ? (
                        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: 'var(--warning)', fontWeight: 600, fontSize: '0.85rem' }}>
                          <Tag size={12} /> −{money(p.montoDescuento)}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{money(p.montoTotal)}</td>
                    <td style={{ color: 'var(--success)' }}>{money(p.montoPagado)}</td>
                    <td style={{ color: Number(p.montoPendiente) > 0 ? 'var(--warning)' : 'var(--text-muted)' }}>
                      {money(p.montoPendiente)}
                    </td>
                    <td><span className={`badge ${ESTADO_COLORS[p.estado] || 'badge-muted'}`}>{ESTADO_LABELS[p.estado] || p.estado}</span></td>
                    <td>
                      {puedeAbonar && (
                        <button className="btn btn-ghost btn-sm" onClick={(e) => { e.stopPropagation(); setAbonoModal(p); }}>
                          <Plus size={12} /> Abono
                        </button>
                      )}
                    </td>
                  </tr>
                  {expandido && tieneAbonos && (
                    <tr>
                      <td></td>
                      <td colSpan={9} style={{ padding: 0 }}>
                        <div style={{ background: 'var(--bg-elevated)', padding: 'var(--sp-3) var(--sp-4)', margin: '0 0 var(--sp-2)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Receipt size={12} /> Historial de abonos
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {[...p.detalles].reverse().map((d: any) => (
                              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', padding: '4px 0' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  {format(new Date(d.fechaPago), 'dd/MM/yyyy', { locale: es })}
                                  {d.metodoPago && ` • ${d.metodoPago}`}
                                  {d.referencia && ` • Ref: ${d.referencia}`}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>{money(d.monto)}</span>
                                  <button className="btn btn-ghost btn-icon btn-icon-sm" data-tooltip="Reimprimir recibo"
                                    onClick={(e) => { e.stopPropagation(); setRecibo({ pago: p, abono: d }); }}>
                                    <Printer size={13} />
                                  </button>
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination pagina={pagina} totalPaginas={data.totalPaginas} total={data.total} limite={data.limite} onChange={setPagina} />
      )}

      {modalOpen && (
        <PagoModal
          onClose={() => setModalOpen(false)}
          onSuccess={() => { setModalOpen(false); invalidateAll(); }}
        />
      )}

      {abonoModal && (
        <AbonoModal
          pago={abonoModal}
          onClose={() => setAbonoModal(null)}
          onSuccess={(pagoActualizado, abono) => {
            setAbonoModal(null);
            invalidateAll();
            setRecibo({ pago: pagoActualizado, abono });
          }}
        />
      )}

      {recibo && (
        <ReciboModal pago={recibo.pago} abono={recibo.abono} onClose={() => setRecibo(null)} />
      )}
    </div>
  );
}
