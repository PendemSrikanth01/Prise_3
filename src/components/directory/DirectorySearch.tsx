'use client';

import { Search, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useCallback, useEffect, useState } from 'react';

export function DirectorySearch({ initialQuery, view }: { initialQuery: string; view: 'mentors' | 'incubatees' | 'program' }) {
  const router = useRouter();
  const [query, setQuery] = useState(initialQuery);

  const navigate = useCallback((value: string) => {
    const params = new URLSearchParams({ view });
    const trimmed = value.trim();
    if (trimmed) params.set('q', trimmed);
    router.replace(`/directory?${params.toString()}`, { scroll: false });
  }, [router, view]);

  useEffect(() => {
    if (query.trim() === initialQuery) return;
    const timeout = window.setTimeout(() => navigate(query), 300);
    return () => window.clearTimeout(timeout);
  }, [initialQuery, navigate, query]);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(query);
  };

  return <form onSubmit={submit} role="search" className="mt-6">
    <label htmlFor="directory-search" className="sr-only">Search the full PrISE directory</label>
    <div className="relative max-w-3xl">
      <Search size={19} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-prise-primary" />
      <input
        id="directory-search"
        name="q"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search mentors, incubatees, team, roles, sectors or expertise..."
        autoComplete="off"
        className="h-12 w-full rounded-xl border bg-white pl-12 pr-12 text-sm shadow-sm outline-none transition focus:border-prise-primary focus:ring-2 focus:ring-prise-primary/15"
      />
      {query ? <button type="button" onClick={() => { setQuery(''); navigate(''); }} aria-label="Clear directory search" className="absolute right-2 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-lg text-prise-text-muted hover:bg-prise-page hover:text-prise-text"><X size={17} /></button> : null}
    </div>
    <p className="mt-2 text-xs text-prise-text-muted">Searches all active mentors, incubatees and program team records together.</p>
  </form>;
}
