import { Menu } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import './Header.css';

interface Props {
  onMenuToggle: () => void;
}

export default function Header({ onMenuToggle }: Props) {
  const { usuario } = useAuthStore();

  return (
    <header className="app-header">
      <button className="btn btn-ghost btn-icon" onClick={onMenuToggle}>
        <Menu size={20} />
      </button>

      <div className="header-right">
        <div className="header-user">
          <div className="avatar avatar-sm">{usuario?.nombre?.[0]}{usuario?.apellido?.[0]}</div>
          <div className="header-user-info">
            <div className="header-user-name">{usuario?.nombre} {usuario?.apellido}</div>
            <div className="header-user-role">{usuario?.despacho?.nombre}</div>
          </div>
        </div>
      </div>
    </header>
  );
}
