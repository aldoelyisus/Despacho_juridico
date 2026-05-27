import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Plus, X, Loader2, Users, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';
import { agendaApi } from '../../api/agenda.api';
import { usuariosApi } from '../../api/usuarios.api';
import './AgendaPage.css';

const TIPOS = [
  { value: 'cita_cliente',    label: 'Cita con Cliente',  color: '#6366f1' },
  { value: 'reunion_interna', label: 'Reunión Interna',   color: '#10b981' },
  { value: 'audiencia',       label: 'Audiencia',         color: '#f59e0b' },
  { value: 'entrega',         label: 'Entrega',           color: '#3b82f6' },
  { value: 'vencimiento',     label: 'Vencimiento',       color: '#ef4444' },
  { value: 'otro',            label: 'Otro',              color: '#8b5cf6' },
];

const FORM_INIT = {
  titulo: '', descripcion: '', fechaInicio: '',
  fechaFin: '', lugar: '', tipo: 'otro', color: '#6366f1',
};

export default function AgendaPage() {
  const qc = useQueryClient();
  const calendarRef = useRef<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [form, setForm] = useState(FORM_INIT);
  const [participanteIds, setParticipanteIds] = useState<number[]>([]);

  const { data: eventos } = useQuery({
    queryKey: ['agenda'],
    queryFn: () => agendaApi.list(),
    refetchInterval: 60000,
  });

  const { data: usuariosData } = useQuery({
    queryKey: ['usuarios-list'],
    queryFn: () => usuariosApi.list(),
  });
  const usuarios: any[] = usuariosData?.items || usuariosData || [];

  const createM = useMutation({
    mutationFn: agendaApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda'] });
      setShowModal(false);
      setParticipanteIds([]);
      toast.success('Evento creado');
    },
    onError: () => toast.error('Error al crear evento'),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => agendaApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['agenda'] });
      setSelectedEvent(null);
      toast.success('Evento eliminado');
    },
  });

  const calendarEvents = (eventos || []).map((ev: any) => ({
    id: String(ev.id),
    title: ev.titulo,
    start: ev.fechaInicio,
    end: ev.fechaFin,
    backgroundColor: ev.color || '#6366f1',
    borderColor: ev.color || '#6366f1',
    extendedProps: ev,
  }));

  const openNew = (info?: any) => {
    setForm({
      ...FORM_INIT,
      fechaInicio: info?.dateStr ? `${info.dateStr}T09:00` : '',
      fechaFin:   info?.dateStr ? `${info.dateStr}T10:00` : '',
    });
    setParticipanteIds([]);
    setSelectedEvent(null);
    setShowModal(true);
  };

  const toggleParticipante = (id: number) => {
    setParticipanteIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createM.mutate({ ...form, participanteIds });
  };

  const participantesSeleccionados = usuarios.filter(u => participanteIds.includes(u.id));
  const participantesDisponibles   = usuarios.filter(u => !participanteIds.includes(u.id));

  return (
    <div className="agenda-page">
      <div className="page-header">
        <div>
          <h1 className="page-title">Agenda</h1>
          <p className="page-subtitle">Solo ves los eventos que creaste o donde fuiste invitado</p>
        </div>
        <button id="nuevo-evento-btn" className="btn btn-primary" onClick={() => openNew()}>
          <Plus size={16} /> Nuevo Evento
        </button>
      </div>

      <div className="card agenda-calendar-card">
        <FullCalendar
          ref={calendarRef}
          plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          locale={esLocale}
          events={calendarEvents}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek',
          }}
          buttonText={{ today: 'Hoy', month: 'Mes', week: 'Semana', day: 'Día', list: 'Lista' }}
          height="auto"
          dateClick={openNew}
          eventClick={(info) => setSelectedEvent(info.event.extendedProps)}
          editable={false}
          selectable
          nowIndicator
        />
      </div>

      {/* ── Detalle de evento ── */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                <div style={{ width: 12, height: 12, borderRadius: '50%', background: selectedEvent.color || '#6366f1' }} />
                <h3>{selectedEvent.titulo}</h3>
              </div>
              <button className="btn btn-ghost btn-icon" onClick={() => setSelectedEvent(null)}><X size={18} /></button>
            </div>
            <div className="modal-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', fontSize: '0.875rem' }}>
                {selectedEvent.descripcion && <p style={{ color: 'var(--text-secondary)' }}>{selectedEvent.descripcion}</p>}
                <div><span style={{ color: 'var(--text-muted)' }}>Tipo: </span>{TIPOS.find(t => t.value === selectedEvent.tipo)?.label || selectedEvent.tipo}</div>
                {selectedEvent.lugar && <div><span style={{ color: 'var(--text-muted)' }}>Lugar: </span>{selectedEvent.lugar}</div>}
                <div><span style={{ color: 'var(--text-muted)' }}>Inicio: </span>{new Date(selectedEvent.fechaInicio).toLocaleString('es-MX')}</div>
                {selectedEvent.fechaFin && <div><span style={{ color: 'var(--text-muted)' }}>Fin: </span>{new Date(selectedEvent.fechaFin).toLocaleString('es-MX')}</div>}

                {/* Participantes */}
                {selectedEvent.participantes?.length > 0 && (
                  <div>
                    <div style={{ color: 'var(--text-muted)', marginBottom: 6 }}>
                      <Users size={13} style={{ display: 'inline', marginRight: 4 }} />
                      Participantes:
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                      {selectedEvent.participantes.map((p: any) => (
                        <span key={p.id} style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          background: '#6366f118', border: '1px solid #6366f133',
                          borderRadius: 99, padding: '2px 8px', fontSize: '0.78rem',
                          color: 'var(--accent-400)',
                        }}>
                          <UserCheck size={11} /> {p.nombre} {p.apellido}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-danger btn-sm" onClick={() => deleteM.mutate(selectedEvent.id)}>Eliminar</button>
              <button className="btn btn-secondary btn-sm" onClick={() => setSelectedEvent(null)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Crear Evento Modal ── */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal modal-lg">
            <div className="modal-header">
              <h3>Nuevo Evento</h3>
              <button className="btn btn-ghost btn-icon" onClick={() => setShowModal(false)}><X size={18} /></button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div className="form-grid-2">

                  {/* TÍTULO */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Título *</label>
                    <input id="ev-titulo" type="text" className="form-input" required
                      value={form.titulo} onChange={(e) => setForm(f => ({ ...f, titulo: e.target.value }))} />
                  </div>

                  {/* TIPO */}
                  <div className="form-group">
                    <label className="form-label">Tipo</label>
                    <select id="ev-tipo" className="form-select" value={form.tipo}
                      onChange={(e) => {
                        const t = TIPOS.find(t => t.value === e.target.value);
                        setForm(f => ({ ...f, tipo: e.target.value, color: t?.color || '#6366f1' }));
                      }}>
                      {TIPOS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>

                  {/* LUGAR */}
                  <div className="form-group">
                    <label className="form-label">Lugar</label>
                    <input id="ev-lugar" type="text" className="form-input"
                      value={form.lugar} onChange={(e) => setForm(f => ({ ...f, lugar: e.target.value }))} />
                  </div>

                  {/* FECHAS */}
                  <div className="form-group">
                    <label className="form-label">Fecha y hora inicio *</label>
                    <input id="ev-inicio" type="datetime-local" className="form-input" required
                      value={form.fechaInicio} onChange={(e) => setForm(f => ({ ...f, fechaInicio: e.target.value }))} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Fecha y hora fin</label>
                    <input id="ev-fin" type="datetime-local" className="form-input"
                      value={form.fechaFin} onChange={(e) => setForm(f => ({ ...f, fechaFin: e.target.value }))} />
                  </div>

                  {/* PARTICIPANTES */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Users size={14} /> Invitar participantes
                      <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '0.8rem' }}>
                        — (tú siempre serás incluido)
                      </span>
                    </label>

                    {/* Chips de seleccionados */}
                    {participantesSeleccionados.length > 0 && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                        {participantesSeleccionados.map((u: any) => (
                          <span key={u.id} style={{
                            display: 'inline-flex', alignItems: 'center', gap: 4,
                            background: '#10b98118', border: '1px solid #10b98133',
                            borderRadius: 99, padding: '3px 10px',
                            fontSize: '0.8rem', fontWeight: 500, color: '#10b981',
                          }}>
                            <UserCheck size={12} />
                            {u.nombre} {u.apellido}
                            <button type="button" onClick={() => toggleParticipante(u.id)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer',
                                color: '#10b981', padding: 0, marginLeft: 2, lineHeight: 1, fontSize: '1rem' }}>
                              ×
                            </button>
                          </span>
                        ))}
                      </div>
                    )}

                    <select id="ev-participantes" className="form-select"
                      value=""
                      onChange={(e) => { if (e.target.value) toggleParticipante(+e.target.value); }}>
                      <option value="">
                        {participantesSeleccionados.length === 0 ? 'Seleccionar usuario...' : '+ Agregar otro participante'}
                      </option>
                      {participantesDisponibles.map((u: any) => (
                        <option key={u.id} value={u.id}>{u.nombre} {u.apellido} — {u.rol?.nombre}</option>
                      ))}
                    </select>
                  </div>

                  {/* DESCRIPCIÓN */}
                  <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                    <label className="form-label">Descripción</label>
                    <textarea id="ev-desc" className="form-textarea" rows={3}
                      value={form.descripcion} onChange={(e) => setForm(f => ({ ...f, descripcion: e.target.value }))} />
                  </div>

                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancelar</button>
                <button id="ev-submit" type="submit" className="btn btn-primary" disabled={createM.isPending}>
                  {createM.isPending && <Loader2 size={16} className="spinning" />} Crear Evento
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
