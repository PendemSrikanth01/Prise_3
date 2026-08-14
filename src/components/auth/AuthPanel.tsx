'use client';

import { useState } from 'react';
import { LoginForm } from '@/components/auth/LoginForm';
import { RegisterForm } from '@/components/auth/RegisterForm';

export function AuthPanel() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const registering = mode === 'register';
  return (
    <div>
      <div className="mb-7 grid grid-cols-2 rounded-xl bg-prise-page p-1" role="tablist" aria-label="Account access">
        <button type="button" role="tab" aria-selected={!registering} onClick={() => setMode('login')} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${!registering ? 'bg-white text-prise-text shadow-sm' : 'text-prise-text-secondary'}`}>Sign in</button>
        <button type="button" role="tab" aria-selected={registering} onClick={() => setMode('register')} className={`rounded-lg px-3 py-2.5 text-sm font-semibold transition ${registering ? 'bg-white text-prise-text shadow-sm' : 'text-prise-text-secondary'}`}>Register</button>
      </div>
      <p className="text-sm font-semibold text-prise-primary">{registering ? 'Join PRISE 3.0' : 'Welcome back'}</p>
      <h2 className="mt-2 text-3xl font-bold tracking-[-.03em]">{registering ? 'Create your workspace' : 'Sign in to PRISE'}</h2>
      <p className="mb-7 mt-2 text-sm leading-6 text-prise-text-secondary">{registering ? 'Register your startup and begin the incubation pipeline.' : 'Use your registered or program-issued account.'}</p>
      {registering ? <RegisterForm /> : <LoginForm />}
    </div>
  );
}
