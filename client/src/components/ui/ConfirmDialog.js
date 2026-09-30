import React, { useRef } from 'react';
import { AlertTriangle } from 'lucide-react';
import Button from './Button';
import Dialog from './Dialog';

/**
 * Confirmation for destructive actions. Focus starts on the safe choice so an
 * accidental Enter never cancels or removes anything.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Go back',
  loading = false,
}) {
  const cancelRef = useRef(null);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      role="alertdialog"
      size="sm"
      title={title}
      description={description}
      initialFocusRef={cancelRef}
      dismissible={!loading}
      icon={
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-danger-soft text-danger-ink">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
      }
      footer={
        <>
          <Button ref={cancelRef} variant="secondary" onClick={onClose} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant="danger" onClick={onConfirm} loading={loading}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  );
}
