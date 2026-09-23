'use client';

import { useEffect, useState } from 'react';
import { BellRing, Download, LoaderCircle, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

function applicationServerKey(value: string) {
  const padding = '='.repeat((4 - value.length % 4) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bytes = atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export function PwaControls({ publicKey }: { publicKey: string }) {
  const [open, setOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const frame = window.requestAnimationFrame(() => setInstalled(window.matchMedia('(display-mode: standalone)').matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)));
    void navigator.serviceWorker.register('/sw.js').then(async (registration) => {
      setSubscribed(Boolean(await registration.pushManager.getSubscription()));
    }).catch(() => setMessage('App services are unavailable in this browser.'));
    const capturePrompt = (event: Event) => { event.preventDefault(); setInstallPrompt(event as BeforeInstallPromptEvent); };
    const markInstalled = () => { setInstalled(true); setInstallPrompt(null); };
    window.addEventListener('beforeinstallprompt', capturePrompt);
    window.addEventListener('appinstalled', markInstalled);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('beforeinstallprompt', capturePrompt);
      window.removeEventListener('appinstalled', markInstalled);
    };
  }, []);

  async function install() {
    if (!installPrompt) return;
    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    if (choice.outcome === 'accepted') setInstalled(true);
    setInstallPrompt(null);
  }

  async function enablePush() {
    if (!publicKey || !('serviceWorker' in navigator) || !('PushManager' in window)) return;
    setBusy(true);
    setMessage('');
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Notifications were not allowed. You can change this in the browser site settings.');
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey(publicKey) });
      const response = await fetch('/api/push-subscriptions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subscription.toJSON()) });
      if (!response.ok) throw new Error('The notification subscription could not be saved.');
      setSubscribed(true);
      setMessage('Mobile notifications are enabled on this device.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Notifications could not be enabled.');
    } finally {
      setBusy(false);
    }
  }

  async function disablePush() {
    setBusy(true);
    setMessage('');
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      if (subscription) {
        await fetch('/api/push-subscriptions', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: subscription.endpoint }) });
        await subscription.unsubscribe();
      }
      setSubscribed(false);
      setMessage('Notifications are disabled on this device.');
    } finally {
      setBusy(false);
    }
  }

  return <div className="relative">
    <button type="button" onClick={() => setOpen((value) => !value)} aria-label="App installation and mobile notifications" aria-expanded={open} className="relative rounded-full p-2 text-white/85 hover:bg-white/10"><Smartphone size={18} />{subscribed ? <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-emerald-300" /> : null}</button>
    {open ? <div className="absolute right-0 top-12 z-50 w-[min(92vw,340px)] rounded-2xl border bg-white p-4 text-prise-text shadow-2xl">
      <div className="flex items-start justify-between gap-3"><div><div className="font-semibold">PrISE on this device</div><p className="mt-1 text-xs leading-5 text-prise-text-secondary">Install the app and receive alerts even when PrISE is closed.</p></div><button type="button" onClick={() => setOpen(false)} aria-label="Close" className="rounded-lg p-1.5 text-prise-text-muted hover:bg-prise-page"><X size={16} /></button></div>
      <div className="mt-4 grid gap-2">
        {installed ? <div className="flex min-h-11 items-center gap-2 rounded-xl bg-success-bg px-3 text-sm font-semibold text-success"><Smartphone size={17} />App installed</div> : installPrompt ? <button type="button" onClick={install} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-prise-primary px-4 text-sm font-semibold text-white"><Download size={17} />Install PrISE app</button> : <div className="rounded-xl bg-prise-page p-3 text-xs leading-5 text-prise-text-secondary">Use your browser menu and choose <strong>Add to Home screen</strong> or <strong>Install app</strong>.</div>}
        {!publicKey ? <div className="rounded-xl bg-warning-bg p-3 text-xs leading-5 text-warning">Mobile alerts need VAPID keys configured on the server.</div> : subscribed ? <button type="button" disabled={busy} onClick={disablePush} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button border px-4 text-sm font-semibold text-prise-text-secondary disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <BellRing size={17} />}Disable notifications</button> : <button type="button" disabled={busy} onClick={enablePush} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-button bg-prise-action px-4 text-sm font-semibold text-white disabled:opacity-60">{busy ? <LoaderCircle className="animate-spin" size={17} /> : <BellRing size={17} />}Enable mobile notifications</button>}
      </div>
      {message ? <p role="status" className="mt-3 text-xs leading-5 text-prise-text-secondary">{message}</p> : null}
    </div> : null}
  </div>;
}
