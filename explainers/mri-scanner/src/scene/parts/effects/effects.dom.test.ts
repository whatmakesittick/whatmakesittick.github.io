import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh, Vector3 } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, PartId } from '../../../ids';
import { FIELDS } from '../../../model/field';
import { MODEL_SIZE } from '../../../model/constants';
import { VOXEL, VOXEL_ARROWS } from '../../../model/layout';
import type { SceneModule } from '../context';
import { createEffectsModule } from './effects';

const EFFECT_IDS: readonly PartId[] = [
  'sliceSlab',
  'spinArrows',
  'netMagnet',
  'mainField',
  'rfWave',
  'echoWave',
  'fieldLinesGroup',
  'fringeLine',
];
const FRAME = 1 / 60;
const SETTLE_FRAMES = 240;
const TRIANGLE_BUDGET = 80_000;

function stateWith(overrides: Partial<AssemblyState> = {}): AssemblyState {
  return {
    phase: 500,
    playing: false,
    field: 'field15',
    weighting: 't2',
    sequence: { phase: 500, step: 'echo', rf: null, gradient: 'x', gradientLevel: 1, echo: 0 },
    spins: {
      net: [0, 0, -1],
      arrows: Array.from({ length: VOXEL_ARROWS }, () => [0, 0, -1] as const),
      precession: 0,
    },
    tissue: 'whiteMatter',
    gradientAxis: null,
    picture: new Float32Array(MODEL_SIZE * MODEL_SIZE),
    pictureVersion: 0,
    fringe: FIELDS.field15.fringe,
    view: { cutaway: false, fieldLines: false, voxel: false, labels: true },
    ...overrides,
  };
}

function settle(module: SceneModule): boolean {
  let moving = true;
  for (let frame = 0; frame < SETTLE_FRAMES && moving; frame += 1) {
    moving = module.update(FRAME, 1);
  }
  return moving;
}

function triangles(module: SceneModule): number {
  let total = 0;
  module.root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry;
    const count = geometry.index ? geometry.index.count : geometry.getAttribute('position').count;
    total += (count / 3) * (object instanceof InstancedMesh ? object.count : 1);
  });
  return total;
}

let textures: ReturnType<typeof createSceneTextures>;
let tracker: ResourceTracker;
let module: SceneModule;

beforeAll(() => {
  textures = createSceneTextures();
  tracker = new ResourceTracker();
  module = createEffectsModule({ materials: new MaterialLibrary(), textures, tracker });
  module.setState(stateWith());
});

afterAll(() => {
  tracker.dispose();
  textures.dispose();
});

describe('effects module', () => {
  it('names each part object and gives it a label', () => {
    EFFECT_IDS.forEach((id) => {
      expect(module.root.getObjectByName(id)).toBeDefined();
      expect(module.labels.get(id)).toBeDefined();
    });
  });

  it('anchors the voxel at its layout centre', () => {
    const anchor = module.anchors.voxel;
    anchor?.updateWorldMatrix(true, false);
    expect(anchor?.getWorldPosition(new Vector3()).toArray()).toEqual([...VOXEL.centre]);
  });

  it('stays within the triangle budget', () => {
    expect(triangles(module)).toBeLessThan(TRIANGLE_BUDGET);
  });

  it('rests when nothing moves on its own', () => {
    module.setState(stateWith());
    expect(settle(module)).toBe(false);
  });

  it('flows while the field lines show', () => {
    module.setState(stateWith({ view: { ...stateWith().view, fieldLines: true } }));
    expect(module.update(FRAME, 1)).toBe(true);
  });

  it('precesses only while playing with the voxel shown', () => {
    const view = { ...stateWith().view, voxel: true };
    module.setState(stateWith({ view, playing: false }));
    expect(settle(module)).toBe(false);
    module.setState(stateWith({ view, playing: true }));
    expect(module.update(FRAME, 1)).toBe(true);
  });

  it('holds the pulse rings still while paused', () => {
    module.setState(
      stateWith({
        sequence: { phase: 75, step: 'excite', rf: 90, gradient: 'z', gradientLevel: 1, echo: 0 },
      }),
    );
    const ring = module.root.getObjectByName('rfWave')?.children[0];
    expect(ring?.parent?.visible).toBe(true);
    const before = ring?.scale.x;
    expect(settle(module)).toBe(false);
    expect(ring?.scale.x).toBe(before);
  });

  it('keeps the pulse rings travelling while playing and eases the slab in during excite', () => {
    module.setState(
      stateWith({
        playing: true,
        sequence: { phase: 75, step: 'excite', rf: 90, gradient: 'z', gradientLevel: 1, echo: 0 },
      }),
    );
    const ring = module.root.getObjectByName('rfWave')?.children[0];
    expect(ring?.parent?.visible).toBe(true);
    const before = ring?.scale.x;
    expect(settle(module)).toBe(true);
    expect(ring?.scale.x).not.toBeCloseTo(before ?? 0);
    expect(module.root.getObjectByName('sliceSlab')?.visible).toBe(true);
  });

  it('keeps the echo rings travelling only while the echo sounds', () => {
    module.setState(
      stateWith({
        playing: true,
        sequence: { phase: 535, step: 'echo', rf: null, gradient: 'x', gradientLevel: 1, echo: 1 },
      }),
    );
    expect(module.root.getObjectByName('echoWave')?.visible).toBe(true);
    expect(module.update(FRAME, 1)).toBe(true);
    module.setState(stateWith());
    expect(module.root.getObjectByName('echoWave')?.visible).toBe(false);
    expect(settle(module)).toBe(false);
  });
});
