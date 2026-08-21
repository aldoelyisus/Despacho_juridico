import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Tag, Percent, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import { descuentosApi } from '../../api/descuentos.api';
import { getErrorMessage } from '../../utils/errors';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import DescuentoModal from './DescuentoModal';

export default function DescuentosPage() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const { data: descuentos, isLoading } = useQuery({
    queryKey: ['descuentos'],
    queryFn: () => descuentosApi.list(),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => descuentosApi.remove(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['descuentos'] }); toast.success('Descuento eliminado'); },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Error al eliminar el descuento')),
  });

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogo de Descuentos</h1>
          <p className="page-subtitle">Define descuentos para aplicar a los cobros de clientes</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
          <Plus size={16} /> Nuevo Descuento
        </button>
      </div>

      <div className="card">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 'var(--sp-8)' }}><div className="spinner" /></div>
        ) : (
          <div className="table-container">
            <table className="table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Valor</th>
                  <th>Descripción</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {descuentos?.map((d: any) => (
                  <tr key={d.id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: 'var(--radius-sm)',
                          background: 'var(--accent-glow)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                          {d.tipo === 'porcentaje'
                            ? <Percent size={14} style={{ color: 'var(--accent-400)' }} />
                            : <DollarSign size={14} style={{ color: '#10b981' }} />}
                        </div>
                        <span style={{ fontWeight: 600 }}>{d.nombre}</span>
                      </div>
                    </td>
                    <td>
                      <span className={`badge ${d.tipo === 'porcentaje' ? 'badge-info' : 'badge-success'}`}>
                        {d.tipo === 'porcentaje' ? 'Porcentaje' : 'Monto fijo'}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, fontSize: '1rem' }}>
                      {d.tipo === 'porcentaje'
                        ? <span style={{ color: 'var(--accent-400)' }}>{Number(d.valor)}%</span>
                        : <span style={{ color: '#10b981' }}>${Number(d.valor).toLocaleString('es-MX', { minimumFractionDigits: 2 })}</span>
                      }
                    </td>
                    <td style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>{d.descripcion || '—'}</td>
                    <td>
                      <span className={`badge ${d.activo ? 'badge-success' : 'badge-muted'}`}>
                        {d.activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 'var(--sp-2)' }}>
                        <button
                          className="btn btn-ghost btn-icon btn-icon-sm"
                          onClick={() => { setEditing(d); setModalOpen(true); }}
                          data-tooltip="Editar"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          className="btn btn-ghost btn-icon btn-icon-sm"
                          style={{ color: 'var(--danger)' }}
                          disabled={deleteM.isPending}
                          onClick={() => askConfirm({
                            title: 'Eliminar descuento',
                            message: `¿Eliminar el descuento "${d.nombre}"? Esta acción no se puede deshacer. Si ya se usó en algún pago, no podrá eliminarse.`,
                            confirmLabel: 'Eliminar',
                            danger: true,
                            onConfirm: () => deleteM.mutate(d.id),
                          })}
                          data-tooltip="Eliminar"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!descuentos?.length && (
                  <tr>
                    <td colSpan={6}>
                      <div className="empty-state">
                        <Tag size={40} style={{ opacity: 0.3 }} />
                        <h3>Sin descuentos registrados</h3>
                        <p>Crea tu primer descuento para aplicarlo a los cobros</p>
                        <button className="btn btn-primary" onClick={() => { setEditing(null); setModalOpen(true); }}>
                          <Plus size={16} /> Nuevo Descuento
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalOpen && (
        <DescuentoModal
          descuento={editing}
          onClose={() => { setModalOpen(false); setEditing(null); }}
          onSuccess={() => { setModalOpen(false); setEditing(null); qc.invalidateQueries({ queryKey: ['descuentos'] }); }}
        />
      )}
      {confirmDialog}
    </div>
  );
}
