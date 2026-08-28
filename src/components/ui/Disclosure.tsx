'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export function Disclosure({
  summary,
  children,
  className = '',
  summaryClassName = '',
  contentClassName = '',
  defaultOpen = false,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  summaryClassName?: string;
  contentClassName?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return <section className={className}>
    <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className={`flex w-full items-center text-left ${summaryClassName}`}>
      <span className="min-w-0 flex-1">{summary}</span>
      <ChevronDown size={16} className={`ml-3 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
    </button>
    {open ? <div className={contentClassName}>{children}</div> : null}
  </section>;
}
