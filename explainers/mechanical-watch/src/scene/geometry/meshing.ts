export interface MeshPhase {
  readonly driver: number;
  readonly driven: number;
}

export function meshPhase(drivenTeeth: number, direction: number): MeshPhase {
  return { driver: direction, driven: direction + Math.PI - Math.PI / drivenTeeth };
}

export function wrapPhase(angle: number, teeth: number): number {
  const pitch = (Math.PI * 2) / teeth;
  return ((angle % pitch) + pitch) % pitch;
}

export function drivenAngle(driverAngle: number, driverTeeth: number, drivenTeeth: number): number {
  return (-driverAngle * driverTeeth) / drivenTeeth;
}
