export const KW_PER_MW = 1000;

const MM_PER_METRE = 1000;

export function metres(value: number): number {
  return value;
}

export function mm(value: number): number {
  return value / MM_PER_METRE;
}

export function kwToMw(kw: number): number {
  return kw / KW_PER_MW;
}
