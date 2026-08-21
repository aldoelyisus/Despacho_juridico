import { AlertCircle } from 'lucide-react';

/** Banner de error persistente dentro de un modal — más visible y difícil de perder que un toast */
export default function ModalErrorBanner({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div style={{
      background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
      borderRadius: 'var(--radius-md)', padding: 'var(--sp-3)', marginBottom: 'var(--sp-4)',
      display: 'flex', gap: 10, alignItems: 'flex-start',
    }}>
      <AlertCircle size={16} style={{ color: 'var(--danger)', flexShrink: 0, marginTop: 2 }} />
      <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-secondary)', whiteSpace: 'pre-line' }}>{message}</p>
    </div>
  );
}
