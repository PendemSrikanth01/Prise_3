export type DirectorySearchValue = string | number | null | undefined | readonly string[];

const normalize = (value: string) => value.toLocaleLowerCase('en-IN').replaceAll('_', ' ').trim();

export function matchesDirectoryQuery(query: string, values: readonly DirectorySearchValue[]) {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return true;
  const haystack = normalize(values.flatMap((value) => Array.isArray(value) ? value : [value]).filter((value): value is string | number => value !== null && value !== undefined).join(' '));
  return tokens.every((token) => haystack.includes(token));
}
