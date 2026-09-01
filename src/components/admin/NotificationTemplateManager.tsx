import { NotificationTemplateKey } from '@prisma/client';
import { sendNotificationTemplateTestAction, updateNotificationTemplateAction } from '@/app/actions/notification-templates';
import { SubmitButton } from '@/components/ui/FormButtons';
import { NOTIFICATION_TEMPLATE_DEFAULTS } from '@/lib/notification-templates';

type TemplateRow = {
  key: NotificationTemplateKey;
  name: string;
  subjectTemplate: string;
  bodyTemplate: string;
  isActive: boolean;
  autoSend: boolean;
  previewSubject: string;
  previewText: string;
};

const groupLabel: Record<NotificationTemplateKey, string> = {
  ACCOUNT_WELCOME: 'Welcome',
  TASK_ASSIGNED: 'Tasks',
  TASK_REMINDER: 'Tasks',
  SESSION_INVITE: 'Meetings',
  SESSION_REMINDER: 'Meetings',
};

export function NotificationTemplateManager({ templates, testRecipient }: { templates: TemplateRow[]; testRecipient: string }) {
  return <section className="mt-5 rounded-card border bg-white p-5 shadow-card sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="font-semibold">Email automations</h2><p className="mt-1 text-sm text-prise-text-secondary">Edit messages, control automatic delivery, preview content and send a test to yourself.</p></div>
      <span className="rounded-pill bg-prise-page px-3 py-1.5 text-xs font-semibold">Reply-To: prise@balavikasa.org</span>
    </div>
    <div className="mt-5 space-y-3">{templates.map((template) => <details key={template.key} className="rounded-input border bg-white open:shadow-card">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3">
        <div><div className="text-xs font-bold uppercase tracking-wide text-prise-primary">{groupLabel[template.key]}</div><div className="mt-0.5 text-sm font-semibold">{template.name}</div></div>
        <div className="flex gap-2 text-xs font-semibold"><span className={`rounded-pill px-2.5 py-1 ${template.isActive ? 'bg-success-bg text-success' : 'bg-prise-page text-prise-text-muted'}`}>{template.isActive ? 'Active' : 'Paused'}</span><span className="rounded-pill bg-prise-page px-2.5 py-1">{template.autoSend ? 'Automatic' : 'Approval'}</span></div>
      </summary>
      <div className="border-t p-4">
        <form action={updateNotificationTemplateAction} className="grid gap-3">
          <input type="hidden" name="key" value={template.key} />
          <label className="grid gap-1 text-xs font-semibold">Subject<input name="subjectTemplate" defaultValue={template.subjectTemplate} required maxLength={240} className="h-11 rounded-input border px-3 text-sm font-normal" /></label>
          <label className="grid gap-1 text-xs font-semibold">Message<textarea name="bodyTemplate" defaultValue={template.bodyTemplate} required maxLength={5000} rows={7} className="rounded-input border p-3 text-sm font-normal" /></label>
          <div className="text-xs text-prise-text-muted">Available: {NOTIFICATION_TEMPLATE_DEFAULTS[template.key].variables.map((variable) => `{{${variable}}}`).join(' · ')}</div>
          <div className="flex flex-wrap items-center gap-4"><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isActive" defaultChecked={template.isActive} /> Active</label><label className="flex items-center gap-2 text-sm"><input type="checkbox" name="autoSend" defaultChecked={template.autoSend} /> Send automatically</label><SubmitButton>Save template</SubmitButton></div>
        </form>
        <details className="mt-4 rounded-input bg-prise-page p-3"><summary className="cursor-pointer text-sm font-semibold">Preview</summary><div className="mt-3 rounded-input bg-white p-4 text-sm"><div className="font-semibold">{template.previewSubject}</div><div className="mt-3 whitespace-pre-line text-prise-text-secondary">{template.previewText}</div></div></details>
        <form action={sendNotificationTemplateTestAction} className="mt-3 flex flex-wrap items-center gap-3"><input type="hidden" name="key" value={template.key} /><SubmitButton className="!bg-prise-primary !py-2">Send test</SubmitButton><span className="text-xs text-prise-text-muted">Test recipient: {testRecipient}</span></form>
      </div>
    </details>)}</div>
  </section>;
}
