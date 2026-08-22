import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Star, Quote, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { landingApi } from '../../api/landing.api';
import { getErrorMessage } from '../../utils/errors';

function Stars({ n }: { n?: number | null }) {
  if (!n) return null;
  return (
    <div style={{ display: 'flex', gap: 2, marginBottom: 8 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <Star key={i} size={14} fill={i < n ? '#f59e0b' : 'none'} style={{ color: '#f59e0b' }} />
      ))}
    </div>
  );
}

function StarInput({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <div style={{ display: 'flex', gap: 4 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <button
          key={i} type="button"
          onClick={() => onChange(i + 1)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2 }}
        >
          <Star size={22} fill={i < value ? '#f59e0b' : 'none'} style={{ color: '#f59e0b' }} />
        </button>
      ))}
    </div>
  );
}

const emptyForm = { nombre: '', despachoNombre: '', mensaje: '', calificacion: 0 };

export default function TestimoniosSection() {
  const qc = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [enviado, setEnviado] = useState(false);

  const { data: testimonios } = useQuery({ queryKey: ['landing-testimonios'], queryFn: landingApi.testimonios });

  const mutation = useMutation({
    mutationFn: () => landingApi.enviarTestimonio({
      nombre: form.nombre,
      despachoNombre: form.despachoNombre || undefined,
      mensaje: form.mensaje,
      calificacion: form.calificacion || undefined,
    }),
    onSuccess: () => {
      setEnviado(true);
      setForm(emptyForm);
      qc.invalidateQueries({ queryKey: ['landing-testimonios'] });
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'No se pudo enviar tu testimonio')),
  });

  return (
    <section id="testimonios" className="landing-section landing-section-alt">
      <div className="landing-section-header">
        <h2>Lo que dicen otros despachos</h2>
        <p>Historias reales de quienes ya lo usan todos los días</p>
      </div>

      {testimonios?.length ? (
        <div className="landing-testimonios-grid">
          {testimonios.map((t: any) => (
            <div key={t.id} className="landing-testimonio-card">
              <Quote size={22} style={{ color: 'var(--accent-400)', opacity: 0.6 }} />
              <Stars n={t.calificacion} />
              <p>&ldquo;{t.mensaje}&rdquo;</p>
              <div className="landing-testimonio-autor">
                <strong>{t.nombre}</strong>
                {t.despachoNombre && <span>{t.despachoNombre}</span>}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p style={{ textAlign: 'center', color: 'var(--text-muted)' }}>Sé el primero en compartir tu experiencia.</p>
      )}

      <div className="landing-testimonio-form">
        {enviado ? (
          <div className="empty-state" style={{ padding: 'var(--sp-6) 0' }}>
            <h3>¡Gracias!</h3>
            <p>Tu testimonio se publicará en cuanto lo revisemos.</p>
          </div>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
            <h3 style={{ marginBottom: 'var(--sp-4)' }}>Comparte tu experiencia</h3>
            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Tu nombre *</label>
                <input className="form-input" required value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Despacho (opcional)</label>
                <input className="form-input" value={form.despachoNombre}
                  onChange={(e) => setForm((f) => ({ ...f, despachoNombre: e.target.value }))} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Tu testimonio *</label>
                <textarea className="form-textarea" rows={3} required value={form.mensaje}
                  onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Calificación</label>
                <StarInput value={form.calificacion} onChange={(n) => setForm((f) => ({ ...f, calificacion: n }))} />
              </div>
            </div>
            <button type="submit" className="btn btn-primary" disabled={mutation.isPending} style={{ marginTop: 'var(--sp-4)' }}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />} Enviar testimonio
            </button>
          </form>
        )}
      </div>
    </section>
  );
}
