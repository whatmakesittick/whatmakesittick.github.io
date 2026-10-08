export function speedRatio(induction: number, xi: number): number {
  return 1 - induction * (1 + xi / Math.hypot(xi, 1));
}

export function tubeSpread(induction: number, xi: number): number {
  return Math.sqrt((1 - induction) / speedRatio(induction, xi));
}
