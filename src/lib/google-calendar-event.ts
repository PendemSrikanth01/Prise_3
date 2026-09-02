export type CalendarEventInput = {
  title: string;
  description?: string | null;
  startsAt: Date;
  endsAt?: Date | null;
  attendeeEmails: string[];
};

export function buildGoogleCalendarEvent(input: CalendarEventInput, requestId?: string) {
  const endsAt = input.endsAt ?? new Date(input.startsAt.getTime() + 60 * 60 * 1000);
  const attendees = [...new Set(input.attendeeEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))].map((email) => ({ email }));
  return {
    summary: input.title,
    description: input.description || undefined,
    start: { dateTime: input.startsAt.toISOString(), timeZone: 'Asia/Kolkata' },
    end: { dateTime: endsAt.toISOString(), timeZone: 'Asia/Kolkata' },
    attendees,
    ...(requestId ? { conferenceData: { createRequest: { requestId, conferenceSolutionKey: { type: 'hangoutsMeet' } } } } : {}),
  };
}
