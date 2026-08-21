import { Check, Circle } from 'lucide-react';
import { PASSWORD_RULES } from '../utils/password';

export default function PasswordChecklist({ password }: { password: string }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 12px', marginTop: 6 }}>
      {PASSWORD_RULES.map((rule) => {
        const ok = rule.test(password || '');
        return (
          <div key={rule.key} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            fontSize: '0.75rem', color: ok ? 'var(--success)' : 'var(--text-muted)',
          }}>
            {ok ? <Check size={12} /> : <Circle size={10} />}
            {rule.label}
          </div>
        );
      })}
    </div>
  );
}
