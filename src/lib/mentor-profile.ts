import { Role } from '@prisma/client';

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function canEditMentorProfile(actor: { id: string; role: Role }, mentorId: string) {
  return actor.role === Role.PROGRAM_LEAD || actor.role === Role.PROGRAM_TEAM || (actor.role === Role.MENTOR && actor.id === mentorId);
}

export function parseTagList(value: FormDataEntryValue | null, limit = 12) {
  if (typeof value !== 'string') return [];
  return [...new Set(value.split(',').map((item) => item.trim()).filter(Boolean))].slice(0, limit).map((item) => item.slice(0, 80));
}

export function parseCapacity(value: FormDataEntryValue | null) {
  const capacity = Number(value);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 30) throw new Error('Capacity must be between 1 and 30 startups.');
  return capacity;
}

export function parseYearsExperience(value: FormDataEntryValue | null) {
  if (value === null || value === '') return null;
  const years = Number(value);
  if (!Number.isInteger(years) || years < 0 || years > 70) throw new Error('Years of experience must be between 0 and 70.');
  return years;
}

export function timeToMinute(value: FormDataEntryValue | null) {
  if (typeof value !== 'string' || !/^\d{2}:\d{2}$/.test(value)) throw new Error('Choose a valid time.');
  const [hour, minute] = value.split(':').map(Number);
  if (hour > 23 || minute > 59) throw new Error('Choose a valid time.');
  return hour * 60 + minute;
}

export function minuteToTime(value: number) {
  const hour = Math.floor(value / 60).toString().padStart(2, '0');
  const minute = (value % 60).toString().padStart(2, '0');
  return `${hour}:${minute}`;
}
