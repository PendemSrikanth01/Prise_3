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
        <p className="text-sm font-bold text-[#ed1c24]">{registering ? 'Start your journey' : 'Welcome back'}</p>
        <button
          type="button"
          onClick={() => setMode(registering ? 'login' : 'register')}
          className="rounded-full border border-[#dedee3] px-3.5 py-2 text-xs font-semibold text-[#55555d] transition hover:border-[#ed1c24] hover:text-[#d0161d]"
        >
          {registering ? 'Back to sign in' : 'Create account'}
        </button>
      </div>
      <h1 className="font-serif text-[clamp(2.25rem,3.2vw,2.85rem)] font-bold leading-[1.05] tracking-[-.035em] text-[#171717]">
        {registering ? 'Create your PrISE account' : 'Sign in to PrISE'}
      </h1>
      <p className="mb-8 mt-3 text-[15px] leading-6 text-[#6e6e73]">
        {registering ? 'Register your startup and begin the incubation journey.' : 'Access your program workspace and continue your progress.'}
      </p>
      {registering ? <RegisterForm /> : <LoginForm />}
    </div>
  );
}
