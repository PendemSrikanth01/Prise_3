import 'server-only';

import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
import { buildGoogleCalendarEvent, type CalendarEventInput } from '@/lib/google-calendar-event';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const CALENDAR_API = 'https://www.googleapis.com/calendar/v3';
const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/calendar.events'];

type OAuthTokenResponse = { access_token: string; expires_in?: number; refresh_token?: string; scope?: string; token_type?: string; id_token?: string };
type GoogleEventResponse = { id: string; hangoutLink?: string; htmlLink?: string; conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> } };
type CalendarConnection = { id: string; refreshTokenEncrypted: string; googleAccountEmail: string };

function oauthConfig() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim() || `${process.env.APP_URL || 'http://127.0.0.1:3010'}/api/google-calendar/callback`;
  if (!clientId || !clientSecret) throw new Error('Google Calendar is not configured. Add the Google OAuth credentials first.');
  return { clientId, clientSecret, redirectUri };
}

function encryptionKey() {
  const configured = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY?.trim();
  const key = configured ? Buffer.from(configured, 'base64') : Buffer.alloc(0);
  if (key.length !== 32) throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY must be a base64-encoded 32-byte key.');
  return key;
}

export function googleCalendarConfigured() {
  try { oauthConfig(); encryptionKey(); return true; } catch { return false; }
}

export function googleAuthorizationUrl(state: string) {
  const config = oauthConfig();
  const url = new URL(AUTH_URL);
  url.search = new URLSearchParams({ client_id: config.clientId, redirect_uri: config.redirectUri, response_type: 'code', scope: SCOPES.join(' '), access_type: 'offline', prompt: 'consent', include_granted_scopes: 'true', state }).toString();
  return url.toString();
}

async function tokenRequest(parameters: Record<string, string>) {
  const response = await fetch(TOKEN_URL, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(parameters), cache: 'no-store' });
  if (!response.ok) throw new Error(`Google authorization failed (${response.status}).`);
  return response.json() as Promise<OAuthTokenResponse>;
}

export async function exchangeGoogleAuthorizationCode(code: string) {
  const config = oauthConfig();
  return tokenRequest({ code, client_id: config.clientId, client_secret: config.clientSecret, redirect_uri: config.redirectUri, grant_type: 'authorization_code' });
}

export async function googleAccountEmail(accessToken: string) {
  const response = await fetch(USERINFO_URL, { headers: { Authorization: `Bearer ${accessToken}` }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Google account lookup failed (${response.status}).`);
  const user = await response.json() as { email?: string; email_verified?: boolean };
  if (!user.email || user.email_verified === false) throw new Error('Google did not return a verified email address.');
  return user.email.toLowerCase();
}

export function encryptGoogleToken(value: string) {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
}

function decryptGoogleToken(value: string) {
  const [ivValue, tagValue, encryptedValue] = value.split('.');
  if (!ivValue || !tagValue || !encryptedValue) throw new Error('Stored Google credential is invalid.');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(), Buffer.from(ivValue, 'base64url'));
  decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, 'base64url')), decipher.final()]).toString('utf8');
}

async function accessToken(connection: CalendarConnection) {
  const config = oauthConfig();
  const token = await tokenRequest({ refresh_token: decryptGoogleToken(connection.refreshTokenEncrypted), client_id: config.clientId, client_secret: config.clientSecret, grant_type: 'refresh_token' });
  return token.access_token;
}

async function calendarRequest<T>(connection: CalendarConnection, path: string, init: RequestInit) {
  const token = await accessToken(connection);
  const response = await fetch(`${CALENDAR_API}${path}`, { ...init, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...(init.headers || {}) }, cache: 'no-store' });
  if (!response.ok) throw new Error(`Google Calendar request failed (${response.status}). Reconnect the Google account if this continues.`);
  if (response.status === 204) return null as T;
  return response.json() as Promise<T>;
}

function meetLink(event: GoogleEventResponse) {
  return event.hangoutLink || event.conferenceData?.entryPoints?.find(({ entryPointType }) => entryPointType === 'video')?.uri || null;
}

export async function createGoogleMeetEvent(connection: CalendarConnection, input: CalendarEventInput) {
  const event = await calendarRequest<GoogleEventResponse>(connection, '/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all', { method: 'POST', body: JSON.stringify(buildGoogleCalendarEvent(input, randomUUID())) });
  const meetingUrl = meetLink(event);
  if (!event.id || !meetingUrl) throw new Error('Google created the event without a Meet link. Check that Google Meet is enabled for this account.');
  return { externalEventId: event.id, meetingUrl };
}

export async function updateGoogleMeetEvent(connection: CalendarConnection, externalEventId: string, input: CalendarEventInput) {
  const event = await calendarRequest<GoogleEventResponse>(connection, `/calendars/primary/events/${encodeURIComponent(externalEventId)}?conferenceDataVersion=1&sendUpdates=all`, { method: 'PATCH', body: JSON.stringify(buildGoogleCalendarEvent(input)) });
  return { meetingUrl: meetLink(event) };
}

export async function deleteGoogleMeetEvent(connection: CalendarConnection, externalEventId: string) {
  await calendarRequest<null>(connection, `/calendars/primary/events/${encodeURIComponent(externalEventId)}?sendUpdates=all`, { method: 'DELETE' });
}

export async function revokeGoogleCalendarConnection(connection: CalendarConnection) {
  const refreshToken = decryptGoogleToken(connection.refreshTokenEncrypted);
  await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: refreshToken }), cache: 'no-store' }).catch(() => undefined);
}
