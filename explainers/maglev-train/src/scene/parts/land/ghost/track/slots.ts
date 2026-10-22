export interface SlotRange {
  readonly first: number;
  readonly last: number;
}

export function slotRange(reach: number, period: number): SlotRange {
  const side = Math.ceil(reach / period);
  return { first: -side, last: side };
}

export function slotsOf(range: SlotRange, without?: SlotRange): number[] {
  const count = range.last - range.first + 1;
  return Array.from({ length: count }, (_, index) => range.first + index).filter(
    (slot) => !without || slot < without.first || slot > without.last,
  );
}

export function evenCentres(count: number, period: number): number[] {
  const spacing = period / count;
  return Array.from({ length: count }, (_, index) => (index + 0.5) * spacing);
}

export function sagAt(share: number, sag: number): number {
  return 4 * sag * share * (1 - share);
}
