const OUTER_SLOWDOWN_FALLOFF = 2;

function boundaryArea(induction: number): number {
  return 1 - induction;
}

export function speedRatio(induction: number, xi: number): number {
  return 1 - induction * (1 + xi / Math.hypot(xi, 1));
}

export function tubeRadius(induction: number, xi: number): number {
  return Math.sqrt(boundaryArea(induction) / speedRatio(induction, xi));
}

export function upstreamRadius(induction: number, discRadius: number): number {
  if (discRadius <= 1) return discRadius * Math.sqrt(boundaryArea(induction));
  return Math.sqrt(discRadius ** 2 - 1 + boundaryArea(induction));
}

function throughDisc(induction: number, upstream: number): boolean {
  return upstream ** 2 <= boundaryArea(induction);
}

export function lineRadius(induction: number, upstream: number, xi: number): number {
  if (throughDisc(induction, upstream)) return upstream / Math.sqrt(speedRatio(induction, xi));
  return Math.sqrt(upstream ** 2 - boundaryArea(induction) + tubeRadius(induction, xi) ** 2);
}

export function lineSpeed(induction: number, upstream: number, xi: number): number {
  const speed = speedRatio(induction, xi);
  if (throughDisc(induction, upstream)) return speed;
  const reach = (boundaryArea(induction) / upstream ** 2) ** OUTER_SLOWDOWN_FALLOFF;
  return 1 - (1 - speed) * reach;
}
