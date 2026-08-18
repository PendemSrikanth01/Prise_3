'use server';

import { compare, hash } from 'bcryptjs';
import { OnboardingItemType, Prisma, Role, StartupMemberRole, StartupStatus } from '@prisma/client';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { clearAuthSession, createAuthSession, privacyHash, requireSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { text } from '@/lib/form';
import { validPassword } from '@/lib/password';

export type AuthActionState = { error?: string } | undefined;

export async function loginAction(_: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = text(formData, 'email', 254).toLowerCase();
  const password = text(formData, 'password', 256);
  if (!email || !password) return { error: 'Enter your email and password.' };

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
  await createAuthSession(person.id, requestHeaders.get('user-agent'));
  redirect(person.mustChangePassword ? '/account/password' : '/');
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
