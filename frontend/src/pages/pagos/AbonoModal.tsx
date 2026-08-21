import { useEffect, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2, HandCoins, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { pagosApi } from '../../api/pagos.api';
import { getErrorMessage } from '../../utils/errors';
import ModalErrorBanner from '../../components/ModalErrorBanner';

const METODOS_PAGO = ['Efectivo', 'Transferencia bancaria', 'Tarjeta de crédito', 'Tarjeta de débito', 'Cheque', 'Otro'];

export interface AbonoRegistrado {
  monto: number;
  fechaPago: string;
  metodoPago?: string;
  referencia?: string;
  montoRecibido?: number;
  cambio?: number;
}

interface Props {
  pago: any;
  onClose: () => void;
  onSuccess: (pagoActualizado: any, abono: AbonoRegistrado) => void;
}

function fmt(v: number) {
  return `$${v.toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
}

// No se permiten abonos parciales: cada pago debe liquidar el saldo pendiente completo.
// En efectivo se puede recibir de más (para dar cambio); en el resto de los métodos el monto queda fijo al saldo.
export default function AbonoModal({ pago, onClose, onSuccess }: Props) {
  const pendiente = Number(pago.montoPendiente);
  const [form, setForm] = useState({
    monto: String(pendiente),
    fechaPago: new Date().toISOString().split('T')[0],
    metodoPago: 'Efectivo',
    referencia: '',
    notas: '',
  });
  const [error, setError] = useState<string | null>(null);

  const esEfectivo = form.metodoPago === 'Efectivo';

  // Fuera de efectivo no existe el concepto de "cambio": el monto siempre es exactamente el saldo pendiente
  useEffect(() => {
    if (!esEfectivo) setForm(f => ({ ...f, monto: String(pendiente) }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [esEfectivo]);

  const montoIngresado = Number(form.monto) || 0;
  const cambio = esEfectivo ? Math.max(0, montoIngresado - pendiente) : 0;
  const falta = Math.max(0, pendiente - montoIngresado);
  const cubreSaldo = montoIngresado >= pendiente;

  const mutation = useMutation({
    mutationFn: (data: any) => pagosApi.registrarAbono(pago.id, data),
    onError: (err: any) => setError(getErrorMessage(err, 'Error al registrar el abono')),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const montoTexto = form.monto.trim();
    if (!montoTexto) { setError('Indica el monto que el cliente entregó'); return; }
    const monto = Number(montoTexto);
    if (Number.isNaN(monto)) { setError('El monto debe ser un número válido'); return; }
    if (monto < pendiente) {
      setError(`El abono debe cubrir el saldo pendiente completo (${fmt(pendiente)}). No se permiten abonos parciales.`);
      return;
    }
    if (!esEfectivo && monto > pendiente) {
      setError(`El monto no puede ser mayor al saldo pendiente (${fmt(pendiente)}) para este método de pago. Si el cliente pagó en efectivo y hay que darle cambio, cambia el método de pago a "Efectivo".`);
      return;
    }
    if (!form.fechaPago) { setError('Indica la fecha en que se recibió el pago'); return; }

    const vueltas = esEfectivo ? Math.max(0, monto - pendiente) : 0;

    const payload = {
      monto: pendiente,
      fechaPago: form.fechaPago,
      metodoPago: form.metodoPago || undefined,
      referencia: form.referencia || undefined,
      notas: form.notas || undefined,
    };
    const abonoInfo: AbonoRegistrado = {
      ...payload,
      montoRecibido: vueltas > 0 ? monto : undefined,
      cambio: vueltas > 0 ? vueltas : undefined,
    };

    mutation.mutate(payload, {
      onSuccess: (pagoActualizado) => {
        toast.success('Pago registrado');
        onSuccess(pagoActualizado, abonoInfo);
      },
    });
  };

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <HandCoins size={18} style={{ color: 'var(--success)' }} />
            Registrar Abono — {pago.numero}
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            <ModalErrorBanner message={error} />

            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)', padding: 'var(--sp-3) var(--sp-4)', marginBottom: 'var(--sp-4)',
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>Saldo pendiente</div>
                <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--warning)' }}>
                  {fmt(pendiente)}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                  {cambio > 0 ? 'Cambio a entregar' : falta > 0 ? 'Falta por cubrir' : 'Liquida el adeudo'}
                </div>
                <div style={{
                  fontSize: '1.1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'flex-end',
                  color: cambio > 0 ? 'var(--accent-400)' : falta > 0 ? 'var(--danger)' : 'var(--success)',
                }}>
                  {falta === 0 && cambio === 0 && <CheckCircle2 size={15} />}
                  {fmt(cambio > 0 ? cambio : falta)}
                </div>
              </div>
            </div>

            <div className="form-grid-2">
              <div className="form-group">
                <label className="form-label">Monto entregado *</label>
                <input id="abono-monto" type="number" step="0.01" min={pendiente} className="form-input" required autoFocus
                  readOnly={!esEfectivo}
                  value={form.monto}
                  onChange={(e) => esEfectivo && setForm(f => ({ ...f, monto: e.target.value }))}
                  style={!esEfectivo ? { cursor: 'not-allowed', opacity: 0.75 } : undefined}
                  placeholder="0.00" />
                <small style={{ color: 'var(--text-muted)', marginTop: 4, display: 'block' }}>
                  {esEfectivo
                    ? 'No se permiten abonos parciales — puedes entregar más para calcular el cambio'
                    : 'Este método de pago no admite cambio: el monto queda fijo al saldo pendiente'}
                </small>
              </div>
              <div className="form-group">
                <label className="form-label">Fecha de pago *</label>
                <input id="abono-fecha" type="date" className="form-input" required value={form.fechaPago}
                  onChange={(e) => setForm(f => ({ ...f, fechaPago: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Método de pago</label>
                <select id="abono-metodo" className="form-select" value={form.metodoPago}
                  onChange={(e) => setForm(f => ({ ...f, metodoPago: e.target.value }))}>
                  {METODOS_PAGO.map(m => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Referencia</label>
                <input id="abono-ref" type="text" className="form-input" value={form.referencia}
                  placeholder="Folio, últimos 4 dígitos, etc."
                  onChange={(e) => setForm(f => ({ ...f, referencia: e.target.value }))} />
              </div>
              <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Notas</label>
                <input id="abono-notas" type="text" className="form-input" value={form.notas}
                  onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))} />
              </div>
            </div>

            {cambio > 0 && (
              <div style={{
                marginTop: 'var(--sp-4)', padding: 'var(--sp-3) var(--sp-4)',
                background: 'var(--accent-glow)', border: '1px solid var(--accent-500)',
                borderRadius: 'var(--radius-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  Se abonarán {fmt(pendiente)} al adeudo — entrega de cambio:
                </span>
                <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--accent-400)' }}>{fmt(cambio)}</span>
              </div>
            )}
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancelar</button>
            <button id="abono-submit" type="submit" className="btn btn-primary" disabled={mutation.isPending || !cubreSaldo}>
              {mutation.isPending && <Loader2 size={16} className="spinning" />} Registrar abono
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
