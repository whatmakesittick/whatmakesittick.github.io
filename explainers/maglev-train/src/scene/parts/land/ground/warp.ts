export interface AxisWarp {
  share(value: number): number;
  value(share: number): number;
  density(value: number): number;
}

export function centredWarp(reach: number, softness: number): AxisWarp {
  const span = 2 * Math.asinh(reach / softness);
  return {
    share: (value) => 0.5 + Math.asinh(value / softness) / span,
    value: (share) => softness * Math.sinh((share - 0.5) * span),
    density: (value) => 1 / (softness * Math.hypot(1, value / softness) * span),
  };
}
