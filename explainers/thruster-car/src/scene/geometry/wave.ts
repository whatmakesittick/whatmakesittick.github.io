const MIDLINE = 0.5;

export function unitWave(angle: number): number {
  return MIDLINE + MIDLINE * Math.sin(angle);
}

export function waveDip(depth: number, angle: number): number {
  return 1 - depth * unitWave(angle);
}
