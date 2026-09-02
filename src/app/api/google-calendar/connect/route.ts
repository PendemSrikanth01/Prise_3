import { randomBytes } from 'node:crypto';
import { NextResponse } from 'next/server';
import { hasPermission, requireSession } from '@/lib/auth';
import { googleAuthorizationUrl } from '@/lib/google-calendar';

const STATE_COOKIE = 'prise_google_oauth_state';

export async function GET() {
  const session = await requireSession();
  if (!hasPermission(session.user.role, 'session:manage') && !hasPermission(session.user.role, 'webinar:manage')) return NextResponse.redirect(new URL('/calendar?google=forbidden', process.env.APP_URL || 'http://127.0.0.1:3010'));
  const state = randomBytes(32).toString('base64url');
  const response = NextResponse.redirect(googleAuthorizationUrl(state));
  response.cookies.set(STATE_COOKIE, state, { httpOnly: true, sameSite: 'lax', secure: (process.env.APP_URL || '').startsWith('https://'), path: '/api/google-calendar', maxAge: 10 * 60 });
  return response;
}
