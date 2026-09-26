import { FIRING_TDC, normalizeAngle, normalizeRevolution } from './cycle';

export type EngineLayout = 'single' | 'inline4';

export interface CylinderSlot {
  number: number;
  phaseOffset: number;
}

export interface LayoutSpec {
  id: EngineLayout;
  label: string;
  cylinders: readonly CylinderSlot[];
}

export const LAYOUTS: Record<EngineLayout, LayoutSpec> = {
  single: {
    id: 'single',
    label: 'Single cylinder',
    cylinders: [{ number: 1, phaseOffset: 0 }],
  },
  inline4: {
    id: 'inline4',
    label: 'Inline four',
    cylinders: [
      { number: 1, phaseOffset: 0 },
      { number: 2, phaseOffset: 180 },
      { number: 3, phaseOffset: 540 },
      { number: 4, phaseOffset: 360 },
    ],
  },
};

export const ENGINE_LAYOUTS: readonly EngineLayout[] = ['single', 'inline4'];

export function cylinderAngle(engineAngle: number, slot: CylinderSlot): number {
  return normalizeAngle(engineAngle + slot.phaseOffset);
}

export function crankPinAngle(slot: CylinderSlot): number {
  return normalizeRevolution(slot.phaseOffset);
}

export function firingAngle(slot: CylinderSlot): number {
  return normalizeAngle(FIRING_TDC - slot.phaseOffset);
}

export function firingOrder(layout: LayoutSpec): number[] {
  const sorted = [...layout.cylinders].sort((a, b) => firingAngle(a) - firingAngle(b));
  const start = sorted.findIndex((slot) => slot.number === 1);
  return [...sorted.slice(start), ...sorted.slice(0, start)].map((slot) => slot.number);
}

export function degreesBetweenFirings(layout: LayoutSpec): number {
  return (2 * FIRING_TDC) / layout.cylinders.length;
}
