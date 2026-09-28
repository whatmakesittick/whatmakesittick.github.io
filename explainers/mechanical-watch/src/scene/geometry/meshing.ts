export interface MeshPhase {
  readonly driver: number;
  readonly driven: number;
}

export function meshPhase(drivenTeeth: number, direction: number): MeshPhase {
  return { driver: direction, driven: direction + Math.PI - Math.PI / drivenTeeth };
}
