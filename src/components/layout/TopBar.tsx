'use client';

import { Bell, Menu, Search } from 'lucide-react';

export function TopBar({ onMenu, userName }: { onMenu: () => void; userName: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-prise-border bg-white/88 px-4 backdrop-blur-xl sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          onClick={onMenu}
          className="rounded-button p-2 text-prise-text-secondary transition-colors hover:bg-prise-page md:hidden"
        >
          <Menu size={19} />
        </button>
        <div className="rounded-pill border border-prise-border bg-white px-3 py-2 text-sm font-medium text-prise-text sm:px-4">
          PRISE 3.0
        </div>
      </div>

      <form action="/startups" className="mx-auto hidden w-full max-w-md items-center gap-2 rounded-pill border border-prise-border bg-prise-page px-4 py-2 md:flex">
        <Search size={16} className="text-prise-text-muted" />
        <input
          name="q"
          aria-label="Search startups"
          placeholder="Search startups…"
          className="min-w-0 flex-1 bg-transparent text-sm text-prise-text placeholder:text-prise-text-muted focus:outline-none"
        />
      </form>

      <div className="flex items-center gap-2">
        <div className="hidden text-right sm:block"><div className="text-xs font-semibold text-prise-text">{userName}</div><div className="text-[11px] text-prise-text-muted">Secure session</div></div>
        <div className="relative rounded-full p-2 text-prise-text-secondary" aria-label="No new notifications">
          <Bell size={18} />
        </div>
      </div>
    </header>
  );
}
