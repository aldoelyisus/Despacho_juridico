import { useQuery } from '@tanstack/react-query';
import { X, Printer, Building2 } from 'lucide-react';
import { despachoApi } from '../../api/despacho.api';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

const ESTADO_LABELS: Record<string, string> = {
  pendiente: 'Pendiente', parcial: 'Pago parcial', pagado: 'Pagado', cancelado: 'Cancelado',
};

function money(v: any) {
  return `$${Number(v || 0).toLocaleString('es-MX', { minimumFractionDigits: 2 })}`;
}

interface Props {
  pago: any;
  abono: { id?: number; monto: number; fechaPago: string; metodoPago?: string; referencia?: string; montoRecibido?: number; cambio?: number };
  onClose: () => void;
}

/** Recibo imprimible de un abono — se muestra tal como se imprime, en formato de ticket sobre "papel" blanco */
export default function ReciboModal({ pago, abono, onClose }: Props) {
  const { data: despacho } = useQuery({ queryKey: ['mi-despacho'], queryFn: despachoApi.miDespacho });
  const logoUrl = despacho ? despachoApi.getLogoUrl(despacho.logo) : null;

  const folio = `${pago.numero}${abono.id ? `-${abono.id}` : ''}`;

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal" style={{ maxWidth: 420 }}>
        <div className="modal-header no-print">
          <h3 style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Printer size={18} style={{ color: 'var(--accent-400)' }} />
            Recibo de pago
          </h3>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="modal-body" style={{ padding: 'var(--sp-4)', background: '#e9e9ee' }}>
          <div
            className="recibo-print-area"
            style={{
              background: '#fff', color: '#111', borderRadius: 6,
              padding: '28px 24px', fontFamily: "'Courier New', ui-monospace, monospace",
              fontSize: '0.8rem', lineHeight: 1.5, boxShadow: '0 1px 6px rgba(0,0,0,0.15)',
            }}
          >
            {/* Encabezado del despacho */}
            <div style={{ textAlign: 'center', marginBottom: 14 }}>
              {logoUrl ? (
                <img src={logoUrl} alt="" style={{ maxHeight: 48, maxWidth: 140, marginBottom: 8, objectFit: 'contain' }} />
              ) : (
                <Building2 size={28} style={{ marginBottom: 6 }} />
              )}
              <div style={{ fontWeight: 700, fontSize: '0.95rem', textTransform: 'uppercase' }}>
                {despacho?.nombreComercial || despacho?.nombre || 'Despacho Jurídico'}
              </div>
              {despacho?.direccion && <div>{despacho.direccion}{despacho.ciudad ? `, ${despacho.ciudad}` : ''}</div>}
              {(despacho?.telefono || despacho?.email) && (
                <div>{[despacho?.telefono, despacho?.email].filter(Boolean).join(' • ')}</div>
              )}
              {despacho?.rfc && <div>RFC: {despacho.rfc}</div>}
            </div>

            <Dashed />

            <div style={{ textAlign: 'center', margin: '10px 0' }}>
              <div style={{ fontWeight: 700, letterSpacing: '0.05em' }}>RECIBO DE PAGO</div>
              <div>Folio: {folio}</div>
              <div>{format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</div>
            </div>

            <Dashed />

            <Row label="Cliente" value={pago.cliente ? `${pago.cliente.nombre} ${pago.cliente.apellido}` : '—'} />
            <Row label="Concepto" value={pago.concepto || pago.servicio?.nombre || '—'} />
            {pago.expediente && <Row label="Expediente" value={`${pago.expediente.numero}`} />}

            <Dashed />

            {abono.cambio ? (
              <>
                <Row label="Efectivo recibido" value={money(abono.montoRecibido)} />
                <Row label="Abonado al adeudo" value={money(abono.monto)} strong />
                <Row label="Cambio entregado" value={money(abono.cambio)} strong />
              </>
            ) : (
              <Row label="Monto recibido" value={money(abono.monto)} strong />
            )}
            <Row label="Fecha de pago" value={format(new Date(abono.fechaPago), 'dd/MM/yyyy', { locale: es })} />
            {abono.metodoPago && <Row label="Método de pago" value={abono.metodoPago} />}
            {abono.referencia && <Row label="Referencia" value={abono.referencia} />}

            <Dashed />

            <Row label="Costo del servicio" value={money(pago.montoOriginal)} />
            {Number(pago.montoDescuento) > 0 && <Row label="Descuento aplicado" value={`− ${money(pago.montoDescuento)}`} />}
            <Row label="Total del cobro" value={money(pago.montoTotal)} />
            <Row label="Pagado a la fecha" value={money(pago.montoPagado)} />
            <Row label="Saldo pendiente" value={money(pago.montoPendiente)} strong />
            <Row label="Estado" value={ESTADO_LABELS[pago.estado] || pago.estado} />

            <Dashed />

            <div style={{ textAlign: 'center', marginTop: 12, fontSize: '0.75rem' }}>
              Gracias por su pago.
            </div>
          </div>
        </div>

        <div className="modal-footer no-print">
          <button type="button" className="btn btn-secondary" onClick={onClose}>Cerrar</button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}>
            <Printer size={16} /> Imprimir
          </button>
        </div>
      </div>
    </div>
  );
}

function Dashed() {
  return <div style={{ borderTop: '1px dashed #999', margin: '8px 0' }} />;
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontWeight: strong ? 700 : 400 }}>
      <span>{label}</span>
      <span style={{ textAlign: 'right' }}>{value}</span>
    </div>
  );
}
