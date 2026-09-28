import { afterEach, describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import type { SceneTextures } from '@core/scene/textures';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, RegionId } from '../ids';
import { WatchAssembly } from './watchAssembly';

const STATE: AssemblyState = {
  phase: 0,
  cycles: 0,
  amplitude: 280,
  reserve: 42,
  regulator: 0,
  view: { dial: true, bridges: true, energy: false, labels: false },
};

const REGIONS: readonly RegionId[] = [
  'scene',
  'movement',
  'barrel',
  'train',
  'escapement',
  'balance',
  'dial',
  'motionWorks',
];
const ANCHORS: readonly AnchorId[] = [
  'barrel',
  'centreWheel',
  'thirdWheel',
  'fourthWheel',
  'escapeWheel',
  'fork',
  'balance',
  'crown',
];
const FRAME = 1 / 60;
const CAMERA_DISTANCE = 300;
const TRIANGLE_BUDGET = 160_000;
const DRAW_CALL_BUDGET = 90;

let assembly: WatchAssembly | null = null;
let textures: SceneTextures | null = null;

function build(state: AssemblyState = STATE): WatchAssembly {
  textures = createSceneTextures();
  assembly = new WatchAssembly({ materials: new MaterialLibrary(), textures }, state);
  return assembly;
}

function worldPosition(object: Object3D): Vector3 {
  return object.getWorldPosition(new Vector3());
}

function budget(root: Object3D): { triangles: number; drawCalls: number } {
  let triangles = 0;
  let drawCalls = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const geometry = object.geometry;
    const count = geometry.index
      ? geometry.index.count / 3
      : geometry.getAttribute('position').count / 3;
    const instances = object instanceof InstancedMesh ? object.count : 1;
    triangles += count * instances;
    drawCalls += Array.isArray(object.material) ? object.material.length : 1;
  });
  return { triangles, drawCalls };
}

afterEach(() => {
  assembly?.dispose();
  textures?.dispose();
  assembly = null;
  textures = null;
});

describe('WatchAssembly', () => {
  it('anchors every part', () => {
    const anchors = build().labelAnchors();
    PART_IDS.forEach((id) => expect(anchors.get(id), id).toBeDefined());
  });

  it('gives every region a finite, non-empty box', () => {
    const watch = build();
    REGIONS.forEach((id) => {
      const box = watch.region(id);
      expect(box.isEmpty(), id).toBe(false);
      expect(Number.isFinite(box.min.y + box.max.y), id).toBe(true);
    });
  });

  it('names every camera anchor', () => {
    const watch = build();
    ANCHORS.forEach((id) => expect(watch.anchor(id), id).toBeDefined());
  });

  it('stays within the triangle and draw call budget', () => {
    const watch = build();
    const { triangles, drawCalls } = budget(watch.root);
    console.log(`triangles ${triangles}, draw calls ${drawCalls}`);
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET);
    expect(drawCalls).toBeLessThan(DRAW_CALL_BUDGET);
  });

  it('hides the dial side and the bridges with their flags', () => {
    const watch = build();
    watch.setState({ ...STATE, view: { ...STATE.view, dial: false, bridges: false } });
    const anchors = watch.labelAnchors();
    const shown = (id: (typeof PART_IDS)[number]) => {
      const anchor = anchors.get(id);
      return anchor ? isShown(anchor) : false;
    };
    expect(shown('dial')).toBe(false);
    expect(shown('balanceCock')).toBe(false);
    expect(shown('ratchetWheel')).toBe(true);
    expect(shown('jewels')).toBe(true);
  });

  it('moves the hands with the phase and the impulse jewel with the balance', () => {
    const watch = build();
    const jewel = watch.labelAnchors().get('impulseJewel');
    if (!jewel) throw new Error('No impulse jewel anchor');
    watch.root.updateMatrixWorld(true);
    const before = worldPosition(jewel);
    watch.setState({ ...STATE, phase: 90 });
    watch.root.updateMatrixWorld(true);
    expect(worldPosition(jewel).distanceTo(before)).toBeGreaterThan(1);
  });

  it('keeps its own copy of the state it is given', () => {
    const watch = build();
    const reused = { ...STATE, view: { ...STATE.view } };
    watch.setState(reused);
    reused.view.dial = false;
    expect(() => watch.setState(reused)).not.toThrow();
    const dial = watch.labelAnchors().get('dial');
    expect(dial && isShown(dial)).toBe(false);
  });

  it('runs every view flag and reserve through a frame', () => {
    const watch = build();
    const states: AssemblyState[] = [
      { ...STATE, view: { ...STATE.view, energy: true } },
      { ...STATE, reserve: 0, amplitude: 186 },
      { ...STATE, reserve: 21, regulator: 1, phase: 200, cycles: 5 },
      { ...STATE, regulator: -1, phase: 359, cycles: -2 },
    ];
    states.forEach((state) => {
      watch.setState(state);
      expect(() => watch.update(FRAME, CAMERA_DISTANCE)).not.toThrow();
    });
  });
});
