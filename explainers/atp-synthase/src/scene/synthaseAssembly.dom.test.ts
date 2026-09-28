import { afterEach, describe, expect, it } from 'vitest';
import { Group, InstancedMesh, Mesh, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import type { SceneTextures } from '@core/scene/textures';
import { PART_IDS, SITE_PARTS, SITE_STATES } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import {
  BLADE_COUNTS,
  HUMAN_BLADE_COUNT,
  REAL_DEGREES_PER_SECOND,
  betaInState,
} from '../model/rotor';
import { UNITS_PER_NM } from '../model/scale';
import { FINISHES } from './finishes';
import { seatPoint } from './flow/molecules';
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
const MOTOR_COUNTS = Array.from({ length: 10 }, (_, index) => index + 1);
const ROTOR_ANGLES = [0, 45, 119.5, 120, 200, 359];
const FRAME = 1 / 60;
const BLUR_FRAMES = 90;
const CAMERA_DISTANCE = 500;
const TRIANGLE_BUDGET = 200_000;
const DRAW_CALL_BUDGET = 60;
const FLOW_PARTS: readonly PartId[] = ['atp', 'adpPhosphate', 'protons', 'electrons', 'oxygen'];

let assembly: SynthaseAssembly | null = null;
let textures: SceneTextures | null = null;
let materials: MaterialLibrary | null = null;

function build(state: AssemblyState = STATE): SynthaseAssembly {
  textures = createSceneTextures();
  materials = new MaterialLibrary();
  assembly = new SynthaseAssembly({ materials, textures }, state);
  return assembly;
}

function library(): MaterialLibrary {
  if (!materials) throw new Error('Nothing is built');
  return materials;
}

function anchorOf(synthase: SynthaseAssembly, id: PartId): Object3D {
  const anchor = synthase.labelAnchors().get(id);
  if (!anchor) throw new Error(`No anchor for ${id}`);
  return anchor;
}

function worldPosition(synthase: SynthaseAssembly, object: Object3D): Vector3 {
  synthase.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function meshesWith(root: Object3D, material: Material): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((object) => {
    if (object instanceof Mesh && object.material === material) found.push(object);
  });
  return found;
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
  root.traverse((object) => {
    if ('isPoints' in object && isShown(object)) drawCalls += 1;
  });
  return { triangles, drawCalls };
}

afterEach(() => {
  assembly?.dispose();
  textures?.dispose();
  materials?.dispose();
  assembly = null;
  textures = null;
  materials = null;
});

describe('SynthaseAssembly', () => {
  it('anchors every part with its own fixed object', () => {
    const synthase = build();
    const before = new Map(synthase.labelAnchors());
    PART_IDS.forEach((id) => expect(before.get(id), id).toBeDefined());
    synthase.setState({ ...STATE, rotorDeg: 200, bladeCount: BLADE_COUNTS.yeast, motorCount: 6 });
    PART_IDS.forEach((id) => expect(synthase.labelAnchors().get(id), id).toBe(before.get(id)));
  });

  it('names every camera anchor', () => {
    const synthase = build();
    ANCHORS.forEach((id) => expect(synthase.anchor(id), id).toBeDefined());
  });

  it('gives every region a finite, non-empty box for every ring and row', () => {
    const synthase = build();
    Object.values(BLADE_COUNTS).forEach((bladeCount) => {
      MOTOR_COUNTS.forEach((motorCount) => {
        synthase.setState({ ...STATE, bladeCount, motorCount });
        REGIONS.forEach((id) => {
          const box = synthase.region(id);
          expect(box.isEmpty(), id).toBe(false);
          expect(Number.isFinite(box.min.y + box.max.y), id).toBe(true);
        });
      });
    });
  });

  it('stretches the row region over every motor shown', () => {
    const synthase = build();
    const one = synthase.region('row').getSize(new Vector3()).z;
    synthase.setState({ ...STATE, motorCount: 10 });
    expect(synthase.region('row').getSize(new Vector3()).z).toBeGreaterThan(one * 5);
  });

  it('stays within the triangle and draw call budget with the whole row shown', () => {
    const synthase = build({ ...STATE, motorCount: 10 });
    const { triangles, drawCalls } = budget(synthase.root);
    console.log(`triangles ${triangles}, draw calls ${drawCalls}`);
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET);
    expect(drawCalls).toBeLessThan(DRAW_CALL_BUDGET);
  });

  it('handles every ring and every row length through a frame', () => {
    const synthase = build();
    Object.values(BLADE_COUNTS).forEach((bladeCount) => {
      MOTOR_COUNTS.forEach((motorCount) => {
        const state = { ...STATE, bladeCount, motorCount, rotorDeg: motorCount * 31, laps: 2 };
        expect(() => synthase.setState(state)).not.toThrow();
        expect(() => synthase.update(FRAME, CAMERA_DISTANCE)).not.toThrow();
      });
    });
  });

  it('shows the extra motors only when the row has them', () => {
    const synthase = build();
    const neighbours = anchorOf(synthase, 'neighbourMotors');
    expect(isShown(neighbours)).toBe(false);
    synthase.setState({ ...STATE, motorCount: 4 });
    expect(isShown(neighbours)).toBe(true);
  });

  it('moves each seat anchor to the β subunit in that state', () => {
    const synthase = build();
    ROTOR_ANGLES.forEach((rotorDeg) => {
      synthase.setState({ ...STATE, rotorDeg });
      SITE_STATES.forEach((state) => {
        const seat = seatPoint(betaInState(state, rotorDeg));
        const expected = new Vector3(seat.x, seat.y, seat.z).multiplyScalar(UNITS_PER_NM);
        const anchor = anchorOf(synthase, SITE_PARTS[state]);
        expect(worldPosition(synthase, anchor).distanceTo(expected), state).toBeLessThan(1e-6);
      });
    });
  });

  it('rewinds the flow with the rotor angle and the laps', () => {
    const synthase = build();
    const atp = anchorOf(synthase, 'atp');
    synthase.setState({ ...STATE, rotorDeg: 70, laps: 3 });
    const first = worldPosition(synthase, atp);
    synthase.setState({ ...STATE, rotorDeg: 250, laps: 4 });
    synthase.setState({ ...STATE, rotorDeg: 70, laps: 3 });
    expect(worldPosition(synthase, atp).distanceTo(first)).toBeLessThan(1e-6);
  });

  it('hides the membrane and the flow with their flags', () => {
    const synthase = build();
    synthase.setState({ ...STATE, view: { ...STATE.view, membrane: false, flow: false } });
    expect(isShown(anchorOf(synthase, 'membrane'))).toBe(false);
    FLOW_PARTS.forEach((id) => expect(isShown(anchorOf(synthase, id)), id).toBe(false));
    expect(isShown(anchorOf(synthase, 'openSite'))).toBe(true);
  });

  it('turns the head see-through with the cutaway flag', () => {
    const synthase = build();
    synthase.setState({ ...STATE, view: { ...STATE.view, cutaway: true } });
    const glass = library().get('betaSubunits', FINISHES.betaGlass);
    expect(meshesWith(synthase.root, glass).length).toBe(1);
    expect(glass.opacity).toBeLessThan(0.3);
  });

  it('blurs the ring and its riding protons at real speed and clears it when slow', () => {
    const synthase = build();
    const blades = library().get('cRing', FINISHES.ring);
    synthase.setState({ ...STATE, degreesPerSecond: REAL_DEGREES_PER_SECOND });
    for (let frame = 0; frame < BLUR_FRAMES; frame += 1) synthase.update(FRAME, CAMERA_DISTANCE);
    expect(meshesWith(synthase.root, blades).some(isShown)).toBe(false);
    expect(library().get('cRing', FINISHES.blur).opacity).toBeGreaterThan(0.5);
    synthase.setState({ ...STATE, degreesPerSecond: 0 });
    for (let frame = 0; frame < BLUR_FRAMES; frame += 1) synthase.update(FRAME, CAMERA_DISTANCE);
    expect(meshesWith(synthase.root, blades).some(isShown)).toBe(true);
    expect(library().get('cRing', FINISHES.blur).opacity).toBe(0);
  });

  it('leaves the scene and frees its resources when disposed', () => {
    const synthase = build();
    const parent = new Group();
    parent.add(synthase.root);
    let disposed = 0;
    synthase.root.traverse((object) => {
      if (object instanceof Mesh)
        object.geometry.addEventListener('dispose', () => (disposed += 1));
    });
    synthase.dispose();
    assembly = null;
    expect(synthase.root.parent).toBeNull();
    expect(disposed).toBeGreaterThan(0);
  });
});
