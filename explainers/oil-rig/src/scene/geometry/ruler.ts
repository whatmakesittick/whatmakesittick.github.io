export interface RulerTick {
  depth: number;
  major: boolean;
}

export function rulerTicks(from: number, to: number, minor: number, major: number): RulerTick[] {
  const ticks: RulerTick[] = [];
  const first = Math.ceil(from / minor) * minor;
  for (let depth = first; depth <= to; depth += minor) {
    if (depth <= 0) continue;
    ticks.push({ depth, major: depth % major === 0 });
  }
  return ticks;
}

export function rulerLabel(depth: number): string {
  return `${Math.round(depth)} m`;
}
