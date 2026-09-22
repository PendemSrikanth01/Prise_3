'use client';

import Link from 'next/link';
import { Bell, CheckCheck, Menu, Search, UserRound } from 'lucide-react';
import { useState } from 'react';
import { markAllInAppNotificationsReadAction, markInAppNotificationReadAction } from '@/app/actions/in-app-notifications';
import { PriseWordmark } from '@/components/brand/BrandIdentity';

type NotificationItem = { id: string; title: string; message: string; href: string | null; readAt: string | null; createdAt: string };

export function TopBar({ onMenu, mobileOpen, userName, notifications, unreadCount }: { onMenu: () => void; mobileOpen: boolean; userName: string; notifications: NotificationItem[]; unreadCount: number }) {
  const [notificationsOpen, setNotificationsOpen] = useState(false);
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
        <div className="relative">
          <button type="button" onClick={() => setNotificationsOpen((open) => !open)} className="relative rounded-full p-2 text-white/85 transition hover:bg-white/10" aria-label={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`} aria-expanded={notificationsOpen}>
            <Bell size={18} />
            {unreadCount > 0 ? <span className="absolute -right-0.5 -top-0.5 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-prise-action px-1 text-[10px] font-bold text-white">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
          </button>
          {notificationsOpen ? <div className="absolute right-0 top-12 z-50 w-[min(92vw,380px)] overflow-hidden rounded-2xl border border-prise-border bg-white text-prise-text shadow-2xl">
            <div className="flex items-center justify-between border-b px-4 py-3"><div><div className="font-semibold">Notifications</div><div className="text-xs text-prise-text-muted">{unreadCount ? `${unreadCount} unread` : 'You are all caught up'}</div></div>{unreadCount > 0 ? <form action={markAllInAppNotificationsReadAction}><button className="inline-flex items-center gap-1.5 text-xs font-semibold text-prise-primary"><CheckCheck size={14} />Mark all read</button></form> : null}</div>
            <div className="max-h-[420px] overflow-y-auto divide-y">
              {notifications.map((notification) => <div key={notification.id} className={`p-4 ${notification.readAt ? 'bg-white' : 'bg-info-bg/55'}`}>
                <div className="flex items-start gap-3">{notification.readAt ? null : <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-prise-action" />}<div className="min-w-0 flex-1"><div className="text-sm font-semibold">{notification.title}</div><p className="mt-1 text-xs leading-5 text-prise-text-secondary">{notification.message}</p><div className="mt-2 flex flex-wrap items-center justify-between gap-2"><span className="text-[11px] text-prise-text-muted">{new Date(notification.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</span><div className="flex items-center gap-3">{!notification.readAt ? <form action={markInAppNotificationReadAction}><input type="hidden" name="notificationId" value={notification.id} /><button className="text-xs font-semibold text-prise-text-secondary">Mark read</button></form> : null}{notification.href ? <Link href={notification.href} onClick={() => setNotificationsOpen(false)} className="text-xs font-semibold text-prise-primary">Open →</Link> : null}</div></div></div></div>
              </div>)}
              {notifications.length === 0 ? <div className="p-8 text-center text-sm text-prise-text-secondary">No notifications yet.</div> : null}
            </div>
          </div> : null}
        </div>
      </div>
    </header>
  );
}
