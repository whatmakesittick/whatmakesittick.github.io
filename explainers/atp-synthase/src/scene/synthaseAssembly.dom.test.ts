import { afterEach, describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import type { SceneTextures } from '@core/scene/textures';
import type { AnchorId, AssemblyState, RegionId } from '../ids';
import { BLADE_COUNTS, HUMAN_BLADE_COUNT } from '../model/rotor';
import { SynthaseAssembly } from './synthaseAssembly';

const STATE: AssemblyState = {
  rotorDeg: 0,
  laps: 0,
  degreesPerSecond: 0,
  bladeCount: HUMAN_BLADE_COUNT,
  motorCount: 1,
  view: { membrane: true, cutaway: false, flow: true, labels: false },
};

const REGIONS: readonly RegionId[] = ['scene', 'motor', 'rotor', 'head', 'pumps', 'row'];
const ANCHORS: readonly AnchorId[] = ['ring', 'gate', 'head', 'pumps'];
const FRAME = 1 / 60;
const CAMERA_DISTANCE = 500;
const TRIANGLE_BUDGET = 200_000;
const DRAW_CALL_BUDGET = 60;

let assembly: SynthaseAssembly | null = null;
let textures: SceneTextures | null = null;

function build(state: AssemblyState = STATE): SynthaseAssembly {
  textures = createSceneTextures();
  assembly = new SynthaseAssembly({ materials: new MaterialLibrary(), textures }, state);
  return assembly;
}

function budget(root: Object3D): { triangles: number; drawCalls: number } {
  let triangles = 0;
  let drawCalls = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh) || !isShown(object)) return;
    const geometry = object.geometry;
    const corners = geometry.index?.count ?? geometry.getAttribute('position').count;
    const instances = object instanceof InstancedMesh ? object.count : 1;
    triangles += (corners / 3) * instances;
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

describe('SynthaseAssembly', () => {
  it('gives every region a finite, non-empty box', () => {
    const synthase = build();
    REGIONS.forEach((id) => {
      const box = synthase.region(id);
      expect(box.isEmpty(), id).toBe(false);
      expect(Number.isFinite(box.min.y + box.max.y), id).toBe(true);
    });
  });

  it('names every camera anchor', () => {
    const synthase = build();
    ANCHORS.forEach((id) => expect(synthase.anchor(id), id).toBeDefined());
  });

  it('stays within the triangle and draw call budget', () => {
    const { triangles, drawCalls } = budget(build().root);
    console.log(`triangles ${triangles}, draw calls ${drawCalls}`);
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET);
    expect(drawCalls).toBeLessThan(DRAW_CALL_BUDGET);
  });

  it('rebuilds the ring for every blade count and runs a frame', () => {
    const synthase = build();
    Object.values(BLADE_COUNTS).forEach((bladeCount) => {
      synthase.setState({ ...STATE, bladeCount, rotorDeg: 200 });
      expect(() => synthase.update(FRAME, CAMERA_DISTANCE)).not.toThrow();
      expect(synthase.region('rotor').isEmpty()).toBe(false);
    });
  });

  it('hides the membrane with its flag', () => {
    const synthase = build();
    synthase.setState({ ...STATE, view: { ...STATE.view, membrane: false } });
    const membrane = synthase.labelAnchors().get('membrane');
    expect(membrane && isShown(membrane)).toBe(false);
  });

  it('leaves the scene when disposed', () => {
    const synthase = build();
    const parent = new Mesh();
    parent.add(synthase.root);
    synthase.dispose();
    assembly = null;
    expect(synthase.root.parent).toBeNull();
  });
});
