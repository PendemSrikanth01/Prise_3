'use client';

import { useActionState, useState } from 'react';
import { CalendarClock, Eye, Mail, Paperclip, Send } from 'lucide-react';
import { composeEmailAction } from '@/app/actions/email-workspace';

type Recipient = { id: string; label: string; email: string };

const presets = {
  BLANK: { subject: '', body: '' },
  WELCOME: { subject: 'Welcome to the PrISE 3.0 workspace', body: 'Hello,\n\nWelcome to the PrISE 3.0 incubation workspace. Your account and program access are ready.\n\nRegards,\nPrISE 3.0 Team' },
  TASK: { subject: 'PrISE 3.0 task follow-up', body: 'Hello,\n\nThis is a follow-up regarding your current PrISE 3.0 task. Please review the task, update its progress and contact the program team if support is required.\n\nRegards,\nPrISE 3.0 Team' },
  MEETING: { subject: 'PrISE 3.0 meeting invitation', body: 'Hello,\n\nYou are invited to a PrISE 3.0 meeting. Please review the date, time and meeting link shared below.\n\nRegards,\nPrISE 3.0 Team' },
  MILESTONE: { subject: 'PrISE 3.0 milestone follow-up', body: 'Hello,\n\nPlease review the latest milestone update in your PrISE 3.0 workspace and complete the next required action.\n\nRegards,\nPrISE 3.0 Team' },
} as const;

export function EmailComposer({ recipients, from, replyTo, configured }: { recipients: Recipient[]; from: string; replyTo: string; configured: boolean }) {
  const [state, action, pending] = useActionState(composeEmailAction, undefined);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const choosePreset = (value: keyof typeof presets) => { setSubject(presets[value].subject); setBody(presets[value].body); };

  return <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,.65fr)]">
    <form action={action} className="rounded-card border bg-white p-5 shadow-card sm:p-6">
      <div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-info-bg text-prise-primary"><Mail size={21} /></div><div><h2 className="font-semibold">Compose organization email</h2><p className="mt-1 text-xs text-prise-text-secondary">Every message is queued, auditable and retryable.</p></div></div>
      <div className="mt-5 grid gap-3 rounded-xl bg-prise-page p-4 text-xs sm:grid-cols-2"><div><span className="text-prise-text-muted">From</span><div className="mt-1 font-semibold">{from}</div></div><div><span className="text-prise-text-muted">Replies go to</span><div className="mt-1 font-semibold">{replyTo}</div></div></div>
      {!configured ? <div className="mt-4 rounded-xl bg-warning-bg p-3 text-sm text-warning">Delivery is disabled. Messages will stay safely queued.</div> : null}

      <fieldset className="mt-5"><legend className="text-sm font-semibold">Quick groups</legend><div className="mt-2 flex flex-wrap gap-2">{[['INCUBATEES','All active incubatees'],['MENTORS','All mentors'],['PROGRAM','Program team']] .map(([value,label]) => <label key={value} className="flex items-center gap-2 rounded-pill border bg-white px-3 py-2 text-xs font-semibold"><input type="checkbox" name="groups" value={value} className="accent-prise-primary" />{label}</label>)}</div></fieldset>
      <label className="mt-4 block text-sm font-semibold">Select people<span className="ml-2 font-normal text-prise-text-muted">Ctrl/Cmd to select more than one</span><select name="recipientIds" multiple className="mt-2 h-36 w-full rounded-input border bg-white p-2 text-sm">{recipients.map((person) => <option key={person.id} value={person.id}>{person.label} · {person.email}</option>)}</select></label>
      <label className="mt-4 block text-sm font-semibold">Additional To addresses<textarea name="toEmails" rows={2} placeholder="name@example.com, another@example.com" className="mt-2 w-full rounded-input border p-3 text-sm font-normal" /></label>
      <details className="mt-3 rounded-xl border p-3"><summary className="cursor-pointer text-sm font-semibold text-prise-primary">Add CC or BCC</summary><div className="mt-3 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold">CC<textarea name="ccEmails" rows={2} placeholder="Visible recipients" className="mt-1.5 w-full rounded-input border p-3 text-sm font-normal" /></label><label className="text-xs font-semibold">BCC<textarea name="bccEmails" rows={2} placeholder="Private recipients" className="mt-1.5 w-full rounded-input border p-3 text-sm font-normal" /></label></div></details>

      <label className="mt-4 block text-sm font-semibold">Template<select defaultValue="BLANK" onChange={(event) => choosePreset(event.target.value as keyof typeof presets)} className="mt-2 h-11 w-full rounded-input border bg-white px-3 text-sm font-normal"><option value="BLANK">Custom / blank</option><option value="WELCOME">Welcome</option><option value="TASK">Task follow-up</option><option value="MEETING">Meeting invitation</option><option value="MILESTONE">Milestone follow-up</option></select></label>
      <label className="mt-4 block text-sm font-semibold">Subject<input name="subject" value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={240} className="mt-2 h-11 w-full rounded-input border px-3 font-normal" /></label>
      <label className="mt-4 block text-sm font-semibold">Message<textarea name="body" value={body} onChange={(event) => setBody(event.target.value)} required maxLength={10000} rows={10} className="mt-2 w-full rounded-input border p-3 text-sm font-normal leading-6" /></label>
      <div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="text-xs font-semibold"><span className="flex items-center gap-2"><Paperclip size={14} />Attachment · optional</span><input name="attachment" type="file" accept=".jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx" className="mt-2 block h-11 w-full rounded-input border bg-white px-2 py-2 text-xs file:mr-2 file:rounded-button file:border-0 file:bg-prise-page file:px-2 file:py-1" /></label><label className="text-xs font-semibold"><span className="flex items-center gap-2"><CalendarClock size={14} />Schedule · optional</span><input name="scheduledFor" type="datetime-local" step={900} className="mt-2 h-11 w-full rounded-input border px-3 text-sm font-normal" /></label></div>
      <div className="mt-5 flex flex-wrap items-center gap-3"><button disabled={pending} className="inline-flex min-h-11 items-center gap-2 rounded-button bg-prise-action px-5 text-sm font-semibold text-white disabled:opacity-60"><Send size={16} />{pending ? 'Preparing…' : 'Send or schedule'}</button><span className="text-xs text-prise-text-muted">Maximum 50 recipients · one attachment up to 10 MB</span></div>
      {state?.error ? <p role="alert" className="mt-4 rounded-xl bg-danger-bg p-3 text-sm text-danger">{state.error}</p> : null}{state?.success ? <p role="status" className="mt-4 rounded-xl bg-success-bg p-3 text-sm text-success">{state.success}</p> : null}
    </form>

    <aside className="h-fit rounded-card border bg-white p-5 shadow-card xl:sticky xl:top-5"><div className="flex items-center gap-2 text-sm font-semibold"><Eye size={17} className="text-prise-primary" />Live preview</div><div className="mt-4 overflow-hidden rounded-2xl border bg-white"><div className="bg-prise-primary px-5 py-4 text-xs font-bold uppercase tracking-[.12em] text-white">PrISE 3.0</div><div className="p-5"><h3 className="text-lg font-bold">{subject || 'Your subject appears here'}</h3><div className="mt-4 whitespace-pre-line text-sm leading-6 text-prise-text-secondary">{body || 'Write your message to preview it here.'}</div><p className="mt-6 text-xs text-prise-text-muted">PrISE 3.0 incubation team</p></div></div></aside>
  </div>;
}
