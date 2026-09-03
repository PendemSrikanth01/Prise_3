import { redirect } from 'next/navigation';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { BrandLockup } from '@/components/brand/BrandIdentity';
import { getSession } from '@/lib/auth';
import styles from './login.module.css';

export const dynamic = 'force-dynamic';

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ password?: string }> }) {
  if (await getSession()) redirect('/');
  const passwordStatus = (await searchParams).password;

  return (
    <main className={styles.shell}>
      <section className={styles.story} aria-label="PrISE journey">
        <div className={styles.storyShade} />
        <p className={styles.storyCaption}>Every meaningful journey begins with a clear next step.</p>
      </section>

      <section className={styles.access}>
        <div className={styles.accessInner}>
          <BrandLockup variant="login" priority className={styles.organisationLogo} />
          <AuthPanel notice={passwordStatus === 'reset' ? 'Password updated. You can now sign in securely.' : undefined} />
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
