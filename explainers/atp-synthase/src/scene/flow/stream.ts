export function streamSlots(periodDeg: number, travelDeg: number): number {
  return Math.ceil(travelDeg / periodDeg);
}

export function streamProgress(
  clockDeg: number,
  periodDeg: number,
  travelDeg: number,
  slot: number,
): number | null {
  const emittedAt = (Math.floor(clockDeg / periodDeg) - slot) * periodDeg;
  const progress = (clockDeg - emittedAt) / travelDeg;
  return progress >= 0 && progress < 1 ? progress : null;
}
