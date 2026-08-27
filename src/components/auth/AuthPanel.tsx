'use client';

import { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

export function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const registering = mode === 'register';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-prise-action">{registering ? 'Start your journey' : 'Welcome back'}</p>
        <button
          type="button"
          onClick={() => setMode(registering ? 'login' : 'register')}
          className="rounded-button border border-prise-border bg-white px-3.5 py-2 text-xs font-semibold text-prise-text-secondary transition hover:border-prise-primary hover:text-prise-primary"
        >
          {registering ? 'Back to sign in' : 'Create account'}
        </button>
      </div>
      <h1 className="text-[clamp(2rem,3vw,2.55rem)] font-bold leading-[1.08] tracking-[-.025em] text-prise-text">
        {registering ? 'Create your PrISE account' : 'Sign in to PrISE'}
      </h1>
      <p className="mb-7 mt-3 text-[15px] leading-6 text-prise-text-secondary">
        {registering ? 'Register your startup and begin the incubation journey.' : 'Access your program workspace and continue your progress.'}
      </p>
      {registering ? <RegisterForm /> : <LoginForm />}
    </div>
  );
}
