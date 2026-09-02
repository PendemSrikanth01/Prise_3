'use client';

import { Bell, Menu, Search, UserRound } from 'lucide-react';
import { PriseWordmark } from '@/components/brand/BrandIdentity';

export function TopBar({ onMenu, mobileOpen, userName }: { onMenu: () => void; mobileOpen: boolean; userName: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-4 border-b border-white/20 bg-[linear-gradient(135deg,rgb(37_104_130/96%),rgb(57_124_152/92%))] px-4 text-white shadow-[0_8px_28px_rgb(23_79_101/15%)] backdrop-blur-2xl sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Open navigation"
          aria-controls="primary-navigation"
          aria-expanded={mobileOpen}
          onClick={onMenu}
          className="rounded-button p-2 text-white/85 transition-colors hover:bg-white/10 md:hidden"
        >
          <Menu size={19} />
        </button>
        <PriseWordmark className="text-white [&>span:last-child]:text-white/70 [&>span>span]:text-[#ff6a6d]" />
      </div>

      <form action="/startups" className="mx-auto hidden h-10 w-full max-w-lg items-center gap-2 rounded-input border border-white/25 bg-white/94 px-4 shadow-sm md:flex">
        <Search size={16} className="text-prise-primary" />
        <input
          name="q"
          aria-label="Search startups"
          placeholder="Search startups…"
          className="min-w-0 flex-1 bg-transparent text-sm text-prise-text placeholder:text-prise-text-muted focus:outline-none"
        />
      </form>

      <div className="flex items-center gap-2">
        <div className="hidden text-right sm:block"><div className="text-sm font-semibold text-white">{userName}</div><div className="text-[11px] text-white/65">Secure session</div></div>
        <div className="hidden h-9 w-9 items-center justify-center rounded-full bg-white/14 text-white sm:flex"><UserRound size={18} /></div>
        <div className="relative rounded-full p-2 text-white/85" role="status" aria-label="No new notifications">
          <Bell size={18} />
        </div>
      </div>
    </header>
  );
}
