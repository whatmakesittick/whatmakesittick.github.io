import { Box3, Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { toDegrees } from '@core/math';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import { BLADE_COUNTS, HUMAN_BLADE_COUNT, bladeAzimuth, wrapDegrees } from '../../../model/rotor';
import { C_RING } from '../../../model/scale';
import { ringLayout } from '../../geometry/ringLayout';
import { polar } from '../../geometry/solids';
import { RotorPart } from './rotor';

const BLADE_TOLERANCE_NM = 0.2;

function buildRotor(bladeCount = HUMAN_BLADE_COUNT): RotorPart {
  const context = {
    materials: new MaterialLibrary(),
    tracker: new ResourceTracker(),
    textures: createSceneTextures(),
  };
  return new RotorPart(context, bladeCount);
}

function azimuthOf(point: Vector3): number {
  return wrapDegrees(toDegrees(Math.atan2(-point.z, point.x)));
}

function shownRingWidth(rotor: RotorPart): number {
  const holder = rotor.object.children[1];
  const ring = holder.children.find((child) => child.visible);
  if (!ring) throw new Error('No ring is shown');
  return new Box3().setFromObject(ring).getSize(new Vector3()).x;
}

describe('rotor part', () => {
  it('turns counterclockwise seen from the matrix as the rotor angle grows', () => {
    const rotor = buildRotor();
    const blade = polar(bladeAzimuth(0, 0, HUMAN_BLADE_COUNT), C_RING.outerRadius, 0);
    rotor.setAngle(30);
    rotor.object.updateMatrixWorld(true);
    const turned = rotor.object.localToWorld(blade.clone());
    expect(azimuthOf(turned)).toBeCloseTo(bladeAzimuth(0, 30, HUMAN_BLADE_COUNT));
    expect(azimuthOf(turned)).toBeCloseTo(azimuthOf(blade) + 30);
  });

  it('shows one ring at a time and grows it for more blades', () => {
    const rotor = buildRotor();
    const human = shownRingWidth(rotor);
    rotor.setBladeCount(BLADE_COUNTS.chloroplast);
    const spinach = shownRingWidth(rotor);
    expect(spinach).toBeGreaterThan(human);
    const outerRadius = ringLayout(BLADE_COUNTS.chloroplast).outerRadius;
    expect(Math.abs(spinach / 2 - outerRadius)).toBeLessThan(BLADE_TOLERANCE_NM);
    rotor.setBladeCount(HUMAN_BLADE_COUNT);
    expect(shownRingWidth(rotor)).toBeCloseTo(human);
  });
});
