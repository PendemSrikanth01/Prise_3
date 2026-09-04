export const MAX_MATCHING_PREFERENCES = 3;

export function normalizeAllocationIds(values: FormDataEntryValue[]) {
  return [...new Set(values.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))];
}

export function assertAllocationCandidates(requested: string[], available: { id: string }[]) {
  const ids = new Set(available.map(({ id }) => id));
  if (requested.some((id) => !ids.has(id))) throw new Error('One or more selections are unavailable. Refresh and try again. No assignments were changed.');
}

export function normalizeMatchingPreferenceIds(values: FormDataEntryValue[]) {
  const ids = [...new Set(values.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))];
  if (ids.length === 0) throw new Error('Select at least one preference before submitting.');
  if (ids.length > MAX_MATCHING_PREFERENCES) throw new Error(`Choose up to ${MAX_MATCHING_PREFERENCES} preferences.`);
  return ids;
}
