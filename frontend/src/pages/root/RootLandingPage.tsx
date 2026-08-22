import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { MessageSquare, Star, Trash2, CheckCircle2, Mail, Phone, Inbox } from 'lucide-react';
import toast from 'react-hot-toast';
import { landingApi } from '../../api/landing.api';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

function Stars({ n }: { n?: number | null }) {
  if (!n) return null;
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={13} fill={i < n ? '#f59e0b' : 'none'} style={{ color: '#f59e0b' }} />
      ))}
    </div>
  );
}

function TestimoniosTab() {
  const qc = useQueryClient();
  const { askConfirm, confirmDialog } = useConfirmDialog();
  const { data: testimonios, isLoading } = useQuery({ queryKey: ['root-testimonios'], queryFn: landingApi.testimoniosTodos });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['root-testimonios'] });

  const aprobarM = useMutation({
    mutationFn: (id: number) => landingApi.aprobarTestimonio(id),
    onSuccess: () => { invalidate(); toast.success('Testimonio aprobado — ya aparece en la landing'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al aprobar'),
  });

  const eliminarM = useMutation({
    mutationFn: (id: number) => landingApi.eliminarTestimonio(id),
    onSuccess: () => { invalidate(); toast.success('Testimonio eliminado'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al eliminar'),
  });

  if (isLoading) return <div className="spinner" style={{ margin: 'var(--sp-8) auto' }} />;

  if (!testimonios?.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><MessageSquare size={40} /></div>
        <h3>Sin testimonios todavía</h3>
        <p>Los que env&iacute;en los visitantes de la landing aparecer&aacute;n aqu&iacute;</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {testimonios.map((t: any) => (
        <div key={t.id} className="card" style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 4 }}>
              <strong>{t.nombre}</strong>
              {t.despachoNombre && <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>· {t.despachoNombre}</span>}
              <Stars n={t.calificacion} />
              <span className={`badge ${t.aprobado ? 'badge-success' : 'badge-warning'}`}>
                {t.aprobado ? 'Aprobado' : 'Pendiente'}
              </span>
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t.mensaje}</p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {format(new Date(t.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 'var(--sp-2)', flexShrink: 0 }}>
            {!t.aprobado && (
              <button className="btn btn-secondary btn-sm" disabled={aprobarM.isPending} onClick={() => aprobarM.mutate(t.id)}>
                <CheckCircle2 size={14} /> Aprobar
              </button>
            )}
            <button
              className="btn btn-ghost btn-icon btn-icon-sm"
              onClick={() => askConfirm({
                title: 'Eliminar testimonio',
                message: `¿Eliminar el testimonio de "${t.nombre}"? Esta acción no se puede deshacer.`,
                confirmLabel: 'Eliminar',
                danger: true,
                onConfirm: () => eliminarM.mutate(t.id),
              })}
              data-tooltip="Eliminar"
            >
              <Trash2 size={15} style={{ color: 'var(--danger)' }} />
            </button>
          </div>
        </div>
      ))}
      {confirmDialog}
    </div>
  );
}

function ContactosTab() {
  const qc = useQueryClient();
  const { data: contactos, isLoading } = useQuery({ queryKey: ['root-contactos'], queryFn: landingApi.contactos });

  const atenderM = useMutation({
    mutationFn: (id: number) => landingApi.marcarContactoAtendido(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['root-contactos'] }); toast.success('Marcado como atendido'); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al actualizar'),
  });

  if (isLoading) return <div className="spinner" style={{ margin: 'var(--sp-8) auto' }} />;

  if (!contactos?.length) {
    return (
      <div className="empty-state">
        <div className="empty-icon"><Inbox size={40} /></div>
        <h3>Sin contactos todavía</h3>
        <p>Los leads que dejen sus datos en la landing aparecer&aacute;n aqu&iacute;</p>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
      {contactos.map((c: any) => (
        <div key={c.id} className="card" style={{ display: 'flex', gap: 'var(--sp-4)', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 4 }}>
              <strong>{c.nombre}</strong>
              <span className={`badge ${c.atendido ? 'badge-success' : 'badge-warning'}`}>
                {c.atendido ? 'Atendido' : 'Pendiente'}
              </span>
            </div>
            <div style={{ display: 'flex', gap: 'var(--sp-4)', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Mail size={13} /> {c.email}</span>
              {c.telefono && <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}><Phone size={13} /> {c.telefono}</span>}
            </div>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>{c.mensaje}</p>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              {format(new Date(c.createdAt), 'dd/MM/yyyy HH:mm', { locale: es })}
            </div>
          </div>
          {!c.atendido && (
            <button className="btn btn-secondary btn-sm" disabled={atenderM.isPending} onClick={() => atenderM.mutate(c.id)}>
              <CheckCircle2 size={14} /> Marcar atendido
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

export default function RootLandingPage() {
  const [tab, setTab] = useState<'testimonios' | 'contactos'>('testimonios');

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Landing</h1>
          <p className="page-subtitle">Testimonios y contactos recibidos desde la página pública</p>
        </div>
      </div>

      <div className="tabs">
        <button className={`tab-btn ${tab === 'testimonios' ? 'active' : ''}`} onClick={() => setTab('testimonios')}>Testimonios</button>
        <button className={`tab-btn ${tab === 'contactos' ? 'active' : ''}`} onClick={() => setTab('contactos')}>Contactos</button>
      </div>

      {tab === 'testimonios' ? <TestimoniosTab /> : <ContactosTab />}
    </div>
  );
}
