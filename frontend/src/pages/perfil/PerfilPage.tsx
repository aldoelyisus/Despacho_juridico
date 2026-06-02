import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheck, ShieldOff, Shield, Copy, Check,
  Loader2, X, QrCode, KeyRound, Eye, EyeOff,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';

// ── 6-digit input reutilizable ─────────────────────────────────────────────
function CodeInput({ value, onChange, placeholder = '000000' }: any) {
  return (
    <input
      className="form-input"
      style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 700, letterSpacing: 8, fontFamily: 'monospace' }}
      type="text"
      inputMode="numeric"
      maxLength={6}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
      autoFocus
    />
  );
}

// ── Modal: Activar 2FA ─────────────────────────────────────────────────────
function Activate2FAModal({ onClose, onSuccess }: any) {
  const [step, setStep] = useState<'qr' | 'confirm' | 'done'>('qr');
  const [code, setCode] = useState('');
  const [qrData, setQrData] = useState<{ qrCode: string; secret: string } | null>(null);
  const [backupCodes, setBackupCodes] = useState<string[]>([]);
  const [copiedAll, setCopiedAll] = useState(false);
  const [secretVisible, setSecretVisible] = useState(false);

  const setupM = useMutation({
    mutationFn: authApi.setup2FA,
    onSuccess: data => { setQrData(data); },
    onError: () => toast.error('Error al generar el QR'),
  });

  const enableM = useMutation({
    mutationFn: () => authApi.enable2FA(code),
    onSuccess: data => {
      setBackupCodes(data.backupCodes);
      setStep('done');
      onSuccess();
    },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Código incorrecto'),
  });

  // Auto-generar QR al abrir
  useState(() => { setupM.mutate(); });

  const copyAll = () => {
    navigator.clipboard.writeText(backupCodes.join('\n'));
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    toast.success('Códigos copiados');
  };

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldCheck size={18} style={{ color: 'var(--accent-400)' }} />
            Activar Autenticación en Dos Pasos
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body">
          {/* ── Paso 1: Escanear QR ── */}
          {step === 'qr' && (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--sp-4)', fontSize: '0.875rem' }}>
                Escanea este código QR con <strong>Google Authenticator</strong>,{' '}
                <strong>Authy</strong> o cualquier app TOTP.
              </p>

              {setupM.isPending && (
                <div style={{ padding: 'var(--sp-8)' }}><Loader2 size={32} className="spinning" style={{ color: 'var(--accent-400)' }} /></div>
              )}

              {qrData && (
                <>
                  <div style={{
                    display: 'inline-block', padding: 12,
                    background: '#fff', borderRadius: 'var(--radius-lg)',
                    boxShadow: '0 4px 24px rgba(0,0,0,0.3)', marginBottom: 'var(--sp-4)',
                  }}>
                    <img src={qrData.qrCode} alt="QR 2FA" style={{ width: 200, height: 200, display: 'block' }} />
                  </div>

                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: 'var(--sp-2)' }}>
                    ¿No puedes escanear? Ingresa este código manualmente:
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 'var(--sp-4)' }}>
                    <code style={{
                      background: 'var(--bg-elevated)', padding: '6px 12px',
                      borderRadius: 'var(--radius-sm)', letterSpacing: 2,
                      fontSize: '0.85rem', color: 'var(--accent-400)',
                      fontFamily: 'monospace', userSelect: 'all',
                      filter: secretVisible ? 'none' : 'blur(5px)',
                      transition: 'filter 0.2s',
                    }}>
                      {qrData.secret}
                    </code>
                    <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => setSecretVisible(v => !v)}>
                      {secretVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                    <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => {
                      navigator.clipboard.writeText(qrData.secret);
                      toast.success('Copiado');
                    }}>
                      <Copy size={14} />
                    </button>
                  </div>

                  <button className="btn btn-primary" style={{ width: '100%' }} onClick={() => setStep('confirm')}>
                    Ya lo escaneé — Continuar
                  </button>
                </>
              )}
            </div>
          )}

          {/* ── Paso 2: Confirmar código ── */}
          {step === 'confirm' && (
            <div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 12,
                background: 'rgba(99,102,241,0.08)', borderRadius: 'var(--radius-md)',
                padding: 'var(--sp-3)', marginBottom: 'var(--sp-5)',
              }}>
                <QrCode size={20} style={{ color: 'var(--accent-400)', flexShrink: 0 }} />
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  Abre <strong>Google Authenticator</strong> y escribe el código de 6 dígitos que aparece para esta cuenta.
                </p>
              </div>

              <div className="form-group">
                <label className="form-label">Código de verificación</label>
                <CodeInput value={code} onChange={setCode} />
              </div>
            </div>
          )}

          {/* ── Paso 3: Backup codes ── */}
          {step === 'done' && (
            <div>
              <div style={{
                background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)',
                borderRadius: 'var(--radius-md)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <KeyRound size={16} style={{ color: '#f59e0b' }} />
                  <strong style={{ color: '#f59e0b', fontSize: '0.875rem' }}>¡Guarda estos códigos de respaldo!</strong>
                </div>
                <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                  Si pierdes tu teléfono, puedes usar uno de estos códigos para acceder. <strong>Cada código se usa una sola vez.</strong>
                </p>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr',
                gap: 'var(--sp-2)', marginBottom: 'var(--sp-4)',
              }}>
                {backupCodes.map((c, i) => (
                  <div key={i} style={{
                    background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                    fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 600,
                    textAlign: 'center', letterSpacing: 2, color: 'var(--text-primary)',
                  }}>
                    {c}
                  </div>
                ))}
              </div>

              <button className="btn btn-secondary" style={{ width: '100%' }} onClick={copyAll}>
                {copiedAll ? <Check size={15} /> : <Copy size={15} />}
                {copiedAll ? 'Copiados ✓' : 'Copiar todos los códigos'}
              </button>
            </div>
          )}
        </div>

        <div className="modal-footer">
          {step === 'qr' && (
            <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          )}
          {step === 'confirm' && (
            <>
              <button className="btn btn-secondary" onClick={() => setStep('qr')}>Atrás</button>
              <button
                className="btn btn-primary"
                disabled={code.length < 6 || enableM.isPending}
                onClick={() => enableM.mutate()}
              >
                {enableM.isPending && <Loader2 size={15} className="spinning" />}
                Activar 2FA
              </button>
            </>
          )}
          {step === 'done' && (
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={onClose}>
              <ShieldCheck size={15} /> Listo — 2FA activado
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal: Desactivar 2FA ──────────────────────────────────────────────────
function Deactivate2FAModal({ onClose, onSuccess }: any) {
  const [code, setCode] = useState('');

  const disableM = useMutation({
    mutationFn: () => authApi.disable2FA(code),
    onSuccess: () => { toast.success('2FA desactivado'); onSuccess(); onClose(); },
    onError: (e: any) => toast.error(e.response?.data?.message || 'Código incorrecto'),
  });

  return (
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldOff size={18} style={{ color: 'var(--danger)' }} />
            Desactivar Autenticación en Dos Pasos
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="modal-body">
          <div style={{
            background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: 'var(--radius-md)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-5)',
          }}>
            <p style={{ margin: 0, fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              ⚠️ Al desactivar el 2FA tu cuenta será menos segura. Solo se solicitará contraseña para iniciar sesión.
            </p>
          </div>
          <div className="form-group">
            <label className="form-label">Confirma con tu código actual de Google Authenticator</label>
            <CodeInput value={code} onChange={setCode} />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
          <button
            className="btn btn-danger"
            disabled={code.length < 6 || disableM.isPending}
            onClick={() => disableM.mutate()}
          >
            {disableM.isPending && <Loader2 size={15} className="spinning" />}
            Desactivar 2FA
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página Principal ───────────────────────────────────────────────────────
export default function PerfilPage() {
  const { usuario } = useAuthStore();
  const qc = useQueryClient();
  const [showActivate, setShowActivate] = useState(false);
  const [showDeactivate, setShowDeactivate] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['2fa-status'],
    queryFn: authApi.get2FAStatus,
  });

  const refresh = () => qc.invalidateQueries({ queryKey: ['2fa-status'] });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Mi Perfil</h1>
          <p className="page-subtitle">Información personal y configuración de seguridad</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)', alignItems: 'start' }}>

        {/* Info de usuario */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--sp-5)' }}>Información de la cuenta</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)', marginBottom: 'var(--sp-5)' }}>
            <div style={{
              width: 64, height: 64, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--accent-500), var(--accent-700))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.5rem', fontWeight: 700, color: '#fff', flexShrink: 0,
            }}>
              {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                {usuario?.nombre} {usuario?.apellido}
              </div>
              <div style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{usuario?.email}</div>
              <div style={{ marginTop: 4 }}>
                <span className="badge badge-info" style={{ fontSize: '0.72rem' }}>{usuario?.rol?.nombre}</span>
              </div>
            </div>
          </div>
          {usuario?.despacho && (
            <div style={{
              padding: 'var(--sp-3)', background: 'var(--bg-elevated)',
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
              fontSize: '0.8rem', color: 'var(--text-muted)',
            }}>
              🏛️ <strong style={{ color: 'var(--text-secondary)' }}>{usuario.despacho.nombre}</strong>
            </div>
          )}
        </div>

        {/* Seguridad — 2FA */}
        <div className="card">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-5)' }}>
            <div style={{
              width: 36, height: 36, borderRadius: 'var(--radius-md)',
              background: status?.twoFactorEnabled ? 'rgba(16,185,129,0.12)' : 'rgba(99,102,241,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Shield size={18} style={{ color: status?.twoFactorEnabled ? '#10b981' : 'var(--accent-400)' }} />
            </div>
            <h3>Autenticación en Dos Pasos</h3>
          </div>

          {isLoading ? (
            <div style={{ textAlign: 'center', padding: 'var(--sp-6)' }}><div className="spinner" /></div>
          ) : (
            <>
              {/* Estado actual */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: 'var(--sp-4)',
                background: status?.twoFactorEnabled ? 'rgba(16,185,129,0.08)' : 'var(--bg-elevated)',
                border: `1px solid ${status?.twoFactorEnabled ? 'rgba(16,185,129,0.25)' : 'var(--border-subtle)'}`,
                borderRadius: 'var(--radius-md)', marginBottom: 'var(--sp-4)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  {status?.twoFactorEnabled
                    ? <ShieldCheck size={20} style={{ color: '#10b981' }} />
                    : <ShieldOff size={20} style={{ color: 'var(--text-muted)' }} />
                  }
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                      {status?.twoFactorEnabled ? '2FA Activado' : '2FA Desactivado'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      {status?.twoFactorEnabled
                        ? `${status.backupCodesRemaining} códigos de respaldo disponibles`
                        : 'Tu cuenta solo requiere contraseña'}
                    </div>
                  </div>
                </div>
                <span className={`badge ${status?.twoFactorEnabled ? 'badge-success' : 'badge-muted'}`}>
                  {status?.twoFactorEnabled ? 'Activo' : 'Inactivo'}
                </span>
              </div>

              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)', lineHeight: 1.6 }}>
                {status?.twoFactorEnabled
                  ? 'Cada vez que inicies sesión necesitarás ingresar el código de 6 dígitos de Google Authenticator.'
                  : 'Agrega una capa extra de seguridad. Necesitarás tu teléfono con Google Authenticator para iniciar sesión.'}
              </p>

              {status?.twoFactorEnabled ? (
                <button
                  className="btn btn-danger"
                  style={{ width: '100%' }}
                  onClick={() => setShowDeactivate(true)}
                >
                  <ShieldOff size={15} /> Desactivar 2FA
                </button>
              ) : (
                <button
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  onClick={() => setShowActivate(true)}
                >
                  <ShieldCheck size={15} /> Activar 2FA con Google Authenticator
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {showActivate && (
        <Activate2FAModal
          onClose={() => setShowActivate(false)}
          onSuccess={refresh}
        />
      )}
      {showDeactivate && (
        <Deactivate2FAModal
          onClose={() => setShowDeactivate(false)}
          onSuccess={refresh}
        />
      )}
    </div>
  );
}
