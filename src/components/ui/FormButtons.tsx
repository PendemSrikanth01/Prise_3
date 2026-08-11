'use client';

import { useFormStatus } from 'react-dom';

export function SubmitButton({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} className={`rounded-button bg-prise-primary px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-prise-primary-hover disabled:cursor-wait disabled:opacity-60 ${className}`}>{pending ? 'Saving…' : children}</button>;
}

export function ConfirmButton({ children, message, className = '' }: { children: React.ReactNode; message: string; className?: string }) {
  const { pending } = useFormStatus();
  return <button disabled={pending} onClick={(event) => { if (!window.confirm(message)) event.preventDefault(); }} className={`rounded-button px-3 py-2 text-sm font-semibold text-danger hover:bg-danger-bg disabled:opacity-50 ${className}`}>{pending ? 'Working…' : children}</button>;
}

