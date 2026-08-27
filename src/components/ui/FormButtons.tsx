'use client';

import { useFormStatus } from 'react-dom';

type ServerFormAction = (formData: FormData) => void | Promise<void>;

export function SubmitButton({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={`min-h-10 rounded-button bg-prise-action px-4 py-2 text-sm font-semibold text-white shadow-[0_7px_18px_rgb(229_57_61/16%)] transition hover:bg-prise-action-hover disabled:cursor-wait disabled:opacity-60 ${className}`}>{pending ? 'Saving…' : children}</button>;
}

export function ConfirmButton({ children, message, className = '', formAction }: { children: React.ReactNode; message: string; className?: string; formAction?: ServerFormAction }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} formAction={formAction} aria-label={typeof children === 'string' ? undefined : message} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }} className={`rounded-button px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-bg disabled:opacity-50 ${className}`}>{pending ? 'Working…' : children}</button>;
}
