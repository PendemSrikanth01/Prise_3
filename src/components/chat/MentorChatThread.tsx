'use client';

import { useActionState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Send } from 'lucide-react';
import { markMentorConversationReadAction, sendMentorMessageAction, type ChatFeedback } from '@/app/actions/mentor-chat';

type ChatMessage = {
  id: string;
  body: string;
  createdAt: string;
  authorId: string | null;
  authorName: string;
  authorRole: string;
};

const initialState: ChatFeedback = { status: 'idle', message: '' };

export function MentorChatThread({ messages, startupId, mentorId, currentUserId, canSend }: {
  messages: ChatMessage[];
  startupId: string;
  mentorId: string;
  currentUserId: string;
  canSend: boolean;
}) {
  const router = useRouter();
  const bottomRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [state, action, pending] = useActionState(sendMentorMessageAction, initialState);
  const latestMessageId = messages.at(-1)?.id ?? '';

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'nearest' });
    void markMentorConversationReadAction(startupId, mentorId);
  }, [latestMessageId, mentorId, startupId]);

  useEffect(() => {
    const timer = window.setInterval(() => router.refresh(), 15000);
    return () => window.clearInterval(timer);
  }, [router]);

  useEffect(() => {
    if (state.status === 'success') formRef.current?.reset();
  }, [state]);

  return <>
    <div className="min-h-[320px] space-y-3 overflow-y-auto bg-prise-page/55 p-3 sm:max-h-[60vh] sm:p-5">
      {messages.map((message) => {
        const mine = message.authorId === currentUserId;
        return <article key={message.id} className={`max-w-[88%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[72%] ${mine ? 'ml-auto rounded-br-md bg-prise-primary text-white' : 'mr-auto rounded-bl-md border bg-white'}`}>
          <div className={`text-[11px] font-semibold ${mine ? 'text-white/75' : 'text-prise-text-secondary'}`}>{message.authorName} · {message.authorRole.replaceAll('_', ' ').toLowerCase()}</div>
          <p className="mt-1 whitespace-pre-wrap break-words text-sm leading-6">{message.body}</p>
          <time className={`mt-1 block text-right text-[10px] ${mine ? 'text-white/65' : 'text-prise-text-muted'}`}>{new Date(message.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</time>
        </article>;
      })}
      {!messages.length ? <div className="mx-auto max-w-md rounded-2xl border border-dashed bg-white p-8 text-center text-sm leading-6 text-prise-text-secondary">No messages yet. Start with an introduction and agree the next mentoring action.</div> : null}
      <div ref={bottomRef} />
    </div>

    {canSend ? <form ref={formRef} action={action} className="border-t bg-white p-3 sm:p-4">
      <input type="hidden" name="startupId" value={startupId} />
      <input type="hidden" name="mentorId" value={mentorId} />
      <div className="flex items-end gap-2">
        <textarea name="body" required maxLength={3000} rows={2} aria-label="Message" placeholder="Write a message…" className="max-h-40 min-h-12 flex-1 resize-y rounded-input border bg-white px-3 py-3 text-base focus:border-prise-primary sm:text-sm" />
        <button disabled={pending} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-button bg-prise-action px-4 text-sm font-semibold text-white hover:bg-prise-action-hover disabled:cursor-wait disabled:opacity-60"><Send size={17} /><span className="hidden sm:inline">{pending ? 'Sending…' : 'Send'}</span></button>
      </div>
      {state.status === 'error' ? <p role="alert" className="mt-2 text-sm font-semibold text-danger">{state.message}</p> : null}
    </form> : <div className="border-t bg-white p-4 text-sm text-prise-text-secondary">Program Team access is read-only for oversight and support.</div>}
  </>;
}
