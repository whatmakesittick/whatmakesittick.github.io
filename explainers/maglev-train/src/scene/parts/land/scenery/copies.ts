export interface Placed {
  readonly x: number;
}

export function periodicCopies<T extends Placed>(
  spots: readonly T[],
  period: number,
  reach: number,
): T[] {
  const first = Math.floor(-reach / period) - 1;
  const last = Math.ceil((reach + period) / period) + 1;
  const copies: T[] = [];
  for (let turn = first; turn <= last; turn += 1)
    spots.forEach((spot) => {
      const x = spot.x + turn * period;
      if (x >= -reach && x <= reach + period) copies.push({ ...spot, x });
    });
  return copies;
}
