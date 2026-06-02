import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Scale, Eye, EyeOff, Loader2, ShieldCheck, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';
import './AuthPages.css';

// ── Componente OTP (6 cajas individuales) ────────────────────────────────────
function OtpInput({ onComplete }: { onComplete: (code: string) => void }) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, val: string) => {
    const digit = val.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[idx] = digit;
    setDigits(next);
    if (digit && idx < 5) inputs.current[idx + 1]?.focus();
    if (next.every(d => d !== '')) onComplete(next.join(''));
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !digits[idx] && idx > 0) {
      inputs.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      const next = pasted.split('');
      setDigits(next);
      inputs.current[5]?.focus();
      onComplete(pasted);
    }
    e.preventDefault();
  };

  return (
    <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
      {digits.map((d, i) => (
        <input
          key={i}
          ref={el => { inputs.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={d}
          onChange={e => handleChange(i, e.target.value)}
          onKeyDown={e => handleKeyDown(i, e)}
          onPaste={handlePaste}
          autoFocus={i === 0}
          style={{
            width: 48, height: 56, textAlign: 'center',
            fontSize: '1.4rem', fontWeight: 700,
            background: 'var(--bg-elevated)',
            border: `2px solid ${d ? 'var(--accent-400)' : 'var(--border-default)'}`,
            borderRadius: 'var(--radius-md)',
            color: 'var(--text-primary)',
            outline: 'none',
            transition: 'border-color 0.15s',
            caretColor: 'var(--accent-400)',
          }}
        />
      ))}
    </div>
  );
}

// ── Login Page ────────────────────────────────────────────────────────────────
export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [form, setForm] = useState({ email: '', password: '' });
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);

  // Estado 2FA
  const [step, setStep] = useState<'credentials' | '2fa'>('credentials');
  const [tempToken, setTempToken] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await authApi.login(form.email, form.password);

      if (data.requires2FA) {
        setTempToken(data.tempToken);
        setStep('2fa');
        return;
      }

      setAuth(data.accessToken, data.refreshToken, data.usuario);
      const isRoot = data.usuario?.rol?.nombre?.toLowerCase() === 'root';
      navigate(isRoot ? '/root' : '/dashboard');
      toast.success(`¡Bienvenido, ${data.usuario.nombre}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Credenciales incorrectas');
    } finally {
      setLoading(false);
    }
  };

  const handle2FA = async (code: string) => {
    setLoading(true);
    try {
      const data = await authApi.verify2FA(tempToken, code);
      setAuth(data.accessToken, data.refreshToken, data.usuario);
      const isRoot = data.usuario?.rol?.nombre?.toLowerCase() === 'root';
      navigate(isRoot ? '/root' : '/dashboard');
      toast.success(`¡Bienvenido, ${data.usuario.nombre}!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Código incorrecto');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-bg">
        <div className="auth-bg-orb auth-bg-orb-1" />
        <div className="auth-bg-orb auth-bg-orb-2" />
        <div className="auth-bg-grid" />
      </div>

      <div className="auth-card" style={{ transition: 'all 0.3s' }}>

        {/* ── PASO 1: Credenciales ── */}
        {step === 'credentials' && (
          <>
            <div className="auth-logo">
              <div className="auth-logo-icon"><Scale size={28} /></div>
            </div>
            <h1 className="auth-title">Bienvenido de regreso</h1>
            <p className="auth-subtitle">Ingresa tus credenciales para acceder</p>

            <form onSubmit={handleSubmit} className="auth-form">
              <div className="form-group">
                <label className="form-label">Correo electrónico</label>
                <input
                  id="login-email"
                  type="email"
                  className="form-input"
                  placeholder="admin@despacho.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Contraseña</label>
                <div className="input-icon-right">
                  <input
                    id="login-password"
                    type={showPass ? 'text' : 'password'}
                    className="form-input"
                    placeholder="••••••••"
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    required
                  />
                  <button
                    type="button"
                    className="input-toggle-pass"
                    onClick={() => setShowPass(!showPass)}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                id="login-submit"
                type="submit"
                className="btn btn-primary w-full btn-lg"
                disabled={loading}
              >
                {loading ? <Loader2 size={18} className="spinning" /> : null}
                {loading ? 'Verificando...' : 'Iniciar Sesión'}
              </button>
            </form>
          </>
        )}

        {/* ── PASO 2: Código 2FA ── */}
        {step === '2fa' && (
          <>
            <div className="auth-logo">
              <div className="auth-logo-icon" style={{ background: 'rgba(99,102,241,0.15)' }}>
                <ShieldCheck size={28} style={{ color: 'var(--accent-400)' }} />
              </div>
            </div>
            <h1 className="auth-title">Verificación en dos pasos</h1>
            <p className="auth-subtitle" style={{ marginBottom: 'var(--sp-6)' }}>
              Abre <strong>Google Authenticator</strong> e ingresa el código de 6 dígitos
            </p>

            <div style={{ marginBottom: 'var(--sp-6)' }}>
              <OtpInput onComplete={handle2FA} />
            </div>

            {loading && (
              <div style={{ textAlign: 'center', marginBottom: 'var(--sp-4)' }}>
                <Loader2 size={22} className="spinning" style={{ color: 'var(--accent-400)' }} />
              </div>
            )}

            <p style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 'var(--sp-4)' }}>
              ¿Sin acceso a tu app? Puedes usar un <strong>código de respaldo</strong> (formato XXXX-XXXX)
            </p>

            {/* Backup code input */}
            <BackupCodeInput onSubmit={handle2FA} loading={loading} />

            <button
              className="btn btn-ghost btn-sm"
              style={{ width: '100%', marginTop: 'var(--sp-4)' }}
              onClick={() => { setStep('credentials'); setTempToken(''); }}
            >
              <ArrowLeft size={14} /> Volver al inicio de sesión
            </button>
          </>
        )}
      </div>
    </div>
  );
}

// Componente inline para backup codes
function BackupCodeInput({ onSubmit, loading }: { onSubmit: (code: string) => void; loading: boolean }) {
  const [show, setShow] = useState(false);
  const [code, setCode] = useState('');

  if (!show) {
    return (
      <button
        className="btn btn-ghost btn-sm"
        style={{ width: '100%', fontSize: '0.8rem' }}
        onClick={() => setShow(true)}
      >
        Usar código de respaldo
      </button>
    );
  }

  return (
    <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
      <input
        className="form-input"
        placeholder="XXXX-XXXX"
        value={code}
        onChange={e => setCode(e.target.value.toUpperCase())}
        style={{ fontFamily: 'monospace', letterSpacing: 2 }}
        autoFocus
      />
      <button
        className="btn btn-primary"
        disabled={loading || code.length < 9}
        onClick={() => onSubmit(code)}
      >
        Verificar
      </button>
    </div>
  );
}
