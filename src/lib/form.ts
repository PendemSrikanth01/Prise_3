export function text(formData: FormData, key: string, max = 500) {
  const value = formData.get(key);
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

export function optionalText(formData: FormData, key: string, max = 1000) {
  return text(formData, key, max) || null;
}

export function requiredText(formData: FormData, key: string, max = 500) {
  const value = text(formData, key, max);
  if (!value) throw new Error(`${key} is required`);
  return value;
}

export function optionalDate(formData: FormData, key: string) {
  const value = text(formData, key, 32);
  if (!value) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) throw new Error(`${key} must be a valid date`);
  return date;
}

export function positiveMoney(formData: FormData, key: string) {
  const value = Number(text(formData, key, 32));
  if (!Number.isFinite(value) || value <= 0 || value > 100_000_000) throw new Error(`${key} must be a positive amount`);
  return value;
}

export function enumValue<T extends Record<string, string>>(values: T, raw: FormDataEntryValue | null, key: string): T[keyof T] {
  if (typeof raw !== 'string' || !Object.values(values).includes(raw)) throw new Error(`${key} is invalid`);
  return raw as T[keyof T];
}
