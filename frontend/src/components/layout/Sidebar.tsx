import { NavLink, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard, Users, FolderOpen, Calendar,
  CreditCard, UserCog, BookOpen, Settings,
  ChevronLeft, Scale, LogOut, Activity, Building2,
  DollarSign, Crown, Tag, Package, MessageSquare,
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { despachoApi } from '../../api/despacho.api';
import './Sidebar.css';

const normalNavItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/clientes',     icon: Users,           label: 'Clientes' },
  { to: '/expedientes',  icon: FolderOpen,      label: 'Expedientes' },
  { to: '/agenda',       icon: Calendar,        label: 'Agenda' },
  { to: '/pagos',        icon: CreditCard,      label: 'Pagos' },
  { separator: true },
  { to: '/catalogos',    icon: BookOpen,        label: 'Catálogos' },
  { to: '/descuentos',   icon: Tag,             label: 'Descuentos' },
  { to: '/usuarios',     icon: UserCog,         label: 'Usuarios' },
  { to: '/auditoria',    icon: Activity,        label: 'Auditoría' },
  { to: '/configuracion',icon: Settings,        label: 'Configuración' },
];

const rootNavItems = [
  { to: '/root/dashboard',     icon: LayoutDashboard, label: 'Dashboard Global' },
  { separator: true },
  { to: '/root/despachos',     icon: Building2,       label: 'Despachos' },
  { to: '/root/planes',        icon: Package,         label: 'Planes' },
  { to: '/root/mensualidades', icon: DollarSign,      label: 'Mensualidades' },
  { to: '/root/landing',       icon: MessageSquare,   label: 'Landing' },
  { to: '/root/auditoria',     icon: Activity,        label: 'Auditoría' },
];

interface Props {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const { usuario, logout } = useAuthStore();
  const navigate = useNavigate();
  const isRoot = usuario?.rol?.nombre?.toLowerCase() === 'root';
  const navItems = isRoot ? rootNavItems : normalNavItems;

  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <aside className={`sidebar ${collapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        {isRoot ? (
          <>
            <div className="sidebar-logo-icon">
              <Crown size={22} style={{ color: '#f59e0b' }} />
            </div>
            {!collapsed && (
              <div className="sidebar-logo-text">
                <span className="sidebar-brand">Sistema</span>
                <span className="sidebar-brand-sub">Root</span>
              </div>
            )}
          </>
        ) : usuario?.despacho?.logo ? (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: collapsed ? 'center' : 'flex-start', overflow: 'hidden' }}>
            <img
              src={despachoApi.getLogoUrl(usuario.despacho.logo) || ''}
              alt="Logo"
              style={{ maxHeight: 40, maxWidth: collapsed ? 32 : 160, objectFit: 'contain' }}
            />
          </div>
        ) : (
          <>
            <div className="sidebar-logo-icon">
              <Scale size={22} />
            </div>
            {!collapsed && (
              <div className="sidebar-logo-text">
                <span className="sidebar-brand">Despacho</span>
                <span className="sidebar-brand-sub">Jurídico</span>
              </div>
            )}
          </>
        )}
        <button className="sidebar-toggle" onClick={onToggle} data-tooltip={collapsed ? 'Expandir' : 'Colapsar'}>
          <ChevronLeft size={16} />
        </button>
      </div>

      {/* Despacho / badge root */}
      {!collapsed && (
        <div className="sidebar-despacho">
          {isRoot ? (
            <div className="sidebar-despacho-name" style={{ color: '#f59e0b', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Crown size={13} /> Panel Administrador
            </div>
          ) : usuario?.despacho ? (
            <div className="sidebar-despacho-name">{usuario.despacho.nombre}</div>
          ) : null}
        </div>
      )}

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map((item, i) => {
          if ('separator' in item && item.separator) {
            return <div key={i} className="sidebar-divider" />;
          }
          const Icon = (item as any).icon;
          return (
            <NavLink
              key={(item as any).to}
              to={(item as any).to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              data-tooltip={collapsed ? (item as any).label : undefined}
            >
              <Icon size={20} className="sidebar-link-icon" />
              {!collapsed && <span className="sidebar-link-label">{(item as any).label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* User section */}
      <div className="sidebar-user">
        {!collapsed ? (
          <>
            <Link to={isRoot ? '/root/perfil' : '/perfil'} style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, textDecoration: 'none', minWidth: 0 }}>
              <div className="avatar" style={isRoot ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)', flexShrink: 0 } : { flexShrink: 0 }}>
                {usuario?.nombre?.[0]}{usuario?.apellido?.[0]}
              </div>
              <div className="sidebar-user-info" style={{ minWidth: 0 }}>
                <div className="sidebar-user-name" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{usuario?.nombre} {usuario?.apellido}</span>
                </div>
                <div className="sidebar-user-role" style={isRoot ? { color: '#f59e0b' } : {}}>
                  {isRoot ? 'Administrador' : usuario?.rol?.nombre}
                </div>
              </div>
            </Link>
            <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={handleLogout} data-tooltip="Cerrar sesión">
              <LogOut size={16} />
            </button>
          </>
        ) : (
          <button className="btn btn-ghost btn-icon" onClick={handleLogout} data-tooltip="Cerrar sesión">
            <LogOut size={18} />
          </button>
        )}
      </div>
    </aside>
  );
}
