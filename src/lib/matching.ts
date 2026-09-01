export const MAX_MATCHING_PREFERENCES = 3;

export function normalizeMatchingPreferenceIds(values: FormDataEntryValue[]) {
  const ids = [...new Set(values.filter((value): value is string => typeof value === 'string').map((value) => value.trim()).filter(Boolean))];
  if (ids.length === 0) throw new Error('Select at least one preference before submitting.');
  if (ids.length > MAX_MATCHING_PREFERENCES) throw new Error(`Choose up to ${MAX_MATCHING_PREFERENCES} preferences.`);
  return ids;
}
