import { redirect } from 'next/navigation';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { BvcsrbLogo } from '@/components/brand/BrandIdentity';
import { getSession } from '@/lib/auth';
import styles from './login.module.css';

export const dynamic = 'force-dynamic';

export default async function LoginPage() {
  if (await getSession()) redirect('/');

  return (
    <main className={styles.shell}>
      <section className={styles.story} aria-label="PrISE journey">
        <div className={styles.storyShade} />
        <div className={styles.wordmark} aria-label="PrISE 3.0">PrISE 3.0</div>
        <p className={styles.storyCaption}>Every meaningful journey begins with a clear next step.</p>
      </section>

      <section className={styles.access}>
        <div className={styles.accessInner}>
          <BvcsrbLogo priority className={styles.organisationLogo} />
          <AuthPanel />
          <footer className={styles.footer}>
            <span>PrISE 3.0 Tracker</span>
            <span aria-hidden="true">·</span>
            <span>Private by default</span>
          </footer>
        </div>
      </section>
    </main>
  );
}
