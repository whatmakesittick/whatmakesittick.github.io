import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { Mesh, MeshStandardMaterial } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import type { SceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, NOZZLE_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, NozzleId } from '../ids';
import { CAR, MOMENTS, SITE_ANCHORS, runAt, tankAt } from '../model';
import type { Assembly } from './assembly';
import { createAssembly } from './assembly';

const VIEW = { nozzles: false, forces: false, tank: false, ghost: true, labels: true };

function stateAt(seconds: number, empty = false): AssemblyState {
  const { car, nozzles, fans } = runAt(seconds);
  const tank = { ...tankAt(seconds, 'air', 600), empty };
  return {
    phase: seconds,
    playing: false,
    gas: 'air',
    tankLitres: 600,
    car,
    nozzles,
    tank,
    fans,
    view: VIEW,
  };
}

function resources() {
  return { materials: new MaterialLibrary(), textures: {} as unknown as SceneTextures };
}

function lit(assembly: Assembly): NozzleId[] {
  return NOZZLE_IDS.filter((id) => {
    const nozzle = assembly.root.getObjectByName(id) as Mesh;
    return (nozzle.material as MeshStandardMaterial).emissive.getHex() > 0;
  });
}

function worldOf(object: { getWorldPosition(target: Vector3): Vector3 }): Vector3 {
  return object.getWorldPosition(new Vector3());
}

describe('placeholder assembly', () => {
  it('has a label anchor for every part, every anchor and every region', () => {
    const assembly = createAssembly(resources(), stateAt(0));
    expect([...assembly.labelAnchors().keys()]).toEqual([...PART_IDS]);
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    assembly.dispose();
  });

  it('poses the car along the run and keeps the chase target on it', () => {
    const assembly = createAssembly(resources(), stateAt(0));
    assembly.setState(stateAt(MOMENTS.inverted));
    assembly.root.updateMatrixWorld(true);
    const peak = runAt(MOMENTS.inverted).car;
    expect(worldOf(assembly.anchor('car')).x).toBeCloseTo(peak.position[0], 0);
    expect(assembly.chaseTarget().position).toEqual(peak.position);
    expect(assembly.chaseTarget().span).toBe(CAR.wheelbase);
    expect(assembly.region('car').containsPoint(worldOf(assembly.anchor('car')))).toBe(true);
    expect(worldOf(assembly.anchor('rampExit')).toArray()).toEqual([...SITE_ANCHORS.rampExit]);
    expect(assembly.update(0.016, 10)).toBe(false);
    assembly.dispose();
  });

  it('lights the nozzles that fire and goes dark when the tank is empty', () => {
    const assembly = createAssembly(resources(), stateAt(0.5));
    expect(lit(assembly)).toEqual([
      'rearOuterLeft',
      'rearInnerLeft',
      'rearInnerRight',
      'rearOuterRight',
    ]);
    assembly.setState(stateAt(4));
    expect(lit(assembly)).toEqual([]);
    assembly.setState(stateAt(6.2));
    expect(lit(assembly)).toHaveLength(4);
    assembly.setState(stateAt(6.2, true));
    expect(lit(assembly)).toEqual([]);
    assembly.dispose();
  });
});
