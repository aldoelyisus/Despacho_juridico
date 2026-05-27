import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Scale, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { authApi } from '../../api/auth.api';
import { useAuthStore } from '../../stores/authStore';
import './AuthPages.css';

export default function RegisterPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    nombreDespacho: '',
    nombre: '',
    apellido: '',
    email: '',
    password: '',
    telefono: '',
  });

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.register(form);
      toast.success('Despacho registrado exitosamente. Inicia sesión.');
      navigate('/login');
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Error al registrar');
    } finally {
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

      <div className="auth-card auth-card-lg">
        <div className="auth-logo">
          <div className="auth-logo-icon"><Scale size={28} /></div>
        </div>
        <h1 className="auth-title">Registrar Despacho</h1>
        <p className="auth-subtitle">Crea tu cuenta de administrador</p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label className="form-label">Nombre del Despacho *</label>
            <input id="reg-despacho" type="text" className="form-input" placeholder="García & Asociados" value={form.nombreDespacho} onChange={set('nombreDespacho')} required />
          </div>

          <div className="auth-form-row">
            <div className="form-group">
              <label className="form-label">Nombre *</label>
              <input id="reg-nombre" type="text" className="form-input" placeholder="Carlos" value={form.nombre} onChange={set('nombre')} required />
            </div>
            <div className="form-group">
              <label className="form-label">Apellido *</label>
              <input id="reg-apellido" type="text" className="form-input" placeholder="García" value={form.apellido} onChange={set('apellido')} required />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Correo electrónico *</label>
            <input id="reg-email" type="email" className="form-input" placeholder="admin@despacho.com" value={form.email} onChange={set('email')} required />
          </div>

          <div className="auth-form-row">
            <div className="form-group">
              <label className="form-label">Contraseña *</label>
              <input id="reg-password" type="password" className="form-input" placeholder="Mín. 6 caracteres" value={form.password} onChange={set('password')} required minLength={6} />
            </div>
            <div className="form-group">
              <label className="form-label">Teléfono</label>
              <input id="reg-telefono" type="tel" className="form-input" placeholder="+52 55 0000 0000" value={form.telefono} onChange={set('telefono')} />
            </div>
          </div>

          <button id="reg-submit" type="submit" className="btn btn-primary w-full btn-lg" disabled={loading}>
            {loading ? <Loader2 size={18} className="spinning" /> : null}
            {loading ? 'Registrando...' : 'Crear Despacho'}
          </button>
        </form>

        <p className="auth-footer">
          ¿Ya tienes cuenta? <Link to="/login">Iniciar sesión</Link>
        </p>
      </div>
    </div>
  );
}
