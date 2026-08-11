import { PageIntro } from '@/components/ui/PageIntro';

export default function SettingsPage() {
  return <div className="mx-auto w-full max-w-[1000px] p-4 sm:p-6 lg:p-8"><PageIntro title="Settings" description="Production settings will be restricted to program administrators." /><div className="mt-6 rounded-card border border-warning/20 bg-warning-bg p-5 text-sm leading-6 text-prise-text-secondary"><strong className="text-prise-text">Authentication required before public exposure.</strong> The Docker stack binds the application to localhost so it can only be published through an authenticated reverse proxy.</div></div>;
}
