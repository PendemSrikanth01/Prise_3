export function validateSessionTimes(startsAt: Date, endsAt: Date | null) {
  if (startsAt.getMinutes() % 15 !== 0 || (endsAt && endsAt.getMinutes() % 15 !== 0)) {
    throw new Error('Choose minutes in 15-minute intervals.');
  }
  if (endsAt && endsAt <= startsAt) throw new Error('End time must be after start time.');
}
