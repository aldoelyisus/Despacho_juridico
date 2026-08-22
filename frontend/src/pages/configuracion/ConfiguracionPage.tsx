import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save, Building2, Upload, X, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { despachoApi } from '../../api/despacho.api';
import { useAuthStore } from '../../stores/authStore';

export default function ConfiguracionPage() {
  const qc = useQueryClient();
  const { updateUsuario, usuario } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: despacho, isLoading } = useQuery({
    queryKey: ['mi-despacho'],
    queryFn: despachoApi.miDespacho,
  });
  const [form, setForm] = useState<any>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    if (despacho) {
      setForm({ ...despacho });
      setLogoPreview(despachoApi.getLogoUrl(despacho.logo));
    }
  }, [despacho]);

  const saveMutation = useMutation({
    mutationFn: despachoApi.update,
    onSuccess: () => toast.success('Configuración guardada'),
    onError: () => toast.error('Error al guardar'),
  });

  const logoMutation = useMutation({
    mutationFn: despachoApi.uploadLogo,
    onSuccess: (data) => {
      const url = despachoApi.getLogoUrl(data.logo);
      setLogoPreview(url);
      setLogoFile(null);
      // Actualizar el despacho en el authStore para reflejar en Sidebar
      if (usuario?.despacho) {
        updateUsuario({ despacho: { ...usuario.despacho, logo: data.logo } });
      }
      qc.invalidateQueries({ queryKey: ['mi-despacho'] });
      toast.success('Logo actualizado ✅');
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Error al subir logo'),
  });

  if (isLoading || !form) {
    return (
      <div className="dashboard-loading">
        <div className="spinner spinner-lg" />
        <p>Cargando configuración...</p>
      </div>
    );
  }

  const set = (f: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((prev: any) => ({ ...prev, [f]: e.target.value }));

  const handleFileSelect = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Solo se permiten imágenes');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no puede superar 10 MB');
      return;
    }
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Configuración del Despacho</h1>
          <p className="page-subtitle">Personaliza la información y preferencias de tu despacho</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending}
        >
          {saveMutation.isPending ? <Loader2 size={16} className="spinning" /> : <Save size={16} />}
          Guardar Cambios
        </button>
      </div>

      {/* ── LOGO ── */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
          <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-400)' }}>
            <ImageIcon size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0 }}>Logo del Despacho</h3>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Se muestra en el menú lateral · JPG, PNG, SVG o WebP · Máx. 10 MB
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-6)', flexWrap: 'wrap' }}>
          {/* Preview actual */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--sp-3)' }}>
            <div style={{
              width: 100, height: 100, borderRadius: 'var(--radius-lg)',
              background: 'var(--bg-elevated)', border: '2px solid var(--border-default)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              overflow: 'hidden', position: 'relative',
            }}>
              {logoPreview ? (
                <img
                  src={logoPreview}
                  alt="Logo del despacho"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }}
                />
              ) : (
                <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                  <Building2 size={32} style={{ opacity: 0.4 }} />
                  <div style={{ fontSize: '0.65rem', marginTop: 4 }}>Sin logo</div>
                </div>
              )}
            </div>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Vista previa</span>
          </div>

          {/* Zona de drop / selector */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'var(--accent-400)' : 'var(--border-default)'}`,
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--sp-6)',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                transition: 'all 0.2s',
              }}
            >
              <Upload size={28} style={{ color: 'var(--accent-400)', marginBottom: 'var(--sp-2)' }} />
              <p style={{ margin: 0, fontWeight: 500, fontSize: '0.875rem' }}>
                Arrastra tu logo aquí o <span style={{ color: 'var(--accent-400)' }}>haz clic para seleccionar</span>
              </p>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                JPG, PNG, SVG, WebP · Máximo 10 MB
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/svg+xml,image/webp"
              style={{ display: 'none' }}
              onChange={e => { const f = e.target.files?.[0]; if (f) handleFileSelect(f); }}
            />

            {/* Acciones cuando hay archivo seleccionado */}
            {logoFile && (
              <div style={{ display: 'flex', gap: 'var(--sp-2)', marginTop: 'var(--sp-3)', alignItems: 'center' }}>
                <span style={{ flex: 1, fontSize: '0.8rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  📎 {logoFile.name}
                </span>
                <button
                  className="btn btn-primary btn-sm"
                  onClick={() => logoMutation.mutate(logoFile)}
                  disabled={logoMutation.isPending}
                >
                  {logoMutation.isPending ? <Loader2 size={14} className="spinning" /> : <Upload size={14} />}
                  Subir logo
                </button>
                <button
                  className="btn btn-ghost btn-icon btn-icon-sm"
                  onClick={() => { setLogoFile(null); setLogoPreview(despachoApi.getLogoUrl(despacho?.logo)); }}
                  title="Cancelar"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {!logoFile && logoPreview && (
              <button
                className="btn btn-ghost btn-sm"
                style={{ marginTop: 'var(--sp-2)', color: 'var(--danger)', fontSize: '0.8rem' }}
                onClick={() => {
                  setLogoPreview(null);
                  saveMutation.mutate({ ...form, logo: null });
                }}
              >
                <X size={13} /> Eliminar logo actual
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── INFO GENERAL + DIRECCIÓN ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        {/* Información General */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
            <div style={{ width: 36, height: 36, borderRadius: 'var(--radius-md)', background: 'var(--accent-glow)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent-400)' }}>
              <Building2 size={18} />
            </div>
            <h3>Información General</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label">Nombre del Despacho *</label>
              <input id="cfg-nombre" type="text" className="form-input" value={form.nombre || ''} onChange={set('nombre')} />
            </div>
            <div className="form-group">
              <label className="form-label">Nombre Comercial</label>
              <input id="cfg-comercial" type="text" className="form-input" value={form.nombreComercial || ''} onChange={set('nombreComercial')} placeholder="Nombre para mostrar a clientes" />
            </div>
            <div className="form-group">
              <label className="form-label">RFC</label>
              <input id="cfg-rfc" type="text" className="form-input" value={form.rfc || ''} onChange={set('rfc')} maxLength={13} placeholder="XAXX010101000" />
            </div>
            <div className="form-group">
              <label className="form-label">Email de Contacto</label>
              <input id="cfg-email" type="email" className="form-input" value={form.email || ''} onChange={set('email')} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input id="cfg-telefono" type="tel" className="form-input" value={form.telefono || ''} onChange={set('telefono')} />
            </div>
            <div className="form-group">
              <label className="form-label">Sitio Web</label>
              <input id="cfg-web" type="url" className="form-input" value={form.sitioWeb || ''} onChange={set('sitioWeb')} placeholder="https://www.despacho.com" />
            </div>
          </div>
        </div>

        {/* Dirección */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--sp-5)' }}>Dirección y Ubicación</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>
            <div className="form-group">
              <label className="form-label">Dirección</label>
              <input id="cfg-dir" type="text" className="form-input" value={form.direccion || ''} onChange={set('direccion')} placeholder="Calle, número, colonia" />
            </div>
            <div className="form-group">
              <label className="form-label">Ciudad</label>
              <input id="cfg-ciudad" type="text" className="form-input" value={form.ciudad || ''} onChange={set('ciudad')} />
            </div>
            <div className="form-group">
              <label className="form-label">Estado</label>
              <input id="cfg-estado" type="text" className="form-input" value={form.estado || ''} onChange={set('estado')} placeholder="Ej: Ciudad de México" />
            </div>
          </div>

          {/* Integración WhatsApp — oculta hasta que la funcionalidad esté activa.
              El bloque se deja comentado (no borrado) para reactivarla mostrándolo de nuevo.
          <div style={{ marginTop: 'var(--sp-6)', paddingTop: 'var(--sp-5)', borderTop: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)' }}>
              <h3>Integración WhatsApp</h3>
              <span className="badge badge-warning" style={{ fontSize: '0.65rem' }}>Próximamente</span>
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)', lineHeight: 1.5 }}>
              La integración con WhatsApp Business API está preparada para activación futura.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', opacity: 0.5 }}>
              <div className="form-group">
                <label className="form-label">Número de WhatsApp Business</label>
                <input id="cfg-wa-num" type="tel" className="form-input" value={form.whatsappNumero || ''} placeholder="+52 55 0000 0000" disabled />
              </div>
              <div className="form-group">
                <label className="form-label">Token API WhatsApp</label>
                <input id="cfg-wa-token" type="password" className="form-input" value={form.whatsappToken || ''} placeholder="Token de acceso" disabled />
              </div>
            </div>
          </div>
          */}
        </div>
      </div>

      <div style={{ padding: 'var(--sp-4)', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', borderRadius: 'var(--radius-md)', marginTop: 'var(--sp-4)' }}>
        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
          💡 Los cambios se guardan automáticamente para <strong>{form.nombre}</strong>.
        </p>
      </div>
    </div>
  );
}
