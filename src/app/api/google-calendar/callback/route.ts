import { NextRequest, NextResponse } from 'next/server';
import { hasPermission, requireSession } from '@/lib/auth';
import { encryptGoogleToken, exchangeGoogleAuthorizationCode, googleAccountEmail } from '@/lib/google-calendar';
import { prisma } from '@/lib/prisma';

const STATE_COOKIE = 'prise_google_oauth_state';

function calendarRedirect(status: string) {
  return new URL(`/calendar?google=${status}`, process.env.APP_URL || 'http://127.0.0.1:3010');
}

export async function GET(request: NextRequest) {
  const session = await requireSession();
  if (!hasPermission(session.user.role, 'session:manage') && !hasPermission(session.user.role, 'webinar:manage')) return NextResponse.redirect(calendarRedirect('forbidden'));
  const state = request.nextUrl.searchParams.get('state');
  const code = request.nextUrl.searchParams.get('code');
  const expectedState = request.cookies.get(STATE_COOKIE)?.value;
  if (!state || !expectedState || state !== expectedState || !code) return NextResponse.redirect(calendarRedirect('error'));

  try {
    const token = await exchangeGoogleAuthorizationCode(code);
    const accountEmail = await googleAccountEmail(token.access_token);
    const existing = await prisma.googleCalendarConnection.findUnique({ where: { personId: session.user.id }, select: { refreshTokenEncrypted: true } });
    const refreshTokenEncrypted = token.refresh_token ? encryptGoogleToken(token.refresh_token) : existing?.refreshTokenEncrypted;
    if (!refreshTokenEncrypted) throw new Error('Google did not return offline access. Remove PrISE from Google Account permissions, then connect again.');
    const connection = await prisma.googleCalendarConnection.upsert({
      where: { personId: session.user.id },
      update: { googleAccountEmail: accountEmail, refreshTokenEncrypted, scopes: token.scope || null },
      create: { personId: session.user.id, googleAccountEmail: accountEmail, refreshTokenEncrypted, scopes: token.scope || null },
    });
    await prisma.activityLog.create({ data: { actorId: session.user.id, actorRole: session.user.role, entityType: 'GoogleCalendarConnection', entityId: connection.id, action: existing ? 'reconnected' : 'connected', summary: `${session.user.name}: connected Google Calendar`, meta: { googleAccountEmail: accountEmail } } });
    const response = NextResponse.redirect(calendarRedirect('connected'));
    response.cookies.delete(STATE_COOKIE);
    return response;
  } catch (error) {
    console.error('Google Calendar callback failed', error instanceof Error ? error.message : 'Unknown error');
    const response = NextResponse.redirect(calendarRedirect('error'));
    response.cookies.delete(STATE_COOKIE);
    return response;
  }
}
