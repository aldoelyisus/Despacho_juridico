import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, BookOpen, Pencil, Search, Tag, FolderOpen } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogosApi } from '../../api/catalogos.api';
import { getErrorMessage } from '../../utils/errors';
import { useConfirmDialog } from '../../hooks/useConfirmDialog';
import Pagination from '../../components/Pagination';
import AreaModal from './AreaModal';
import SubareaModal from './SubareaModal';
import ServicioModal from './ServicioModal';

const LIMITE = 20;

// ── Barra de búsqueda reutilizable ─────────────────────────────────────────
function SearchBar({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  return (
    <div className="search-bar" style={{ marginBottom: 'var(--sp-3)' }}>
      <Search size={16} className="search-icon" />
      <input
        type="text" className="form-input" placeholder={placeholder}
        value={value} onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

// ── Panel de Áreas del Derecho (maestro) ────────────────────────────────────
function AreasPanel({ selectedArea, onSelectArea }: { selectedArea: { id: number; nombre: string } | null; onSelectArea: (a: any) => void }) {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editArea, setEditArea] = useState<any>(null);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const { data, isLoading } = useQuery({
    queryKey: ['catalogos-areas', busqueda, pagina],
    queryFn: () => catalogosApi.areas({ busqueda, pagina, limite: LIMITE }),
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => catalogosApi.deleteArea(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['catalogos-areas'] });
      toast.success('Área desactivada');
      if (selectedArea?.id === id) onSelectArea(null);
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Error al desactivar el área')),
  });

  const handleSearch = (v: string) => { setBusqueda(v); setPagina(1); };

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
        <h3>Áreas del Derecho</h3>
        <button id="area-new-btn" className="btn btn-primary btn-sm" onClick={() => { setEditArea(null); setModalOpen(true); }}>
          <Plus size={14} /> Nueva Área
        </button>
      </div>

      <SearchBar value={busqueda} onChange={handleSearch} placeholder="Buscar área..." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 'var(--sp-6)' }}><div className="spinner" /></div>
        ) : !data?.items?.length ? (
          <div className="empty-state">
            <BookOpen size={28} style={{ opacity: 0.3 }} />
            <p>{busqueda ? 'Sin áreas que coincidan con la búsqueda' : 'Sin áreas registradas'}</p>
          </div>
        ) : data.items.map((a: any) => {
          const seleccionada = selectedArea?.id === a.id;
          return (
            <div
              key={a.id}
              onClick={() => onSelectArea(a)}
              style={{
                display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)',
                borderRadius: 'var(--radius-md)', cursor: 'pointer',
                background: seleccionada ? 'var(--accent-glow)' : 'var(--bg-elevated)',
                border: `1px solid ${seleccionada ? 'var(--accent-400)' : 'var(--border-subtle)'}`,
                transition: 'background 0.12s, border-color 0.12s',
              }}
            >
              <div style={{ width: 12, height: 12, borderRadius: '50%', background: a.color || '#6366f1', flexShrink: 0, boxShadow: `0 0 8px ${a.color || '#6366f1'}55` }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{a.nombre}</div>
                {a.descripcion && (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.descripcion}
                  </div>
                )}
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {a.subareas?.length || 0} subárea{a.subareas?.length === 1 ? '' : 's'}
              </span>
              <button className="btn btn-ghost btn-icon btn-icon-sm" data-tooltip="Editar"
                onClick={(e) => { e.stopPropagation(); setEditArea(a); setModalOpen(true); }}>
                <Pencil size={14} />
              </button>
              <button className="btn btn-ghost btn-icon btn-icon-sm" style={{ color: 'var(--danger)' }} data-tooltip="Desactivar"
                disabled={deleteM.isPending}
                onClick={(e) => {
                  e.stopPropagation();
                  askConfirm({
                    title: 'Desactivar área',
                    message: `¿Desactivar "${a.nombre}"? No podrás usarla en nuevos expedientes.`,
                    confirmLabel: 'Desactivar',
                    danger: true,
                    onConfirm: () => deleteM.mutate(a.id),
                  });
                }}>
                <Trash2 size={14} />
              </button>
            </div>
          );
        })}
      </div>

      {data && (
        <Pagination pagina={pagina} totalPaginas={data.totalPaginas} total={data.total} limite={data.limite} onChange={setPagina} />
      )}

      {modalOpen && (
        <AreaModal
          area={editArea}
          onClose={() => setModalOpen(false)}
          onSuccess={(updated) => {
            setModalOpen(false);
            qc.invalidateQueries({ queryKey: ['catalogos-areas'] });
            if (updated && selectedArea?.id === updated.id) onSelectArea({ id: updated.id, nombre: updated.nombre });
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}

// ── Panel de Subáreas (detalle del área seleccionada) ───────────────────────
function SubareasPanel({ area }: { area: { id: number; nombre: string } | null }) {
  const qc = useQueryClient();
  const [busqueda, setBusqueda] = useState('');
  const [pagina, setPagina] = useState(1);
  const [modalOpen, setModalOpen] = useState(false);
  const [editSubarea, setEditSubarea] = useState<any>(null);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const { data, isLoading } = useQuery({
    queryKey: ['catalogos-subareas', area?.id, busqueda, pagina],
    queryFn: () => catalogosApi.subareas({ areaId: area!.id, busqueda, pagina, limite: LIMITE }),
    enabled: !!area,
  });

  const deleteM = useMutation({
    mutationFn: (id: number) => catalogosApi.deleteSubarea(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['catalogos-subareas'] });
      qc.invalidateQueries({ queryKey: ['catalogos-areas'] });
      toast.success('Subárea desactivada');
    },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Error al desactivar la subárea')),
  });

  const handleSearch = (v: string) => { setBusqueda(v); setPagina(1); };

  if (!area) {
    return (
      <div className="card">
        <div className="empty-state">
          <FolderOpen size={32} style={{ opacity: 0.3 }} />
          <h3>Selecciona un área</h3>
          <p>Elige un área del panel izquierdo para ver y administrar sus subáreas.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-3)' }}>
        <h3>Subáreas de "{area.nombre}"</h3>
        <button id="subarea-new-btn" className="btn btn-primary btn-sm" onClick={() => { setEditSubarea(null); setModalOpen(true); }}>
          <Plus size={14} /> Nueva Subárea
        </button>
      </div>

      <SearchBar value={busqueda} onChange={handleSearch} placeholder="Buscar subárea..." />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 'var(--sp-6)' }}><div className="spinner" /></div>
        ) : !data?.items?.length ? (
          <div className="empty-state">
            <Tag size={28} style={{ opacity: 0.3 }} />
            <p>{busqueda ? 'Sin subáreas que coincidan con la búsqueda' : 'Esta área no tiene subáreas todavía'}</p>
          </div>
        ) : data.items.map((s: any) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)',
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ flex: 1, fontWeight: 500, fontSize: '0.875rem' }}>{s.nombre}</div>
            <button className="btn btn-ghost btn-icon btn-icon-sm" data-tooltip="Editar"
              onClick={() => { setEditSubarea(s); setModalOpen(true); }}>
              <Pencil size={14} />
            </button>
            <button className="btn btn-ghost btn-icon btn-icon-sm" style={{ color: 'var(--danger)' }} data-tooltip="Desactivar"
              disabled={deleteM.isPending}
              onClick={() => askConfirm({
                title: 'Desactivar subárea',
                message: `¿Desactivar "${s.nombre}"?`,
                confirmLabel: 'Desactivar',
                danger: true,
                onConfirm: () => deleteM.mutate(s.id),
              })}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      {data && (
        <Pagination pagina={pagina} totalPaginas={data.totalPaginas} total={data.total} limite={data.limite} onChange={setPagina} />
      )}

      {modalOpen && (
        <SubareaModal
          area={area}
          subarea={editSubarea}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            qc.invalidateQueries({ queryKey: ['catalogos-subareas'] });
            qc.invalidateQueries({ queryKey: ['catalogos-areas'] });
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}

// ── Servicios Legales ────────────────────────────────────────────────────────
function ServiciosTab() {
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editServicio, setEditServicio] = useState<any>(null);
  const { askConfirm, confirmDialog } = useConfirmDialog();

  const { data: servicios } = useQuery({ queryKey: ['servicios'], queryFn: catalogosApi.servicios });

  const deleteM = useMutation({
    mutationFn: (id: number) => catalogosApi.deleteServicio(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servicios'] }); toast.success('Servicio desactivado'); },
    onError: (err: any) => toast.error(getErrorMessage(err, 'Error al desactivar el servicio')),
  });

  return (
    <div className="card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
        <h3>Servicios Legales ({servicios?.length || 0})</h3>
        <button id="servicio-new-btn" className="btn btn-primary btn-sm" onClick={() => { setEditServicio(null); setModalOpen(true); }}>
          <Plus size={14} /> Nuevo Servicio
        </button>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
        {servicios?.map((s: any) => (
          <div key={s.id} style={{
            display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)',
            background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
          }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{s.nombre}</div>
              {s.descripcion && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.descripcion}</div>}
            </div>
            <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>
              ${Number(s.costo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
            </span>
            <button className="btn btn-ghost btn-icon btn-icon-sm" data-tooltip="Editar"
              onClick={() => { setEditServicio(s); setModalOpen(true); }}>
              <Pencil size={14} />
            </button>
            <button className="btn btn-ghost btn-icon btn-icon-sm" style={{ color: 'var(--danger)' }} data-tooltip="Desactivar"
              disabled={deleteM.isPending}
              onClick={() => askConfirm({
                title: 'Desactivar servicio',
                message: `¿Desactivar "${s.nombre}"? No podrás usarlo en nuevos expedientes.`,
                confirmLabel: 'Desactivar',
                danger: true,
                onConfirm: () => deleteM.mutate(s.id),
              })}>
              <Trash2 size={14} />
            </button>
          </div>
        ))}
        {!servicios?.length && <div className="empty-state"><BookOpen size={28} style={{ opacity: 0.3 }} /><p>Sin servicios configurados</p></div>}
      </div>

      {modalOpen && (
        <ServicioModal
          servicio={editServicio}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            qc.invalidateQueries({ queryKey: ['servicios'] });
          }}
        />
      )}
      {confirmDialog}
    </div>
  );
}

// ── Página principal ─────────────────────────────────────────────────────────
export default function CatalogosPage() {
  const [activeTab, setActiveTab] = useState('areas');
  const [selectedArea, setSelectedArea] = useState<{ id: number; nombre: string } | null>(null);

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogos</h1>
          <p className="page-subtitle">Áreas del derecho, subáreas y servicios del despacho</p>
        </div>
      </div>

      <div className="tabs">
        {[['areas', 'Áreas y Subáreas'], ['servicios', 'Servicios Legales']].map(([k, v]) => (
          <button key={k} className={`tab-btn ${activeTab === k ? 'active' : ''}`} onClick={() => setActiveTab(k)}>{v}</button>
        ))}
      </div>

      {activeTab === 'areas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 'var(--sp-4)', alignItems: 'start' }}>
          <AreasPanel selectedArea={selectedArea} onSelectArea={setSelectedArea} />
          <SubareasPanel area={selectedArea} />
        </div>
      )}

      {activeTab === 'servicios' && <ServiciosTab />}
    </div>
  );
}
