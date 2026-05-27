import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, BookOpen, Loader2, Pencil, Check, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { catalogosApi } from '../../api/catalogos.api';

// ── Fila editable genérica ─────────────────────────────────────────────────
function EditableRow({ children, onEdit }: { children: React.ReactNode; onEdit: () => void }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 'var(--sp-3)',
      padding: 'var(--sp-3)', background: 'var(--bg-elevated)',
      borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)',
    }}>
      {children}
    </div>
  );
}

export default function CatalogosPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState('areas');

  // ── Formularios de creación ──────────────────────────────────────────────
  const [areaForm, setAreaForm]       = useState({ nombre: '', descripcion: '', color: '#6366f1' });
  const [servicioForm, setServicioForm] = useState({ nombre: '', descripcion: '', costo: '' });
  const [subareaForm, setSubareaForm]  = useState({ nombre: '', areaId: '' });
  const [showAreaForm, setShowAreaForm]   = useState(false);
  const [showServForm, setShowServForm]   = useState(false);
  const [showSubForm, setShowSubForm]     = useState(false);

  // ── Estado de edición inline ─────────────────────────────────────────────
  const [editingAreaId, setEditingAreaId]         = useState<number | null>(null);
  const [editingSubareaId, setEditingSubareaId]   = useState<number | null>(null);
  const [editingServicioId, setEditingServicioId] = useState<number | null>(null);
  const [editAreaData, setEditAreaData]           = useState({ nombre: '', descripcion: '', color: '' });
  const [editSubareaData, setEditSubareaData]     = useState({ nombre: '', areaId: '' });
  const [editServicioData, setEditServicioData]   = useState({ nombre: '', descripcion: '', costo: '' });

  // ── Queries ──────────────────────────────────────────────────────────────
  const { data: areas }    = useQuery({ queryKey: ['areas'],    queryFn: catalogosApi.areas });
  const { data: subareas } = useQuery({ queryKey: ['subareas'], queryFn: catalogosApi.subareas });
  const { data: servicios } = useQuery({ queryKey: ['servicios'], queryFn: catalogosApi.servicios });

  // ── Mutations ÁREAS ──────────────────────────────────────────────────────
  const areaM = useMutation({
    mutationFn: catalogosApi.createArea,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setAreaForm({ nombre: '', descripcion: '', color: '#6366f1' }); setShowAreaForm(false); toast.success('Área creada'); },
  });
  const updateAreaM = useMutation({
    mutationFn: ({ id, data }: any) => catalogosApi.updateArea(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); setEditingAreaId(null); toast.success('Área actualizada'); },
    onError: () => toast.error('Error al actualizar área'),
  });
  const delAreaM = useMutation({
    mutationFn: catalogosApi.deleteArea,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['areas'] }); toast.success('Área desactivada'); },
  });

  // ── Mutations SUBÁREAS ───────────────────────────────────────────────────
  const subM = useMutation({
    mutationFn: (data: any) => catalogosApi.createSubarea({ ...data, areaId: +data.areaId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subareas'] }); setSubareaForm({ nombre: '', areaId: '' }); setShowSubForm(false); toast.success('Subárea creada'); },
  });
  const updateSubareaM = useMutation({
    mutationFn: ({ id, data }: any) => catalogosApi.updateSubarea(id, { ...data, areaId: data.areaId ? +data.areaId : undefined }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subareas'] }); setEditingSubareaId(null); toast.success('Subárea actualizada'); },
    onError: () => toast.error('Error al actualizar subárea'),
  });
  const delSubareaM = useMutation({
    mutationFn: catalogosApi.deleteSubarea,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['subareas'] }); toast.success('Subárea desactivada'); },
  });

  // ── Mutations SERVICIOS ──────────────────────────────────────────────────
  const servM = useMutation({
    mutationFn: (data: any) => catalogosApi.createServicio({ ...data, costo: +data.costo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servicios'] }); setServicioForm({ nombre: '', descripcion: '', costo: '' }); setShowServForm(false); toast.success('Servicio creado'); },
  });
  const updateServicioM = useMutation({
    mutationFn: ({ id, data }: any) => catalogosApi.updateServicio(id, { ...data, costo: +data.costo }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servicios'] }); setEditingServicioId(null); toast.success('Servicio actualizado'); },
    onError: () => toast.error('Error al actualizar servicio'),
  });
  const delServM = useMutation({
    mutationFn: catalogosApi.deleteServicio,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['servicios'] }); toast.success('Servicio desactivado'); },
  });

  const inlineFormStyle: React.CSSProperties = {
    background: 'var(--bg-elevated)', border: '1px solid var(--border-default)',
    borderRadius: 'var(--radius-md)', padding: 'var(--sp-4)', marginBottom: 'var(--sp-4)',
  };

  // ── Helpers edición ──────────────────────────────────────────────────────
  const startEditArea = (a: any) => {
    setEditingAreaId(a.id);
    setEditAreaData({ nombre: a.nombre, descripcion: a.descripcion || '', color: a.color || '#6366f1' });
  };
  const startEditSubarea = (s: any) => {
    setEditingSubareaId(s.id);
    setEditSubareaData({ nombre: s.nombre, areaId: String(s.area?.id || s.areaId || '') });
  };
  const startEditServicio = (s: any) => {
    setEditingServicioId(s.id);
    setEditServicioData({ nombre: s.nombre, descripcion: s.descripcion || '', costo: String(s.costo || '0') });
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Catálogos</h1>
          <p className="page-subtitle">Áreas del derecho, subáreas y servicios del despacho</p>
        </div>
      </div>

      <div className="tabs">
        {[['areas', 'Áreas del Derecho'], ['subareas', 'Subáreas'], ['servicios', 'Servicios Legales']].map(([k, v]) => (
          <button key={k} className={`tab-btn ${activeTab === k ? 'active' : ''}`} onClick={() => setActiveTab(k)}>{v}</button>
        ))}
      </div>

      {/* ── ÁREAS ── */}
      {activeTab === 'areas' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
            <h3>Áreas del Derecho ({areas?.length || 0})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowAreaForm(!showAreaForm)}>
              <Plus size={14} /> Nueva Área
            </button>
          </div>

          {showAreaForm && (
            <div style={inlineFormStyle}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input id="area-nombre" type="text" className="form-input" value={areaForm.nombre}
                    onChange={(e) => setAreaForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Derecho Penal" />
                </div>
                <div className="form-group">
                  <label className="form-label">Color identificador</label>
                  <div style={{ display: 'flex', gap: 'var(--sp-2)', alignItems: 'center' }}>
                    <input type="color" value={areaForm.color}
                      onChange={(e) => setAreaForm(f => ({ ...f, color: e.target.value }))}
                      style={{ width: 44, height: 38, border: 'none', background: 'none', cursor: 'pointer', padding: 2 }} />
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{areaForm.color}</span>
                  </div>
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Descripción</label>
                  <input id="area-desc" type="text" className="form-input" value={areaForm.descripcion}
                    onChange={(e) => setAreaForm(f => ({ ...f, descripcion: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end', marginTop: 'var(--sp-3)' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAreaForm(false)}>Cancelar</button>
                <button id="area-submit" className="btn btn-primary btn-sm" onClick={() => areaM.mutate(areaForm)} disabled={!areaForm.nombre || areaM.isPending}>
                  {areaM.isPending && <Loader2 size={14} className="spinning" />} Crear
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {areas?.map((a: any) => (
              <div key={a.id} style={{
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)', overflow: 'hidden',
              }}>
                {editingAreaId === a.id ? (
                  /* ── Modo edición ── */
                  <div style={{ padding: 'var(--sp-3)' }}>
                    <div className="form-grid-2" style={{ marginBottom: 'var(--sp-2)' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input type="text" className="form-input form-input-sm" value={editAreaData.nombre}
                          onChange={(e) => setEditAreaData(d => ({ ...d, nombre: e.target.value }))}
                          placeholder="Nombre" autoFocus />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input type="text" className="form-input form-input-sm" value={editAreaData.descripcion}
                          onChange={(e) => setEditAreaData(d => ({ ...d, descripcion: e.target.value }))}
                          placeholder="Descripción" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input type="color" value={editAreaData.color}
                          onChange={(e) => setEditAreaData(d => ({ ...d, color: e.target.value }))}
                          style={{ width: 36, height: 32, border: 'none', background: 'none', cursor: 'pointer', padding: 2 }} />
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>{editAreaData.color}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingAreaId(null)}><X size={14} /> Cancelar</button>
                      <button className="btn btn-primary btn-sm"
                        disabled={!editAreaData.nombre || updateAreaM.isPending}
                        onClick={() => updateAreaM.mutate({ id: a.id, data: editAreaData })}>
                        {updateAreaM.isPending ? <Loader2 size={14} className="spinning" /> : <Check size={14} />} Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Modo lectura ── */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', background: a.color || '#6366f1', flexShrink: 0, boxShadow: `0 0 8px ${a.color}55` }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{a.nombre}</div>
                      {a.descripcion && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.descripcion}</div>}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{a.subareas?.length || 0} subáreas</span>
                    <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => startEditArea(a)} data-tooltip="Editar">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-icon-sm" style={{ color: 'var(--danger)' }}
                      onClick={() => delAreaM.mutate(a.id)} data-tooltip="Desactivar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!areas?.length && <div className="empty-state"><BookOpen size={28} style={{ opacity: 0.3 }} /><p>Sin áreas registradas</p></div>}
          </div>
        </div>
      )}

      {/* ── SUBÁREAS ── */}
      {activeTab === 'subareas' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
            <h3>Subáreas ({subareas?.length || 0})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowSubForm(!showSubForm)}><Plus size={14} /> Nueva Subárea</button>
          </div>

          {showSubForm && (
            <div style={inlineFormStyle}>
              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">Nombre *</label>
                  <input id="sub-nombre" type="text" className="form-input" value={subareaForm.nombre}
                    onChange={(e) => setSubareaForm(f => ({ ...f, nombre: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Área *</label>
                  <select id="sub-area" className="form-select" value={subareaForm.areaId}
                    onChange={(e) => setSubareaForm(f => ({ ...f, areaId: e.target.value }))}>
                    <option value="">Seleccionar área...</option>
                    {areas?.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                  </select>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end', marginTop: 'var(--sp-3)' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowSubForm(false)}>Cancelar</button>
                <button id="sub-submit" className="btn btn-primary btn-sm"
                  onClick={() => subM.mutate(subareaForm)}
                  disabled={!subareaForm.nombre || !subareaForm.areaId || subM.isPending}>
                  {subM.isPending && <Loader2 size={14} className="spinning" />} Crear
                </button>
              </div>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {subareas?.map((s: any) => (
              <div key={s.id} style={{
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)', overflow: 'hidden',
              }}>
                {editingSubareaId === s.id ? (
                  /* ── Modo edición ── */
                  <div style={{ padding: 'var(--sp-3)' }}>
                    <div className="form-grid-2" style={{ marginBottom: 'var(--sp-2)' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input type="text" className="form-input form-input-sm" value={editSubareaData.nombre}
                          onChange={(e) => setEditSubareaData(d => ({ ...d, nombre: e.target.value }))}
                          placeholder="Nombre" autoFocus />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <select className="form-select" value={editSubareaData.areaId}
                          onChange={(e) => setEditSubareaData(d => ({ ...d, areaId: e.target.value }))}>
                          <option value="">Seleccionar área...</option>
                          {areas?.map((a: any) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                        </select>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingSubareaId(null)}><X size={14} /> Cancelar</button>
                      <button className="btn btn-primary btn-sm"
                        disabled={!editSubareaData.nombre || updateSubareaM.isPending}
                        onClick={() => updateSubareaM.mutate({ id: s.id, data: editSubareaData })}>
                        {updateSubareaM.isPending ? <Loader2 size={14} className="spinning" /> : <Check size={14} />} Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Modo lectura ── */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{s.nombre}</div>
                      {s.area && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.area.nombre}</div>}
                    </div>
                    <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => startEditSubarea(s)} data-tooltip="Editar">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-icon-sm" style={{ color: 'var(--danger)' }}
                      onClick={() => delSubareaM.mutate(s.id)} data-tooltip="Desactivar"
                      disabled={delSubareaM.isPending}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!subareas?.length && <div className="empty-state"><BookOpen size={28} style={{ opacity: 0.3 }} /><p>Sin subáreas registradas</p></div>}
          </div>
        </div>
      )}

      {/* ── SERVICIOS ── */}
      {activeTab === 'servicios' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--sp-4)' }}>
            <h3>Servicios Legales ({servicios?.length || 0})</h3>
            <button className="btn btn-primary btn-sm" onClick={() => setShowServForm(!showServForm)}><Plus size={14} /> Nuevo Servicio</button>
          </div>
          {showServForm && (
            <div style={inlineFormStyle}>
              <div className="form-grid-2">
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label className="form-label">Nombre del Servicio *</label>
                  <input id="serv-nombre" type="text" className="form-input" value={servicioForm.nombre}
                    onChange={(e) => setServicioForm(f => ({ ...f, nombre: e.target.value }))} placeholder="Ej: Consulta Jurídica" />
                </div>
                <div className="form-group">
                  <label className="form-label">Costo ($)</label>
                  <input id="serv-costo" type="number" step="0.01" className="form-input" value={servicioForm.costo}
                    onChange={(e) => setServicioForm(f => ({ ...f, costo: e.target.value }))} placeholder="0.00" />
                </div>
                <div className="form-group">
                  <label className="form-label">Descripción</label>
                  <input id="serv-desc" type="text" className="form-input" value={servicioForm.descripcion}
                    onChange={(e) => setServicioForm(f => ({ ...f, descripcion: e.target.value }))} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end', marginTop: 'var(--sp-3)' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowServForm(false)}>Cancelar</button>
                <button id="serv-submit" className="btn btn-primary btn-sm"
                  onClick={() => servM.mutate(servicioForm)} disabled={!servicioForm.nombre || servM.isPending}>
                  {servM.isPending && <Loader2 size={14} className="spinning" />} Crear
                </button>
              </div>
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {servicios?.map((s: any) => (
              <div key={s.id} style={{
                background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)', overflow: 'hidden',
              }}>
                {editingServicioId === s.id ? (
                  /* ── Modo edición ── */
                  <div style={{ padding: 'var(--sp-3)' }}>
                    <div className="form-grid-2" style={{ marginBottom: 'var(--sp-2)' }}>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input type="text" className="form-input form-input-sm" value={editServicioData.nombre}
                          onChange={(e) => setEditServicioData(d => ({ ...d, nombre: e.target.value }))}
                          placeholder="Nombre del servicio" autoFocus />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <input type="number" step="0.01" className="form-input form-input-sm" value={editServicioData.costo}
                          onChange={(e) => setEditServicioData(d => ({ ...d, costo: e.target.value }))}
                          placeholder="Costo" />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0, gridColumn: '1 / -1' }}>
                        <input type="text" className="form-input form-input-sm" value={editServicioData.descripcion}
                          onChange={(e) => setEditServicioData(d => ({ ...d, descripcion: e.target.value }))}
                          placeholder="Descripción (opcional)" />
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', justifyContent: 'flex-end' }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingServicioId(null)}><X size={14} /> Cancelar</button>
                      <button className="btn btn-primary btn-sm"
                        disabled={!editServicioData.nombre || updateServicioM.isPending}
                        onClick={() => updateServicioM.mutate({ id: s.id, data: editServicioData })}>
                        {updateServicioM.isPending ? <Loader2 size={14} className="spinning" /> : <Check size={14} />} Guardar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── Modo lectura ── */
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', padding: 'var(--sp-3)' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '0.875rem' }}>{s.nombre}</div>
                      {s.descripcion && <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{s.descripcion}</div>}
                    </div>
                    <span style={{ fontWeight: 700, color: 'var(--success)', fontSize: '0.9rem' }}>
                      ${Number(s.costo).toLocaleString('es-MX', { minimumFractionDigits: 2 })}
                    </span>
                    <button className="btn btn-ghost btn-icon btn-icon-sm" onClick={() => startEditServicio(s)} data-tooltip="Editar">
                      <Pencil size={14} />
                    </button>
                    <button className="btn btn-ghost btn-icon btn-icon-sm" style={{ color: 'var(--danger)' }}
                      onClick={() => delServM.mutate(s.id)} data-tooltip="Desactivar">
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}
              </div>
            ))}
            {!servicios?.length && <div className="empty-state"><BookOpen size={28} style={{ opacity: 0.3 }} /><p>Sin servicios configurados</p></div>}
          </div>
        </div>
      )}
    </div>
  );
}
