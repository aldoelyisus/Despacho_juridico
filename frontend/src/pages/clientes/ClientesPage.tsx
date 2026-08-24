import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Eye, Edit, Trash2, Users } from 'lucide-react';
import toast from 'react-hot-toast';
import { clientesApi } from '../../api/clientes.api';
import ClienteModal from './ClienteModal';
import Pagination from '../../components/Pagination';
import { getErrorMessage } from '../../utils/errors';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';

export default function ClientesPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editCliente, setEditCliente] = useState<any>(null);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const { data, isLoading } = useQuery({
    queryKey: ['clientes', busqueda, pagina],
    queryFn: () => clientesApi.list({ busqueda, pagina, limite: 20 }),
  });

  const { data: stats } = useQuery({
    queryKey: ['clientes-stats'],
    queryFn: clientesApi.stats,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => clientesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clientes'] });
      qc.invalidateQueries({ queryKey: ['clientes-list'] });
      toast.success('Cliente desactivado');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Error al desactivar el cliente')),
  });

  const handleEdit = (cliente: any) => { setEditCliente(cliente); setModalOpen(true); };
  const handleNew  = () => { setEditCliente(null); setModalOpen(true); };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Clientes</h1>
          <p className="page-subtitle">
            {stats?.total || 0} clientes registrados
          </p>
        </div>
        <button id="nuevo-cliente-btn" className="btn btn-primary" onClick={handleNew}>
          <Plus size={16} /> Nuevo Cliente
        </button>
      </div>

      {/* Stats */}
      <div className="clientes-stats">
        <div className="stat-card" style={{ '--gradient': '#6366f1' } as any}>
          <div className="stat-icon" style={{ background: '#6366f122', color: '#6366f1' }}><Users size={20} /></div>
          <div className="stat-value">{stats?.total || 0}</div>
          <div className="stat-label">Total</div>
        </div>
        <div className="stat-card" style={{ '--gradient': '#10b981' } as any}>
          <div className="stat-icon" style={{ background: '#10b98122', color: '#10b981' }}><Users size={20} /></div>
          <div className="stat-value">{stats?.activos || 0}</div>
          <div className="stat-label">Activos</div>
        </div>
      </div>

      {/* Filters */}
      <div className="card" style={{ marginBottom: 'var(--sp-4)' }}>
        <div className="search-bar">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="form-input"
            placeholder="Buscar por nombre, apellido o email..."
            value={busqueda}
            onChange={(e) => { setBusqueda(e.target.value); setPagina(1); }}
          />
        </div>
      </div>

      {/* Table */}
      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              <th>Cliente</th>
              <th>Email</th>
              <th>Celular</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
                <div className="spinner" />
              </td></tr>
            ) : data?.items?.length === 0 ? (
              <tr><td colSpan={5}>
                <div className="empty-state">
                  <div className="empty-icon"><Users size={40} /></div>
                  <h3>No hay clientes</h3>
                  <p>Registra tu primer cliente para comenzar</p>
                  <button className="btn btn-primary" onClick={handleNew}><Plus size={16} /> Nuevo Cliente</button>
                </div>
              </td></tr>
            ) : data?.items?.map((c: any) => (
              <tr key={c.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)' }}>
                    <div className="avatar avatar-sm">{c.nombre[0]}{c.apellido[0]}</div>
                    <div>
                      <div style={{ fontWeight: 500 }}>{c.nombre} {c.apellido}</div>
                      {c.rfc && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{c.rfc}</div>}
                    </div>
                  </div>
                </td>
                <td>{c.email || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                <td>{c.celular || <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                <td>
                  <span className={`badge ${c.activo ? 'badge-success' : 'badge-muted'}`}>
                    {c.activo ? 'Activo' : 'Inactivo'}
                  </span>
                </td>
                <td>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                    <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => navigate(`/clientes/${c.id}`)} data-tooltip="Ver detalle"><Eye size={14} /></button>
                    <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => handleEdit(c)} data-tooltip="Editar"><Edit size={14} /></button>
                    <button
                      className="btn btn-ghost btn-icon btn-icon-sm"
                      style={{ color: 'var(--danger)' }}
                      onClick={() => askConfirm({
                        title: 'Desactivar cliente',
                        message: `¿Desactivar a "${c.nombre} ${c.apellido}"? Dejará de aparecer entre los clientes activos, pero su historial y expedientes se conservan.`,
                        confirmLabel: 'Desactivar',
                        danger: true,
                        onConfirm: () => deleteMutation.mutate(c.id),
                      })}
                      data-tooltip="Desactivar"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
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
          limite={data.limite}
          onChange={setPagina}
        />
      )}

      {modalOpen && (
        <ClienteModal
          cliente={editCliente}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            qc.invalidateQueries({ queryKey: ['clientes'] });
            qc.invalidateQueries({ queryKey: ['clientes-stats'] });
            qc.invalidateQueries({ queryKey: ['clientes-list'] });
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}
