'use client';

import { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';

export function AuthPanel({ notice }: { notice?: string }) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const registering = mode === 'register';
  const forgot = mode === 'forgot';

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-4">
        <p className="text-sm font-bold text-prise-action">{registering ? 'Start your journey' : forgot ? 'Account recovery' : 'Welcome back'}</p>
        <button
          type="button"
          onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          className="rounded-button border border-prise-border bg-white px-3.5 py-2 text-xs font-semibold text-prise-text-secondary transition hover:border-prise-primary hover:text-prise-primary"
        >
          {mode === 'login' ? 'Create account' : 'Back to sign in'}
        </button>
      </div>
      <h1 className="text-[clamp(2rem,3vw,2.55rem)] font-bold leading-[1.08] tracking-[-.025em] text-prise-text">
        {registering ? 'Create your PrISE account' : forgot ? 'Reset your password' : 'Sign in to PrISE'}
      </h1>
      <p className="mb-7 mt-3 text-[15px] leading-6 text-prise-text-secondary">
        {registering ? 'Register your startup and begin the incubation journey.' : forgot ? 'Enter your account email and we will send a secure reset link.' : 'Access your program workspace and continue your progress.'}
      </p>
      {notice && mode === 'login' ? <div role="status" className="mb-5 rounded-xl bg-success-bg px-4 py-3 text-sm font-semibold text-success">{notice}</div> : null}
      {registering ? <RegisterForm /> : forgot ? <ForgotPasswordForm onBack={() => setMode('login')} /> : <LoginForm onForgotPassword={() => setMode('forgot')} />}
    </div>
  );
}
