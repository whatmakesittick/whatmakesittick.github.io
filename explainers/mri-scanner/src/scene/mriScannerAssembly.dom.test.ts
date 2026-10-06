import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { createSceneTextures } from '@core/scene/textures';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, RegionId } from '../ids';
import { FIELDS } from '../model/field';
import { HEAD_COIL, ISOCENTRE, SCREEN, VOXEL } from '../model/layout';
import { MODEL_SIZE } from '../model/constants';
import type { Assembly } from './assembly';
import { isShown } from '@core/scene/parts';
import { createMriScannerAssembly } from './mriScannerAssembly';

const ANCHOR_IDS: readonly AnchorId[] = ['isocentre', 'voxel', 'headCoil', 'screen', 'coldHead'];
const SETTLE_SECONDS = 5;
const RESTING_SEQUENCE: AssemblyState['sequence'] = {
  phase: 0,
  step: 'excite',
  rf: null,
  gradient: null,
  gradientLevel: 0,
  echo: 0,
};
const REGION_IDS: readonly RegionId[] = ['room', 'scanner', 'layers', 'voxel', 'bore', 'console'];

function stateWith(overrides: Partial<AssemblyState> = {}): AssemblyState {
  return {
    phase: 0,
    playing: false,
    field: 'field15',
    weighting: 't2',
    sequence: { phase: 0, step: 'excite', rf: 90, gradient: 'z', gradientLevel: 1, echo: 0 },
    spins: { net: [0, 0, -1], arrows: [], precession: 0 },
    tissue: 'whiteMatter',
    gradientAxis: null,
    picture: new Float32Array(MODEL_SIZE * MODEL_SIZE),
    pictureVersion: 0,
    fringe: FIELDS.field15.fringe,
    view: { cutaway: false, fieldLines: false, voxel: false, labels: true },
    ...overrides,
  };
}

function worldPoint(object: Object3D): readonly number[] {
  object.updateWorldMatrix(true, false);
  return object.getWorldPosition(new Vector3()).toArray();
}

let textures: ReturnType<typeof createSceneTextures>;
let assembly: Assembly;

beforeAll(() => {
  textures = createSceneTextures();
  assembly = createMriScannerAssembly({ materials: new MaterialLibrary(), textures }, stateWith());
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
});

describe('mri scanner assembly', () => {
  it('gives every part a label anchor', () => {
    expect([...assembly.labelAnchors().keys()]).toEqual([...PART_IDS]);
  });

  it('places the named anchors at the layout points', () => {
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    expect(worldPoint(assembly.anchor('isocentre'))).toEqual([...ISOCENTRE]);
    expect(worldPoint(assembly.anchor('voxel'))).toEqual([...VOXEL.centre]);
    expect(worldPoint(assembly.anchor('screen'))).toEqual([...SCREEN.centre]);
    expect(worldPoint(assembly.anchor('headCoil'))).toEqual([...HEAD_COIL.centre]);
  });

  it('frames every region with a box that holds something', () => {
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    expect(assembly.region('room').containsBox(assembly.region('scanner'))).toBe(true);
    expect(assembly.region('scanner').containsBox(assembly.region('bore'))).toBe(true);
  });

  it('follows the view flags and keeps moving only while something turns', () => {
    const view = { cutaway: true, fieldLines: true, voxel: true, labels: true };
    assembly.setState(stateWith({ playing: true, view }));
    expect(assembly.root.getObjectByName('cover')?.visible).toBe(false);
    expect(assembly.root.getObjectByName('spinArrows')?.visible).toBe(true);
    expect(assembly.root.getObjectByName('fringeLine')?.visible).toBe(true);
    expect(assembly.update(0.016, 5)).toBe(true);
    assembly.setState(stateWith({ sequence: RESTING_SEQUENCE }));
    expect(assembly.root.getObjectByName('cover')?.visible).toBe(true);
    expect(assembly.root.getObjectByName('spinArrows')?.visible).toBe(false);
    assembly.update(SETTLE_SECONDS, 5);
    expect(assembly.update(0.016, 5)).toBe(false);
  });

  it('hides a label with its part', () => {
    assembly.setState(stateWith());
    expect(isShown(assembly.labelAnchors().get('spinArrows')!)).toBe(false);
    expect(isShown(assembly.labelAnchors().get('fieldLinesGroup')!)).toBe(false);
    expect(isShown(assembly.labelAnchors().get('table')!)).toBe(true);
  });
});
