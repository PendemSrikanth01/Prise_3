'use server';

import { compare, hash } from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { OnboardingItemType, Prisma, Role, StartupMemberRole, StartupStatus } from '@prisma/client';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { clearAuthSession, createAuthSession, privacyHash, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { text } from '@/lib/form';
import { validPassword } from '@/lib/password';
import { sendDirectEmail } from '@/lib/email';
import { hashPasswordResetToken, passwordResetExpiry, validPasswordResetToken } from '@/lib/password-reset';

export type AuthActionState = { error?: string } | undefined;
export type PasswordResetActionState = { error?: string; success?: string } | undefined;

const resetRequestMessage = 'If an active account matches that email, a password reset link has been sent.';

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] || character);
}

export async function requestPasswordResetAction(_: PasswordResetActionState, formData: FormData): Promise<PasswordResetActionState> {
  const email = text(formData, 'email', 254).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Enter a valid email address.' };

  const requestHeaders = await headers();
  const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const requestedIpHash = privacyHash(forwarded);
  const person = await prisma.person.findUnique({ where: { email }, select: { id: true, name: true, email: true, isActive: true } });
  if (!person?.isActive) return { success: resetRequestMessage };

  const windowStart = new Date(Date.now() - 15 * 60 * 1000);
  const [accountRequests, ipRequests] = await Promise.all([
    prisma.passwordResetToken.count({ where: { personId: person.id, createdAt: { gte: windowStart } } }),
    prisma.passwordResetToken.count({ where: { requestedIpHash, createdAt: { gte: windowStart } } }),
  ]);
  if (accountRequests >= 3 || ipRequests >= 10) return { success: resetRequestMessage };

  const token = randomBytes(32).toString('base64url');
  const resetUrl = new URL('/reset-password', process.env.APP_URL || 'http://127.0.0.1:3010');
  resetUrl.searchParams.set('token', token);
  const safeName = escapeHtml(person.name);
  const safeUrl = escapeHtml(resetUrl.toString());
  const textBody = `Hi ${person.name},\n\nUse this secure link to choose a new PrISE 3.0 password. It expires in 30 minutes and can be used once.\n\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`;
  const reset = await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.updateMany({ where: { personId: person.id, usedAt: null }, data: { usedAt: new Date() } });
    return tx.passwordResetToken.create({ data: { personId: person.id, tokenHash: hashPasswordResetToken(token), requestedIpHash, expiresAt: passwordResetExpiry() } });
  });
  await sendDirectEmail({
    to: person.email,
    subject: 'Reset your PrISE 3.0 password',
    text: textBody,
    html: `<div style="font-family:Arial,sans-serif;line-height:1.6"><p>Hi ${safeName},</p><p>Use the button below to choose a new PrISE 3.0 password. This link expires in 30 minutes and can be used once.</p><p><a href="${safeUrl}" style="display:inline-block;padding:12px 18px;border-radius:8px;background:#ed1c24;color:#fff;text-decoration:none;font-weight:700">Reset password</a></p><p>If you did not request this, you can ignore this email.</p></div>`,
    idempotencyKey: reset.tokenHash,
  }).catch((error) => console.error('Password reset email failed', error instanceof Error ? error.message : 'Unknown error'));
  return { success: resetRequestMessage };
}

export async function resetPasswordAction(_: PasswordResetActionState, formData: FormData): Promise<PasswordResetActionState> {
  const token = text(formData, 'token', 128);
  const newPassword = text(formData, 'newPassword', 256);
  const confirmPassword = text(formData, 'confirmPassword', 256);
  if (!validPasswordResetToken(token)) return { error: 'This reset link is invalid. Request a new one.' };
  if (newPassword !== confirmPassword) return { error: 'The passwords do not match.' };
  if (!validPassword(newPassword)) return { error: 'Use at least 6 characters.' };

  const reset = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashPasswordResetToken(token) },
    include: { person: { select: { id: true, name: true, role: true, passwordHash: true, isActive: true } } },
  });
  if (!reset || reset.usedAt || reset.expiresAt <= new Date() || !reset.person.isActive) return { error: 'This reset link has expired or was already used. Request a new one.' };
  if (await compare(newPassword, reset.person.passwordHash)) return { error: 'Choose a password you have not just used.' };

  const now = new Date();
  const passwordHash = await hash(newPassword, 12);
  try {
    await prisma.$transaction(async (tx) => {
      const claimed = await tx.passwordResetToken.updateMany({ where: { id: reset.id, usedAt: null, expiresAt: { gt: now } }, data: { usedAt: now } });
      if (claimed.count !== 1) throw new Error('RESET_TOKEN_ALREADY_USED');
      await Promise.all([
        tx.person.update({ where: { id: reset.person.id }, data: { passwordHash, mustChangePassword: false } }),
        tx.authSession.updateMany({ where: { personId: reset.person.id, revokedAt: null }, data: { revokedAt: now } }),
        tx.passwordResetToken.updateMany({ where: { personId: reset.person.id, usedAt: null }, data: { usedAt: now } }),
        tx.activityLog.create({ data: { actorId: reset.person.id, actorRole: reset.person.role, entityType: 'Person', entityId: reset.person.id, action: 'password_self_reset', summary: `${reset.person.name}: password reset completed` } }),
      ]);
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'RESET_TOKEN_ALREADY_USED') return { error: 'This reset link has expired or was already used. Request a new one.' };
    throw error;
  }
  redirect('/login?password=reset');
}

export async function loginAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = text(formData, 'email', 254).toLowerCase();
  const password = text(formData, 'password', 256);
  const keepSignedIn = formData.get('keepSignedIn') === 'on';
  if (!email || !password) return { error: 'Enter your email and password.' };

  try {
    const requestHeaders = await headers();
    const forwarded = requestHeaders.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
    const emailHash = privacyHash(email);
    const ipHash = privacyHash(forwarded);
    const windowStart = new Date(Date.now() - 15 * 60 * 1000);
    const [accountFailures, ipFailures] = await Promise.all([
      prisma.loginAttempt.count({
        where: { emailHash, ipHash, successful: false, createdAt: { gte: windowStart } },
      }),
      prisma.loginAttempt.count({
        where: { ipHash, successful: false, createdAt: { gte: windowStart } },
      }),
    ]);
    if (accountFailures >= 5 || ipFailures >= 25) {
      return { error: 'Too many attempts. Wait 15 minutes and try again.' };
    }

    const person = await prisma.person.findUnique({ where: { email } });
    const valid = person?.isActive ? await compare(password, person.passwordHash) : await compare(password, await hash('invalid-login-value', 12));
    await prisma.loginAttempt.create({ data: { emailHash, ipHash, successful: Boolean(valid && person?.isActive) } });

    if (!valid || !person?.isActive) return { error: 'Email or password is incorrect.' };

    await Promise.all([
      prisma.person.update({ where: { id: person.id }, data: { lastLoginAt: new Date() } }),
      prisma.authSession.deleteMany({ where: { expiresAt: { lt: new Date() } } }),
      prisma.loginAttempt.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } } }),
    ]);
    await createAuthSession(person.id, requestHeaders.get('user-agent'), keepSignedIn ? 30 * 24 : undefined);
    redirect(person.mustChangePassword ? '/account/password' : '/');
  } catch (error) {
    if (error && typeof error === 'object' && 'digest' in error && typeof (error as { digest?: string }).digest === 'string' && (error as { digest: string }).digest.startsWith('NEXT_REDIRECT')) {
      throw error;
    }
    console.error('Login error:', error);
    return { error: 'Unable to connect to database. Verify database is running.' };
  }
}

export async function logoutAction() {
  await clearAuthSession();
  redirect('/login');
}

export async function changePasswordAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const session = await requireSession({ allowPasswordChange: true });
  const currentPassword = text(formData, 'currentPassword', 256);
  const newPassword = text(formData, 'newPassword', 256);
  const confirmPassword = text(formData, 'confirmPassword', 256);
  if (newPassword !== confirmPassword) return { error: 'The new passwords do not match.' };
  if (!validPassword(newPassword)) return { error: 'Use at least 6 characters.' };

  const person = await prisma.person.findUniqueOrThrow({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!(await compare(currentPassword, person.passwordHash))) return { error: 'Current password is incorrect.' };
  if (await compare(newPassword, person.passwordHash)) return { error: 'Choose a password you have not just used.' };

  const passwordHash = await hash(newPassword, 12);
  await prisma.$transaction([
    prisma.person.update({ where: { id: session.user.id }, data: { passwordHash, mustChangePassword: false } }),
    prisma.authSession.updateMany({ where: { personId: session.user.id, id: { not: session.sessionId } }, data: { revokedAt: new Date() } }),
  ]);
  redirect('/');
}

export async function registerAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const name = text(formData, 'name', 160);
  const startupName = text(formData, 'startupName', 180);
  const email = text(formData, 'email', 254).toLowerCase();
  const password = text(formData, 'password', 256);
  const confirmPassword = text(formData, 'confirmPassword', 256);
  if (!name || !startupName || !email || !password) return { error: 'Complete all registration fields.' };
  if (!/^\S+@\S+\.\S+$/.test(email)) return { error: 'Enter a valid email address.' };
  if (!validPassword(password)) return { error: 'Password must contain at least 6 characters.' };
  if (password !== confirmPassword) return { error: 'The passwords do not match.' };

  const existing = await prisma.person.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { error: 'An account already exists for this email. Sign in instead.' };

  try {
    const person = await prisma.$transaction(async (tx) => {
      const startup = await tx.startup.create({
        data: {
          name: startupName,
          founderName: name,
          founderEmail: email,
          status: StartupStatus.APPLICATION_PENDING,
          onboardingItems: { create: Object.values(OnboardingItemType).map((type) => ({ type })) },
        },
      });
      const created = await tx.person.create({
        data: {
          name,
          email,
          role: Role.FOUNDER,
          passwordHash: await hash(password, 12),
          mustChangePassword: false,
          founderOfStartupId: startup.id,
        },
      });
      await tx.startupMembership.create({ data: { startupId: startup.id, personId: created.id, role: StartupMemberRole.OWNER } });
      await tx.activityLog.create({
        data: {
          actorId: created.id,
          actorRole: Role.FOUNDER,
          startupId: startup.id,
          entityType: 'Person',
          entityId: created.id,
          action: 'self_registered',
          summary: `${name} registered ${startupName}`,
        },
      });
      return created;
    });
    const requestHeaders = await headers();
    await createAuthSession(person.id, requestHeaders.get('user-agent'));
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return { error: 'An account already exists for this email. Sign in instead.' };
    }
    return { error: 'Registration could not be completed. Please try again.' };
  }
  redirect('/application');
}
