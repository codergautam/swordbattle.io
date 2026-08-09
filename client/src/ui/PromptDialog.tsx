import { useEffect, useRef, useState } from 'react';
import './PromptDialog.scss';

type DialogOptions = {
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  input?: boolean;
  multiline?: boolean;
  initialValue?: string;
  placeholder?: string;
  maxLength?: number;
  validate?: (value: string) => string | null | Promise<string | null>;
};

type PendingDialog = {
  options: DialogOptions;
  resolve: (value: string | null) => void;
};

let openDialog: ((options: DialogOptions) => Promise<string | null>) | null = null;

export function showDialog(message: string, title = 'Notice'): Promise<void> {
  if (!openDialog) return Promise.resolve();
  return openDialog({ title, message, confirmLabel: 'OK' }).then(() => undefined);
}

export function confirmDialog(message: string, title = 'Confirm', confirmLabel = 'OK'): Promise<boolean> {
  if (!openDialog) return Promise.resolve(false);
  return openDialog({ title, message, confirmLabel, cancelLabel: 'Cancel' }).then((value) => value !== null);
}

export function promptDialog(options: DialogOptions): Promise<string | null> {
  if (!openDialog) return Promise.resolve(null);
  return openDialog({ ...options, input: true, cancelLabel: options.cancelLabel ?? 'Cancel' });
}

export default function PromptDialog() {
  const [pending, setPending] = useState<PendingDialog | null>(null);
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    openDialog = (options) => new Promise((resolve) => setPending({ options, resolve }));
    return () => { openDialog = null; };
  }, []);

  useEffect(() => {
    setValue(pending?.options.initialValue ?? '');
    setError('');
    setSubmitting(false);
    if (pending?.options.input) setTimeout(() => inputRef.current?.focus(), 0);
  }, [pending]);

  const close = (result: string | null) => {
    if (!pending) return;
    pending.resolve(result);
    setPending(null);
  };

  const confirm = async () => {
    if (!pending || submitting) return;
    if (pending.options.input) {
      setSubmitting(true);
      const validation = await pending.options.validate?.(value.trim());
      setSubmitting(false);
      if (validation) {
        setError(validation);
        return;
      }
      close(value.trim());
      return;
    }
    close('');
  };

  if (!pending) return null;
  const { options } = pending;
  return (
    <div className="prompt-dialog-backdrop" onMouseDown={() => options.cancelLabel && close(null)}>
      <div className="prompt-dialog" onMouseDown={(e) => e.stopPropagation()}>
        <h2>{options.title || 'Notice'}</h2>
        <p>{options.message}</p>
        {options.input && (options.multiline ? (
          <textarea ref={inputRef as any} value={value} placeholder={options.placeholder} maxLength={options.maxLength} onChange={(e) => setValue(e.target.value)} />
        ) : (
          <input ref={inputRef as any} value={value} placeholder={options.placeholder} maxLength={options.maxLength} onChange={(e) => setValue(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') void confirm(); }} />
        ))}
        {error && <div className="prompt-dialog-error">{error}</div>}
        <div className="prompt-dialog-actions">
          {options.cancelLabel && <button onClick={() => close(null)}>{options.cancelLabel}</button>}
          <button className="primary" disabled={submitting} onClick={() => void confirm()}>{submitting ? 'Checking...' : options.confirmLabel || 'OK'}</button>
        </div>
      </div>
    </div>
  );
}
