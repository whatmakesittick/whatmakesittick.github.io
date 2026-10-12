import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import type { SceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, SettingId } from '../ids';
import { SETTING_LAYOUT, crownY } from '../model';
import { createAssembly } from './assembly';

function stateAt(angle: number, setting: SettingId = 'bench', riseDeg = 0): AssemblyState {
  return {
    setting,
    phase: angle,
    playing: false,
    crank: {
      angle,
      phase: 'power',
      rpm: 9900,
      degPerSecond: 0,
      sparkGlow: 0,
      ports: { exhaust: 0, transfer: 0, intake: 0 },
      flows: { exhaust: 0, transfer: 0, intake: 0, burn: 0 },
      crankcasePressure: -1,
    },
    drive: {
      throttle: 1,
      clutch: 'driving',
      shoesOut: 1,
      chainMm: 0,
      drumDeg: 0,
      chainSpeed: 22,
      oiling: true,
    },
    safety: { brake: false, kickback: riseDeg > 0, riseDeg, guardForward: 0 },
    view: { cutaway: false, flow: true, zone: false, labels: true },
  };
}

function resources() {
  return { materials: new MaterialLibrary(), textures: {} as unknown as SceneTextures };
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

  it('moves the piston with the crank', () => {
    const assembly = createAssembly(resources(), stateAt(0));
    const piston = assembly.labelAnchors().get('piston');
    expect(piston?.position.y).toBeCloseTo(crownY(0), 9);
    assembly.setState(stateAt(180));
    expect(piston?.position.y).toBeCloseTo(crownY(180), 9);
    expect(assembly.update(0.016, 1)).toBe(false);
    assembly.dispose();
  });

  it('lifts the saw over the log while cutting and raises the nose in a kickback', () => {
    const assembly = createAssembly(resources(), stateAt(0, 'cutting'));
    expect(assembly.root.position.y).toBe(SETTING_LAYOUT.cutting.lift);
    assembly.setState(stateAt(0, 'kickback'));
    assembly.root.updateMatrixWorld(true);
    const resting = worldOf(assembly.anchor('nose')).y;
    assembly.setState(stateAt(0, 'kickback', 35));
    assembly.root.updateMatrixWorld(true);
    expect(worldOf(assembly.anchor('nose')).y).toBeGreaterThan(resting);
    assembly.dispose();
  });
});
