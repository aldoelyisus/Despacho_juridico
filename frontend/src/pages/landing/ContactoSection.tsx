import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Loader2, Mail, Phone, MessageCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { landingApi } from '../../api/landing.api';
import { getErrorMessage } from '../../utils/errors';

const WHATSAPP_NUMERO = '526182466273';
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMERO}?text=${encodeURIComponent('Hola, me interesa el sistema para despachos jurídicos.')}`;

const emptyForm = { nombre: '', email: '', telefono: '', mensaje: '' };

export default function ContactoSection() {
  const [form, setForm] = useState(emptyForm);
  const [enviado, setEnviado] = useState(false);

  const mutation = useMutation({
    mutationFn: () => landingApi.enviarContacto({
      nombre: form.nombre, email: form.email,
      telefono: form.telefono || undefined, mensaje: form.mensaje,
    }),
    onSuccess: () => { setEnviado(true); setForm(emptyForm); },
    onError: (err: any) => toast.error(getErrorMessage(err, 'No se pudo enviar tu mensaje')),
  });

  return (
    <section id="contacto" className="landing-section">
      <div className="landing-section-header">
        <h2>¿Listo para modernizar tu despacho?</h2>
        <p>Déjanos tus datos y te contactamos, o escríbenos directo por WhatsApp</p>
      </div>

      <div className="landing-contacto-grid">
        <div className="landing-contacto-form card">
          {enviado ? (
            <div className="empty-state" style={{ padding: 'var(--sp-6) 0' }}>
              <h3>¡Mensaje enviado!</h3>
              <p>Te contactaremos pronto.</p>
            </div>
          ) : (
            <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(); }}>
              <div className="form-group">
                <label className="form-label">Nombre *</label>
                <input className="form-input" required value={form.nombre}
                  onChange={(e) => setForm((f) => ({ ...f, nombre: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Correo electrónico *</label>
                <input className="form-input" type="email" required value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Teléfono (opcional)</label>
                <input className="form-input" type="tel" value={form.telefono}
                  onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Cuéntanos sobre tu despacho *</label>
                <textarea className="form-textarea" rows={3} required value={form.mensaje}
                  placeholder="Ej: Somos un despacho de 5 abogados, nos interesa..."
                  onChange={(e) => setForm((f) => ({ ...f, mensaje: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary w-full" disabled={mutation.isPending}>
                {mutation.isPending && <Loader2 size={16} className="spinning" />} Enviar
              </button>
            </form>
          )}
        </div>

        <div className="landing-contacto-directo">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="landing-whatsapp-card">
            <MessageCircle size={28} />
            <div>
              <strong>Escríbenos por WhatsApp</strong>
              <span>Respuesta inmediata</span>
            </div>
          </a>
          <div className="landing-contacto-item"><Mail size={16} /> contacto@despachojuridico.com</div>
          <div className="landing-contacto-item"><Phone size={16} /> +52 618 246 6273</div>
        </div>
      </div>
    </section>
  );
}
