export function parseOption<T extends string>(value: string | undefined, options: readonly T[]): T {
  const match = options.find((option) => option === value);
  if (match === undefined) throw new Error(`Unexpected option "${value}"`);
  return match;
}
