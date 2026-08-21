import { useState, type ReactNode } from 'react';
import ConfirmModal from '../components/ConfirmModal';

interface ConfirmOptions {
  title?: string;
  message: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
}

/** Reemplazo del confirm() nativo del navegador, usando el modal propio del sistema.
 *  Uso: const { askConfirm, confirmDialog } = useConfirmDialog();
 *       askConfirm({ message: '¿Eliminar?', onConfirm: () => deleteM.mutate(id) });
 *       return <>{confirmDialog}...</> */
export function useConfirmDialog() {
  const [options, setOptions] = useState<ConfirmOptions | null>(null);

  const askConfirm = (opts: ConfirmOptions) => setOptions(opts);

  const confirmDialog = options && (
    <ConfirmModal
      title={options.title}
      message={options.message}
      confirmLabel={options.confirmLabel}
      cancelLabel={options.cancelLabel}
      danger={options.danger}
      onCancel={() => setOptions(null)}
      onConfirm={() => {
        const { onConfirm } = options;
        setOptions(null);
        onConfirm();
      }}
    />
  );

  return { askConfirm, confirmDialog };
}
