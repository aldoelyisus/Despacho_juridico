import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft, Upload, MessageSquare, Calendar, File, FileText, FileSpreadsheet, Image as ImageIcon,
  Send, Loader2, Pencil, Users, Briefcase, FolderOpen, Tag, BadgeDollarSign, CalendarDays, StickyNote,
  Plus, Printer, ChevronDown, ChevronRight, Receipt, CreditCard,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { expedientesApi } from '../../api/expedientes.api';
import { pagosApi } from '../../api/pagos.api';
import { getErrorMessage } from '../../utils/errors';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import ExpedienteModal from './ExpedienteModal';
import PagoModal from '../pagos/PagoModal';
import AbonoModal from '../pagos/AbonoModal';
import ReciboModal from '../pagos/ReciboModal';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

const ESTADO_COLORS: Record<string, string> = {
  consulta: 'badge-accent', activo: 'badge-info', ganado: 'badge-success',
  perdido: 'badge-danger', suspendido: 'badge-warning', cancelado: 'badge-muted',
};

const ESTADO_LABELS: Record<string, string> = {
  consulta: 'Consulta', activo: 'Activo', ganado: 'Ganado',
  perdido: 'Perdido', suspendido: 'Suspendido', cancelado: 'Cancelado',
};

// Espeja el grafo de transiciones que valida el backend, para no ofrecer saltos que igual serían rechazados
const TRANSICIONES_ESTADO: Record<string, string[]> = {
  consulta: ['activo', 'cancelado'],
  activo: ['ganado', 'perdido', 'suspendido', 'cancelado'],
  suspendido: ['activo', 'cancelado'],
  ganado: [],
  perdido: [],
  cancelado: [],
};

const PAGO_ESTADO_COLORS: Record<string, string> = {
  pendiente: 'badge-warning', parcial: 'badge-info',
  pagado: 'badge-success', cancelado: 'badge-muted',
};
const PAGO_ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', parcial: 'Parcial', pagado: 'Pagado', cancelado: 'Cancelado',
};

function money(v: any) {
  return `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
}

function formatBytes(bytes?: number) {
  if (!bytes) return '';
  const units = ['B', 'KB', 'MB', 'GB'];
  let n = bytes, i = 0;
  while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(n < 10 && i > 0 ? 1 : 0)} ${units[i]}`;
}

function FileIcon({ tipo }: { tipo?: string }) {
  const style = { flexShrink: 0 } as const;
  if (tipo?.startsWith('image/')) return <ImageIcon size={18} style={{ ...style, color: '#8b5cf6' }} />;
  if (tipo?.includes('spreadsheet') || tipo?.includes('excel') || tipo?.includes('csv')) return <FileSpreadsheet size={18} style={{ ...style, color: '#10b981' }} />;
  if (tipo?.includes('pdf') || tipo?.includes('word') || tipo?.includes('document')) return <FileText size={18} style={{ ...style, color: 'var(--accent-400)' }} />;
  return <File size={18} style={{ ...style, color: 'var(--accent-400)' }} />;
}

// ── Ficha lateral con el contexto del caso, visible sin importar la pestaña activa ──
function SidebarInfo({ exp }: { exp: any }) {
  const row = { display: 'flex', justifyContent: 'space-between', gap: 'var(--sp-3)', padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.8125rem' };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
      <div className="card">
        <h3 style={{ marginBottom: 'var(--sp-3)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <BadgeDollarSign size={15} style={{ color: 'var(--success)' }} /> Costo total
        </h3>
        <div style={{ fontWeight: 700, fontSize: '1.5rem', color: 'var(--success)' }}>
          {money(exp.montoTotal)}
        </div>
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 'var(--sp-3)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Users size={15} style={{ color: '#6366f1' }} /> Clientes
        </h3>
        {exp.clientes?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {exp.clientes.map((c: any) => (
              <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div className="avatar avatar-sm">{c.nombre[0]}{c.apellido?.[0]}</div>
                <div style={{ fontSize: '0.8125rem' }}>{c.nombre} {c.apellido}</div>
              </div>
            ))}
          </div>
        ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Sin clientes asociados</p>}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 'var(--sp-3)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <Briefcase size={15} style={{ color: '#f59e0b' }} /> Colaboradores
        </h3>
        {exp.colaboradores?.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {exp.colaboradores.map((u: any) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                <div className="avatar avatar-sm">{u.nombre[0]}{u.apellido?.[0]}</div>
                <div style={{ fontSize: '0.8125rem' }}>{u.nombre} {u.apellido}</div>
              </div>
            ))}
          </div>
        ) : <p style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>Sin colaboradores asignados</p>}
      </div>

      <div className="card">
        <h3 style={{ marginBottom: 'var(--sp-2)', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: 6 }}>
          <FolderOpen size={15} style={{ color: 'var(--accent-400)' }} /> Detalles
        </h3>
        <div style={row}><span style={{ color: 'var(--text-muted)' }}>Número</span><span>{exp.numero}</span></div>
        {exp.area && (
          <div style={row}>
            <span style={{ color: 'var(--text-muted)' }}>Área</span>
            <span style={{ textAlign: 'right' }}>{exp.area.nombre}{exp.subarea ? ` › ${exp.subarea.nombre}` : ''}</span>
          </div>
        )}
        <div style={row}><span style={{ color: 'var(--text-muted)' }}>Inicio</span><span>{exp.fechaInicio ? format(new Date(exp.fechaInicio), 'dd/MM/yyyy') : '—'}</span></div>
        <div style={{ ...row, borderBottom: 'none' }}><span style={{ color: 'var(--text-muted)' }}>Cierre</span><span>{exp.fechaCierre ? format(new Date(exp.fechaCierre), 'dd/MM/yyyy') : '—'}</span></div>
      </div>
    </div>
  );
}

export default function ExpedienteDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('info');
  const [observacion, setObservacion] = useState('');
  const [nuevoEvento, setNuevoEvento] = useState({ titulo: '', descripcion: '', fechaInicio: '', fechaFin: '' });
  const [showEventForm, setShowEventForm] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [pagoModalOpen, setPagoModalOpen] = useState(false);
  const [abonoModal, setAbonoModal] = useState<any>(null);
  const [recibo, setRecibo] = useState<{ pago: any; abono: any } | null>(null);
  const [expandedPagoId, setExpandedPagoId] = useState<number | null>(null);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const { data: exp, isLoading } = useQuery({
    queryKey: ['expediente', id],
    queryFn: () => expedientesApi.get(+id!),
  });

  const { data: pagosExpediente } = useQuery({
    queryKey: ['pagos-expediente', id],
    queryFn: () => pagosApi.list({ expedienteId: id, limite: 100 }),
    enabled: !!id,
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['expediente', id] });
  const invalidatePagos = () => {
    qc.invalidateQueries({ queryKey: ['pagos-expediente', id] });
    qc.invalidateQueries({ queryKey: ['expediente', id] });
    qc.invalidateQueries({ queryKey: ['pagos'] });
    qc.invalidateQueries({ queryKey: ['pagos-stats'] });
  };

  const obsM = useMutation({
    mutationFn: (contenido: string) => expedientesApi.addObservacion(+id!, contenido),
    onSuccess: () => { invalidate(); setObservacion(''); toast.success('Observación agregada'); },
    onError: (err: any) => toast.error(getErrorMessage(err, 'No se pudo agregar la observación')),
  });

  const eventoM = useMutation({
    mutationFn: (data: any) => expedientesApi.addEvento(+id!, {
      ...data,
      fechaFin: data.fechaFin || undefined,
      descripcion: data.descripcion || undefined,
    }),
    onSuccess: () => { invalidate(); setShowEventForm(false); setNuevoEvento({ titulo: '', descripcion: '', fechaInicio: '', fechaFin: '' }); toast.success('Evento agregado a la agenda'); },
    onError: (err: any) => toast.error(getErrorMessage(err, 'No se pudo agregar el evento')),
  });

  const estadoM = useMutation({
    mutationFn: (estado: string) => expedientesApi.cambiarEstado(+id!, estado),
    onSuccess: () => { invalidate(); toast.success('Estado actualizado'); },
    onError: (err: any) => toast.error(getErrorMessage(err, 'No se pudo actualizar el estado')),
  });

  const fileM = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('archivo', file);
      fd.append('nombre', file.name);
      return expedientesApi.addDocumento(+id!, fd);
    },
    onSuccess: () => { invalidate(); toast.success('Documento subido'); },
    onError: (err: any) => toast.error(getErrorMessage(err, 'No se pudo subir el archivo')),
  });

  if (isLoading) return <div className="dashboard-loading"><div className="spinner spinner-lg" /></div>;
  if (!exp) return <div>Expediente no encontrado</div>;

  const eventosOrdenados = [...(exp.eventosExpediente || [])].sort(
    (a: any, b: any) => new Date(a.fechaInicio).getTime() - new Date(b.fechaInicio).getTime()
  );

  return (
    <div>
      {/* Header */}
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
              <h1 className="page-title" style={{ fontSize: '1.25rem' }}>{exp.titulo}</h1>
              <span className={`badge ${ESTADO_COLORS[exp.estado] || 'badge-muted'}`}>{ESTADO_LABELS[exp.estado] || exp.estado}</span>
            </div>
            <p className="page-subtitle">{exp.numero} • {exp.clientes?.map((c: any) => `${c.nombre} ${c.apellido}`).join(', ') || 'Sin clientes'}</p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 'var(--sp-3)' }}>
          <button className="btn btn-secondary btn-sm" onClick={() => setEditModalOpen(true)}>
            <Pencil size={14} /> Editar
          </button>
          {(TRANSICIONES_ESTADO[exp.estado] || []).length > 0 && (
            <select className="form-select" value={exp.estado} disabled={estadoM.isPending}
              onChange={(e) => {
                const nuevoEstado = e.target.value;
                if (nuevoEstado === exp.estado) return;
                askConfirm({
                  title: 'Cambiar estado del expediente',
                  message: `¿Cambiar "${exp.numero}" de "${ESTADO_LABELS[exp.estado]}" a "${ESTADO_LABELS[nuevoEstado]}"?${
                    ['ganado', 'perdido', 'cancelado'].includes(nuevoEstado) ? '\n\nEste es un estado final: ya no podrás volver a cambiarlo.' : ''
                  }`,
                  confirmLabel: 'Cambiar estado',
                  danger: nuevoEstado === 'perdido' || nuevoEstado === 'cancelado',
                  onConfirm: () => estadoM.mutate(nuevoEstado),
                });
              }} style={{ maxWidth: 200 }}>
              <option value={exp.estado}>{ESTADO_LABELS[exp.estado]} (actual)</option>
              {TRANSICIONES_ESTADO[exp.estado].map((s) => (
                <option key={s} value={s}>→ Cambiar a {ESTADO_LABELS[s]}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--sp-4)', alignItems: 'start' }} className="expediente-detalle-grid">
        {/* Contexto del caso: siempre visible, sin importar la pestaña activa */}
        <SidebarInfo exp={exp} />

        <div>
          {/* Tabs */}
          <div className="tabs">
            {[
              ['info', 'Resumen'],
              ['servicios', `Servicios (${pagosExpediente?.items?.length || 0})`],
              ['documentos', `Documentos (${exp.documentos?.length || 0})`],
              ['observaciones', `Observaciones (${exp.observaciones?.length || 0})`],
              ['eventos', `Agenda (${exp.eventosExpediente?.length || 0})`],
            ].map(([k, v]) => (
              <button key={k} className={`tab-btn ${activeTab === k ? 'active' : ''}`} onClick={() => setActiveTab(k)}>{v}</button>
            ))}
          </div>

          {/* Tab content */}
          {activeTab === 'info' && (
            <div className="card">
              <h3 style={{ marginBottom: 'var(--sp-3)', display: 'flex', alignItems: 'center', gap: 6 }}>
                <StickyNote size={16} style={{ color: 'var(--accent-400)' }} /> Descripción y notas
              </h3>
              {exp.descripcion ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, marginBottom: exp.notas ? 'var(--sp-4)' : 0 }}>
                  {exp.descripcion}
                </p>
              ) : !exp.notas && (
                <div className="empty-state">
                  <Tag size={28} style={{ opacity: 0.3 }} />
                  <p>Sin descripción ni notas registradas</p>
                </div>
              )}
              {exp.notas && (
                <>
                  <div className="divider" />
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
                    Notas internas
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{exp.notas}</p>
                </>
              )}
            </div>
          )}

          {activeTab === 'servicios' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <CreditCard size={16} style={{ color: 'var(--accent-400)' }} /> Servicios y cobros
                </h3>
                <button className="btn btn-primary btn-sm" onClick={() => setPagoModalOpen(true)}>
                  <Plus size={14} /> Agregar servicio
                </button>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)' }}>
                Cada servicio agregado (honorarios, consulta, audiencia, etc.) genera un cobro independiente que se suma al costo total del expediente.
              </p>
              {pagosExpediente?.items?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {pagosExpediente.items.map((p: any) => {
                    const puedeAbonar = p.estado !== 'pagado' && p.estado !== 'cancelado';
                    const tieneAbonos = (p.detalles?.length || 0) > 0;
                    const expandido = expandedPagoId === p.id;
                    return (
                      <div key={p.id} style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)' }}>
                          {tieneAbonos ? (
                            <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => setExpandedPagoId(expandido ? null : p.id)}>
                              {expandido ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                            </button>
                          ) : <div style={{ width: 28 }} />}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{p.concepto || p.servicio?.nombre || '—'}</div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                              {p.numero}
                              {Number(p.montoDescuento) > 0 && (
                                <span style={{ color: 'var(--warning)' }}> • Descuento −{money(p.montoDescuento)}</span>
                              )}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>{money(p.montoTotal)}</div>
                            <span className={`badge ${PAGO_ESTADO_COLORS[p.estado] || 'badge-muted'}`}>{PAGO_ESTADO_LABELS[p.estado] || p.estado}</span>
                          </div>
                          {puedeAbonar && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setAbonoModal(p)}>
                              <Plus size={12} /> Abono
                            </button>
                          )}
                        </div>
                        {expandido && tieneAbonos && (
                          <div style={{ padding: '0 var(--sp-3) var(--sp-3) var(--sp-3)', borderTop: '1px solid var(--border-subtle)' }}>
                            <div style={{ fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', margin: 'var(--sp-2) 0' }}>
                              Historial de abonos
                            </div>
                            {[...p.detalles].reverse().map((d: any) => (
                              <div key={d.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8125rem', padding: '4px 0' }}>
                                <span style={{ color: 'var(--text-secondary)' }}>
                                  {format(new Date(d.fechaPago), 'dd/MM/yyyy', { locale: es })}
                                  {d.metodoPago && ` • ${d.metodoPago}`}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                  <span style={{ fontWeight: 600, color: 'var(--success)' }}>{money(d.monto)}</span>
                                  <button className="btn btn-ghost btn-icon btn-icon-sm" data-tooltip="Reimprimir recibo"
                                    onClick={() => setRecibo({ pago: p, abono: d })}>
                                    <Printer size={13} />
                                  </button>
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state">
                  <Receipt size={28} style={{ opacity: 0.3 }} />
                  <p>Sin servicios agregados a este expediente todavía</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'documentos' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                <h3>Documentos ({exp.documentos?.length || 0})</h3>
                <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
                  {fileM.isPending ? <Loader2 size={14} className="spinning" /> : <Upload size={14} />} Subir archivo
                  <input type="file" style={{ display: 'none' }} multiple disabled={fileM.isPending}
                    onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach(f => fileM.mutate(f)); e.target.value = ''; }} />
                </label>
              </div>
              {exp.documentos?.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
                  {[...exp.documentos].reverse().map((d: any) => (
                    <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                      <FileIcon tipo={d.tipo} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{d.nombre}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: 6 }}>
                          {formatBytes(d.tamanoBytes) && <span>{formatBytes(d.tamanoBytes)}</span>}
                          {d.createdAt && <span>• Subido {formatDistanceToNow(new Date(d.createdAt), { locale: es, addSuffix: true })}</span>}
                        </div>
                        {d.descripcion && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>{d.descripcion}</div>}
                      </div>
                      <a href={`http://localhost:3001${d.ruta}`} target="_blank" rel="noopener noreferrer" className="btn btn-ghost btn-sm">Ver</a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <File size={32} style={{ opacity: 0.3 }} />
                  <h3>Sin documentos</h3>
                  <p>Sube el primer documento a este expediente</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'observaciones' && (
            <div className="card">
              <h3 style={{ marginBottom: 'var(--sp-4)' }}>Observaciones</h3>
              <div style={{ display: 'flex', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
                <textarea className="form-textarea" value={observacion} onChange={(e) => setObservacion(e.target.value)}
                  placeholder="Escribe una observación..." rows={2} style={{ flex: 1, minHeight: 60 }} />
                <button className="btn btn-primary" onClick={() => observacion.trim() && obsM.mutate(observacion)} disabled={obsM.isPending || !observacion.trim()}>
                  {obsM.isPending ? <Loader2 size={16} className="spinning" /> : <Send size={16} />}
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
                {[...(exp.observaciones || [])].reverse().map((o: any) => (
                  <div key={o.id} style={{ padding: 'var(--sp-4)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--sp-2)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                        <div className="avatar avatar-sm">{o.usuarioNombre?.[0]}</div>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{o.usuarioNombre}</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{format(new Date(o.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}</span>
                    </div>
                    <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-line' }}>{o.contenido}</p>
                  </div>
                ))}
                {!exp.observaciones?.length && (
                  <div className="empty-state">
                    <MessageSquare size={28} style={{ opacity: 0.3 }} />
                    <p>Sin observaciones aún</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'eventos' && (
            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarDays size={16} style={{ color: 'var(--accent-400)' }} /> Agenda del expediente</h3>
                <button className="btn btn-primary btn-sm" onClick={() => setShowEventForm(!showEventForm)}>
                  <Calendar size={14} /> Agregar evento
                </button>
              </div>
              {showEventForm && (
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
                  <div className="form-grid-2">
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Título del evento *</label>
                      <input type="text" className="form-input" value={nuevoEvento.titulo}
                        onChange={(e) => setNuevoEvento(f => ({ ...f, titulo: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha inicio *</label>
                      <input type="datetime-local" className="form-input" value={nuevoEvento.fechaInicio}
                        onChange={(e) => setNuevoEvento(f => ({ ...f, fechaInicio: e.target.value }))} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Fecha fin</label>
                      <input type="datetime-local" className="form-input" value={nuevoEvento.fechaFin}
                        onChange={(e) => setNuevoEvento(f => ({ ...f, fechaFin: e.target.value }))} />
                    </div>
                    <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                      <label className="form-label">Descripción</label>
                      <textarea className="form-textarea" value={nuevoEvento.descripcion}
                        onChange={(e) => setNuevoEvento(f => ({ ...f, descripcion: e.target.value }))} rows={2} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => setShowEventForm(false)}>Cancelar</button>
                    <button className="btn btn-primary btn-sm" onClick={() => eventoM.mutate(nuevoEvento)} disabled={!nuevoEvento.titulo.trim() || !nuevoEvento.fechaInicio || eventoM.isPending}>
                      {eventoM.isPending && <Loader2 size={14} className="spinning" />} Guardar
                    </button>
                  </div>
                </div>
              )}
              {eventosOrdenados.map((ev: any) => {
                const pasado = !ev.completado && new Date(ev.fechaInicio) < new Date();
                return (
                  <div key={ev.id} style={{ display: 'flex', gap: 'var(--sp-3)', padding: 'var(--sp-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: 'var(--sp-2)', opacity: pasado ? 0.7 : 1 }}>
                    <div style={{ width: 2, background: ev.completado ? 'var(--success)' : pasado ? 'var(--text-muted)' : 'var(--accent-400)', borderRadius: 2, flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{ev.titulo}</div>
                        {ev.completado && <span className="badge badge-success">Completado</span>}
                        {pasado && !ev.completado && <span className="badge badge-warning">Vencido</span>}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--accent-400)', marginTop: 2 }}>
                        {format(new Date(ev.fechaInicio), "dd 'de' MMMM, HH:mm", { locale: es })}
                        {ev.fechaFin && ` - ${format(new Date(ev.fechaFin), 'HH:mm')}`}
                      </div>
                      {ev.descripcion && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{ev.descripcion}</div>}
                    </div>
                  </div>
                );
              })}
              {!eventosOrdenados.length && (
                <div className="empty-state"><Calendar size={28} style={{ opacity: 0.3 }} /><p>Sin eventos registrados en la agenda</p></div>
              )}
            </div>
          )}
        </div>
      </div>

      {editModalOpen && (
        <ExpedienteModal
          expediente={exp}
          onClose={() => setEditModalOpen(false)}
          onSuccess={() => { setEditModalOpen(false); invalidate(); }}
        />
      )}

      {pagoModalOpen && (
        <PagoModal
          expedienteContext={{ id: exp.id, numero: exp.numero, clientes: exp.clientes || [] }}
          onClose={() => setPagoModalOpen(false)}
          onSuccess={() => { setPagoModalOpen(false); invalidatePagos(); }}
        />
      )}

      {abonoModal && (
        <AbonoModal
          pago={abonoModal}
          onClose={() => setAbonoModal(null)}
          onSuccess={(pagoActualizado, abono) => {
            setAbonoModal(null);
            invalidatePagos();
            setRecibo({ pago: pagoActualizado, abono });
          }}
        />
      )}

      {recibo && (
        <ReciboModal pago={recibo.pago} abono={recibo.abono} onClose={() => setRecibo(null)} />
      )}
      {confirmDialog}
    </div>
  );
}
