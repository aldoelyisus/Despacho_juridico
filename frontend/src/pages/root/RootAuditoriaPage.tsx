import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Activity } from 'lucide-react';
import { rootApi } from '../../api/root.api';
import Pagination from '../../components/Pagination';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ACCION_COLORS: Record<string, string> = {
  CREAR: 'badge-success',
  ACTUALIZAR: 'badge-info',
  ELIMINAR: 'badge-danger',
  LOGIN_EXITOSO: 'badge-success',
  LOGIN_FALLIDO: 'badge-danger',
  LOGIN_BLOQUEADO: 'badge-danger',
  CUENTA_BLOQUEADA: 'badge-danger',
  LOGIN_REQUIERE_2FA: 'badge-info',
  LOGIN_REQUIERE_CAMBIO_PASSWORD: 'badge-info',
  '2FA_EXITOSO': 'badge-success',
  '2FA_FALLIDO': 'badge-danger',
  PASSWORD_CAMBIO_COMPLETADO: 'badge-success',
};

export default function RootAuditoriaPage() {
  const [pagina, setPagina] = useState(1);
  const [accionFilter, setAccionFilter] = useState('');
  const [moduloFilter, setModuloFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['root-auditoria-logs', pagina, accionFilter, moduloFilter],
    queryFn: () => rootApi.auditoria({
      pagina,
      limite: 50,
      accion: accionFilter || undefined,
      modulo: moduloFilter || undefined,
    }),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Auditoría del Sistema</h1>
          <p className="page-subtitle">Registro de acciones realizadas desde el panel de administración</p>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <div style={{ display: 'flex', gap: 'var(--sp-3)', flexWrap: 'wrap', alignItems: 'center' }}>
          <select
            className="form-select"
            style={{ maxWidth: 180 }}
            value={accionFilter}
            onChange={(e) => { setAccionFilter(e.target.value); setPagina(1); }}
          >
            <option value="">Todas las acciones</option>
            {['CREAR', 'ACTUALIZAR', 'ELIMINAR'].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
          <input
            type="text"
            className="form-input"
            placeholder="Filtrar por módulo..."
            style={{ maxWidth: 220 }}
            value={moduloFilter}
            onChange={(e) => { setModuloFilter(e.target.value); setPagina(1); }}
          />
          {(accionFilter || moduloFilter) && (
            <button className="btn btn-ghost btn-sm" onClick={() => { setAccionFilter(''); setModuloFilter(''); setPagina(1); }}>
              Limpiar filtros
            </button>
          )}
          <span style={{ marginLeft: 'auto', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            {data?.total || 0} registros
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Usuario</th>
              <th>Acción</th>
              <th>Módulo</th>
              <th>Descripción</th>
              <th>IP</th>
              <th>Duración</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={7} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
                <div className="spinner" />
              </td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={7}>
                <div className="empty-state">
                  <Activity size={40} style={{ opacity: 0.3 }} />
                  <h3>Sin registros de auditoría</h3>
                  <p>Las acciones del panel de administración aparecerán aquí automáticamente</p>
                </div>
              </td></tr>
            ) : data?.items?.map((log: any) => (
              <tr key={log.id}>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                  {format(new Date(log.createdAt), 'dd/MM/yy HH:mm:ss', { locale: es })}
                </td>
                <td style={{ fontSize: '0.8125rem' }}>
                  {log.usuarioNombre || <span style={{ color: 'var(--text-muted)' }}>Sistema</span>}
                </td>
                <td>
                  <span className={`badge ${ACCION_COLORS[log.accion] || 'badge-muted'}`}>
                    {log.accion}
                  </span>
                </td>
                <td>
                  <span style={{ fontSize: '0.8rem', color: 'var(--accent-400)', fontWeight: 500 }}>
                    {log.modulo}
                  </span>
                </td>
                <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', maxWidth: 320 }}>
                  <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {log.descripcion}
                  </div>
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                  {log.ip || '—'}
                </td>
                <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  {log.duracionMs ? `${log.duracionMs}ms` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {data && (
        <Pagination
          pagina={pagina}
          totalPaginas={data.totalPaginas}
          total={data.total}
          limite={50}
          onChange={setPagina}
        />
      )}
    </div>
  );
}
