import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Upload, MessageSquare, Calendar, File, Send, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { expedientesApi } from '../../api/expedientes.api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADO_COLORS: Record<string, string> = {
  activo: 'badge-success', en_proceso: 'badge-info', cerrado: 'badge-muted',
  ganado: 'badge-success', perdido: 'badge-danger', suspendido: 'badge-warning',
};

const ESTADO_LABELS: Record<string, string> = {
  activo: 'Activo', en_proceso: 'En Proceso', cerrado: 'Cerrado',
  ganado: 'Ganado', perdido: 'Perdido', suspendido: 'Suspendido',
};

export default function ExpedienteDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('info');
  const [observacion, setObservacion] = useState('');
  const [nuevoEvento, setNuevoEvento] = useState({ titulo: '', descripcion: '', fechaInicio: '', fechaFin: '' });
  const [showEventForm, setShowEventForm] = useState(false);

  const { data: exp, isLoading } = useQuery({
    queryKey: ['expediente', id],
    queryFn: () => expedientesApi.get(+id!),
  });

  const obsM = useMutation({
    mutationFn: (contenido: string) => expedientesApi.addObservacion(+id!, contenido),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expediente', id] }); setObservacion(''); toast.success('Observación agregada'); },
  });

  const eventoM = useMutation({
    mutationFn: (data: any) => expedientesApi.addEvento(+id!, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expediente', id] }); setShowEventForm(false); setNuevoEvento({ titulo: '', descripcion: '', fechaInicio: '', fechaFin: '' }); toast.success('Evento agregado'); },
  });

  const estadoM = useMutation({
    mutationFn: (estado: string) => expedientesApi.cambiarEstado(+id!, estado),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expediente', id] }); toast.success('Estado actualizado'); },
  });

  const fileM = useMutation({
    mutationFn: (file: File) => {
      const fd = new FormData();
      fd.append('archivo', file);
      fd.append('nombre', file.name);
      return expedientesApi.addDocumento(+id!, fd);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['expediente', id] }); toast.success('Documento subido'); },
    onError: () => toast.error('Error al subir archivo'),
  });

  if (isLoading) return <div className="dashboard-loading"><div className="spinner spinner-lg" /></div>;
  if (!exp) return <div>Expediente no encontrado</div>;

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
          <select className="form-select" value={exp.estado}
            onChange={(e) => estadoM.mutate(e.target.value)} style={{ maxWidth: 160 }}>
            {Object.entries(ESTADO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs">
        {[['info', 'Información'], ['documentos', 'Documentos'], ['observaciones', 'Observaciones'], ['eventos', 'Eventos']].map(([k, v]) => (
          <button key={k} className={`tab-btn ${activeTab === k ? 'active' : ''}`} onClick={() => setActiveTab(k)}>{v}</button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'info' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
          <div className="card">
            <h3 style={{ marginBottom: 'var(--sp-4)' }}>Detalles</h3>
            {[
              ['Número', exp.numero],
              ['Estado', ESTADO_LABELS[exp.estado]],
              ['Fecha Inicio', exp.fechaInicio ? format(new Date(exp.fechaInicio), 'dd/MM/yyyy') : '—'],
              ['Monto Total', exp.montoTotal ? `$${Number(exp.montoTotal).toLocaleString('es-MX')}` : '—'],
            ].map(([l, v]) => (
              <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '0.875rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>{l}</span>
                <span>{v}</span>
              </div>
            ))}
          </div>
          <div className="card">
            <h3 style={{ marginBottom: 'var(--sp-4)' }}>Colaboradores</h3>
            {exp.colaboradores?.map((u: any) => (
              <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-2) 0' }}>
                <div className="avatar avatar-sm">{u.nombre[0]}{u.apellido?.[0]}</div>
                <div style={{ fontSize: '0.875rem' }}>{u.nombre} {u.apellido}</div>
              </div>
            )) || <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>Sin colaboradores</p>}
          </div>
          {exp.descripcion && (
            <div className="card" style={{ gridColumn: '1 / -1' }}>
              <h3 style={{ marginBottom: 'var(--sp-3)' }}>Descripción</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{exp.descripcion}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'documentos' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
            <h3>Documentos ({exp.documentos?.length || 0})</h3>
            <label className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>
              <Upload size={14} /> Subir Archivo
              <input type="file" style={{ display: 'none' }} multiple
                onChange={(e) => { if (e.target.files) Array.from(e.target.files).forEach(f => fileM.mutate(f)); }} />
            </label>
          </div>
          {exp.documentos?.length ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {exp.documentos.map((d: any) => (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                  <File size={18} style={{ color: 'var(--accent-400)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{d.nombre}</div>
                    {d.descripcion && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{d.descripcion}</div>}
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
                <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>{o.contenido}</p>
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
            <h3>Eventos del Expediente</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowEventForm(!showEventForm)}>
              <Calendar size={14} /> Agregar Evento
            </button>
          </div>
          {showEventForm && (
            <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)' }}>
              <div className="form-grid-2">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Título del Evento *</label>
                  <input type="text" className="form-input" value={nuevoEvento.titulo}
                    onChange={(e) => setNuevoEvento(f => ({ ...f, titulo: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Inicio *</label>
                  <input type="datetime-local" className="form-input" value={nuevoEvento.fechaInicio}
                    onChange={(e) => setNuevoEvento(f => ({ ...f, fechaInicio: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Fecha Fin</label>
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
                <button className="btn btn-primary btn-sm" onClick={() => eventoM.mutate(nuevoEvento)} disabled={!nuevoEvento.titulo || !nuevoEvento.fechaInicio}>
                  {eventoM.isPending ? <Loader2 size={14} className="spinning" /> : null} Guardar
                </button>
              </div>
            </div>
          )}
          {exp.eventosExpediente?.map((ev: any) => (
            <div key={ev.id} style={{ display: 'flex', gap: 'var(--sp-3)', padding: 'var(--sp-3)', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', marginBottom: 'var(--sp-2)' }}>
              <div style={{ width: 2, background: ev.completado ? '#10b981' : '#6366f1', borderRadius: 2, flexShrink: 0 }} />
              <div>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{ev.titulo}</div>
                <div style={{ fontSize: '0.75rem', color: 'var(--accent-400)', marginTop: 2 }}>
                  {format(new Date(ev.fechaInicio), "dd 'de' MMMM, HH:mm", { locale: es })}
                  {ev.fechaFin && ` - ${format(new Date(ev.fechaFin), 'HH:mm')}`}
                </div>
                {ev.descripcion && <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 4 }}>{ev.descripcion}</div>}
              </div>
            </div>
          ))}
          {!exp.eventosExpediente?.length && (
            <div className="empty-state"><Calendar size={28} style={{ opacity: 0.3 }} /><p>Sin eventos registrados</p></div>
          )}
        </div>
      )}
    </div>
  );
}
