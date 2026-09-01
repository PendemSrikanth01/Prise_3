import { NextResponse } from 'next/server';
import { processAutomaticNotifications } from '@/lib/notification-automation';

export async function POST(request: Request) {
  const configuredSecret = process.env.AUTOMATION_SECRET;
  const suppliedSecret = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  if (!configuredSecret || suppliedSecret !== configuredSecret) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  return NextResponse.json({ status: 'ok', ...(await processAutomaticNotifications()) });
}
