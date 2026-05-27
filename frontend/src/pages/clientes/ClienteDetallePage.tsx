import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, FolderOpen } from 'lucide-react';
import { clientesApi } from '../../api/clientes.api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export default function ClienteDetallePage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: cliente, isLoading } = useQuery({
    queryKey: ['cliente', id],
    queryFn: () => clientesApi.get(+id!),
  });

  if (isLoading) return <div className="dashboard-loading"><div className="spinner spinner-lg" /></div>;
  if (!cliente) return <div>Cliente no encontrado</div>;

  return (
    <div>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}>
          <button className="btn btn-ghost btn-icon" onClick={() => navigate(-1)}><ArrowLeft size={18} /></button>
          <div>
            <h1 className="page-title">{cliente.nombre} {cliente.apellido}</h1>
            <p className="page-subtitle">Detalle del cliente</p>
          </div>
        </div>
        <span className={`badge ${cliente.activo ? 'badge-success' : 'badge-muted'}`}>
          {cliente.activo ? 'Activo' : 'Inactivo'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-4)' }}>
        {/* Info card */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Información Personal</h3>
          {[
            ['Email', cliente.email],
            ['Teléfono', cliente.telefono],
            ['Celular', cliente.celular],
            ['RFC', cliente.rfc],
            ['CURP', cliente.curp],
            ['Dirección', cliente.direccion],
            ['Ciudad', cliente.ciudad],
          ].map(([label, val]) => val ? (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: 'var(--sp-2) 0', borderBottom: '1px solid var(--border-subtle)' }}>
              <span style={{ color: 'var(--text-muted)', fontSize: '0.875rem' }}>{label}</span>
              <span style={{ fontSize: '0.875rem' }}>{val}</span>
            </div>
          ) : null)}
        </div>

        {/* Expedientes */}
        <div className="card">
          <h3 style={{ marginBottom: 'var(--sp-4)' }}>Expedientes Asociados ({cliente.expedientes?.length || 0})</h3>
          {cliente.expedientes?.length ? (
            cliente.expedientes.map((e: any) => (
              <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-3)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--sp-2)' }}>
                <div>
                  <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{e.numero}</div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{e.titulo}</div>
                </div>
                <span className={`badge badge-${{ activo: 'success', ganado: 'success', perdido: 'danger', cerrado: 'muted', en_proceso: 'info' }[e.estado] || 'muted'}`}>{e.estado}</span>
              </div>
            ))
          ) : (
            <div className="empty-state" style={{ padding: 'var(--sp-6) 0' }}>
              <FolderOpen size={24} style={{ opacity: 0.3 }} />
              <p>Sin expedientes asociados</p>
            </div>
          )}
        </div>
      </div>

      {/* Notas */}
      {cliente.notas && (
        <div className="card">
          <h3 style={{ marginBottom: 'var(--sp-3)' }}>Notas</h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', lineHeight: 1.6 }}>{cliente.notas}</p>
        </div>
      )}
    </div>
  );
}
