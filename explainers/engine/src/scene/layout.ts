import { Vector3 } from 'three';
import { LAYOUTS } from '../model';
import type { CylinderSlot, EngineLayout } from '../model';
import { BLOCK, STRUCTURE } from './constants';

export interface Frame {
  u: Vector3;
  v: Vector3;
  w: Vector3;
}

export interface CylinderPlacement {
  slot: CylinderSlot;
  z: number;
}

export interface LayoutGeometry {
  id: EngineLayout;
  cutNormal: Vector3;
  sectionFrame: Frame;
  sectionHalfAlong: number;
  sectionHalfDepth: number;
  halfLength: number;
  cylinders: CylinderPlacement[];
  primaryCylinder: CylinderPlacement;
}

export const PLANE_FRAME: Frame = {
  u: new Vector3(1, 0, 0),
  v: new Vector3(0, 1, 0),
  w: new Vector3(0, 0, 1),
};

export const PROFILE_FRAME: Frame = {
  u: new Vector3(0, 1, 0),
  v: new Vector3(-1, 0, 0),
  w: new Vector3(0, 0, 1),
};

function placeCylinders(slots: readonly CylinderSlot[]): CylinderPlacement[] {
  const middle = (slots.length - 1) / 2;
  return slots.map((slot) => ({
    slot,
    z: (middle - (slot.number - 1)) * STRUCTURE.cylinderSpacing,
  }));
}

function singleLayout(): LayoutGeometry {
  const cylinders = placeCylinders(LAYOUTS.single.cylinders);
  return {
    id: 'single',
    cutNormal: new Vector3(0, 0, 1),
    sectionFrame: { u: new Vector3(1, 0, 0), v: new Vector3(0, 0, -1), w: new Vector3(0, 1, 0) },
    sectionHalfAlong: BLOCK.halfWidth,
    sectionHalfDepth: STRUCTURE.singleHalfDepth,
    halfLength: STRUCTURE.singleHalfDepth,
    cylinders,
    primaryCylinder: cylinders[0],
  };
}

function inlineLayout(): LayoutGeometry {
  const cylinders = placeCylinders(LAYOUTS.inline4.cylinders);
  const halfLength = (cylinders.length / 2) * STRUCTURE.cylinderSpacing + STRUCTURE.endMargin;
  return {
    id: 'inline4',
    cutNormal: new Vector3(1, 0, 0),
    sectionFrame: { u: new Vector3(0, 0, -1), v: new Vector3(-1, 0, 0), w: new Vector3(0, 1, 0) },
    sectionHalfAlong: halfLength,
    sectionHalfDepth: BLOCK.halfWidth,
    halfLength,
    cylinders,
    primaryCylinder: cylinders.find((placement) => placement.slot.number === 1) ?? cylinders[0],
  };
}

export function layoutGeometry(layout: EngineLayout): LayoutGeometry {
  return layout === 'single' ? singleLayout() : inlineLayout();
}

export function alongCutPosition(layout: LayoutGeometry, z: number): number {
  return layout.sectionFrame.u.z * z;
}
