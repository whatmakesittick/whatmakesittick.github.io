import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Color, InstancedMesh, Mesh, Points, ShaderMaterial, Vector3 } from 'three';
import type { BufferGeometry, MeshStandardMaterial, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { PART_IDS, STREAM_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { CUTOFF_TIME, NOZZLE_EXIT, START_SEQUENCE, phaseAt } from '../model';
import { PAINT } from './finishes';
import { RaptorAssembly } from './raptorAssembly';

const STATE: AssemblyState = {
  phase: phaseAt(20),
  propellant: null,
  playing: false,
  view: { cutaway: false, flow: false, flame: true, cluster: false, labels: false },
};
const ANCHORS: readonly AnchorId[] = [
  'gimbal',
  'oxygenPump',
  'methanePump',
  'oxygenPreburner',
  'methanePreburner',
  'injector',
  'chamber',
  'throat',
  'nozzleExit',
  'plume',
];
const REGIONS: readonly RegionId[] = [
  'scene',
  'engine',
  'hero',
  'powerhead',
  'turbopumps',
  'chamber',
  'nozzle',
  'nozzleAndPlume',
  'booster',
];
const TRIANGLE_BUDGET = { cut: 120_000, ascent: 250_000 };
const FRAME = 1 / 60;
const STEP = 0.05;
const TURBINE_COLOUR = new Color(PAINT.inconel).getHex();

let assembly: RaptorAssembly;
let materials: MaterialLibrary;
let textures: ReturnType<typeof createSceneTextures>;

function worldPosition(object: Object3D): Vector3 {
  assembly.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function objectsOf<T extends Object3D>(
  test: (object: Object3D) => object is T,
  group?: string,
): T[] {
  const found: T[] = [];
  assembly.root.traverse((object) => {
    if (!test(object)) return;
    const material = (object as unknown as Mesh).material;
    if (group && (Array.isArray(material) || materials.groupOf(material) !== group)) return;
    found.push(object);
  });
  return found;
}

const isMesh = (object: Object3D): object is Mesh => object instanceof Mesh;
const isPoints = (object: Object3D): object is Points => object instanceof Points;

function turbineOf(group: string): Mesh {
  const turbine = objectsOf(isMesh, group).find(
    (mesh) => (mesh.material as MeshStandardMaterial).color?.getHex() === TURBINE_COLOUR,
  );
  if (!turbine) throw new Error(`No turbine in ${group}`);
  return turbine;
}

function triangles(geometry: BufferGeometry): number {
  return (geometry.getIndex()?.count ?? geometry.getAttribute('position').count) / 3;
}

function play(from: number, to: number): void {
  for (let phase = from; phase <= to; phase += STEP) assembly.setState({ ...STATE, phase });
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = new RaptorAssembly({ materials, textures }, STATE);
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
});

describe('raptor assembly', () => {
  it('gives every part a label anchor', () => {
    const labels = assembly.labelAnchors();
    expect(labels.size).toBe(PART_IDS.length);
    for (const id of PART_IDS) expect(labels.get(id)).toBeDefined();
  });

  it('places every named anchor on the engine', () => {
    assembly.setState(STATE);
    expect(worldPosition(assembly.anchor('nozzleExit')).y).toBeCloseTo(NOZZLE_EXIT.y, -1);
    expect(worldPosition(assembly.anchor('methanePump')).x).toBeGreaterThan(0);
    expect(worldPosition(assembly.anchor('oxygenPump')).x).toBeLessThan(0);
    for (const id of ANCHORS) expect(assembly.anchor(id)).toBeDefined();
  });

  it('returns a world box for every region that holds its subject', () => {
    const exit = worldPosition(assembly.anchor('nozzleExit'));
    for (const id of REGIONS) expect(assembly.region(id).isEmpty()).toBe(false);
    expect(assembly.region('nozzle').containsPoint(exit)).toBe(true);
    expect(assembly.region('chamber').containsPoint(worldPosition(assembly.anchor('throat')))).toBe(
      true,
    );
    expect(
      assembly.region('turbopumps').containsPoint(worldPosition(assembly.anchor('oxygenPump'))),
    ).toBe(true);
  });

  it('keeps the camera regions at the rest pose while the engine steers', () => {
    const rest = assembly.region('nozzle').clone();
    assembly.setState({ ...STATE, phase: phaseAt(12) });
    expect(assembly.region('nozzle').equals(rest)).toBe(true);
    const tilted = worldPosition(assembly.anchor('nozzleExit'));
    expect(Math.abs(tilted.z)).toBeGreaterThan(1);
  });

  it('lights the plume while the engine runs and flickers it only while playing', () => {
    const [plume] = objectsOf(isMesh, 'plume').filter(
      (mesh) => mesh.material instanceof ShaderMaterial && !(mesh instanceof InstancedMesh),
    );
    assembly.setState({ ...STATE, phase: 0 });
    expect(isShown(plume)).toBe(false);
    expect(assembly.update(FRAME, 500)).toBe(false);
    assembly.setState(STATE);
    expect(isShown(plume)).toBe(true);
    expect(assembly.update(FRAME, 500)).toBe(false);
    assembly.setState({ ...STATE, playing: true });
    expect(assembly.update(FRAME, 500)).toBe(true);
    assembly.setState({ ...STATE, view: { ...STATE.view, flame: false } });
    expect(isShown(plume)).toBe(false);
    assembly.setState({ ...STATE, playing: true, phase: phaseAt(CUTOFF_TIME + 1.5) });
    expect(assembly.update(FRAME, 500)).toBe(false);
  });

  it('warms the nozzle while running and lets it cool after cutoff', () => {
    const glowing = objectsOf(isMesh, 'nozzle')
      .map((mesh) => mesh.material as MeshStandardMaterial)
      .find((material) => material.emissiveMap);
    if (!glowing) throw new Error('No glowing nozzle wall');
    assembly.setState(STATE);
    const running = glowing.emissiveIntensity;
    assembly.setState({ ...STATE, phase: phaseAt(CUTOFF_TIME + 0.3) });
    const cooling = glowing.emissiveIntensity;
    assembly.setState({ ...STATE, phase: phaseAt(CUTOFF_TIME + 2) });
    expect(running).toBeGreaterThan(cooling);
    expect(cooling).toBeGreaterThan(0);
    expect(glowing.emissiveIntensity).toBe(0);
  });

  it('flashes the preburners as they light', () => {
    const shell = objectsOf(isMesh, 'oxygenPreburner')
      .map((mesh) => mesh.material as MeshStandardMaterial)
      .find((material) => material.emissive?.getHex() === 0xffb072);
    if (!shell) throw new Error('No preburner shell');
    assembly.setState({ ...STATE, phase: phaseAt(START_SEQUENCE.preburnerLight + 0.05) });
    expect(shell.emissiveIntensity).toBeGreaterThan(0);
    assembly.setState({ ...STATE, phase: phaseAt(10) });
    expect(shell.emissiveIntensity).toBe(0);
  });

  it('opens the casings at the cut plane and shows the rotors', () => {
    const cutState = { ...STATE, view: { ...STATE.view, cutaway: true } };
    assembly.setState(cutState);
    expect(isShown(turbineOf('oxygenPump'))).toBe(true);
    for (const mesh of objectsOf(isMesh, 'chamber').filter(isShown)) {
      if (mesh.material instanceof ShaderMaterial) continue;
      const positions = mesh.geometry.getAttribute('position');
      for (let vertex = 0; vertex < positions.count; vertex += 1) {
        expect(positions.getZ(vertex)).toBeLessThanOrEqual(1e-4);
      }
    }
    assembly.setState(STATE);
  });

  it('spins the pumps with the playing burn', () => {
    const rotor = turbineOf('methanePump').parent;
    if (!rotor) throw new Error('No rotor');
    const before = rotor.rotation.y;
    play(phaseAt(20), phaseAt(20.5));
    expect(rotor.rotation.y).not.toBe(before);
  });

  it('moves the flow dots along their paths only while the flow is shown', () => {
    const clouds = objectsOf(isPoints);
    expect(clouds).toHaveLength(4);
    const flowState = { ...STATE, view: { ...STATE.view, cutaway: true, flow: true } };
    assembly.setState(flowState);
    const before = [...clouds[1].geometry.getAttribute('position').array];
    for (let step = 1; step <= 5; step += 1) {
      assembly.setState({ ...flowState, phase: flowState.phase + step * STEP });
    }
    expect([...clouds[1].geometry.getAttribute('position').array]).not.toEqual(before);
    assembly.setState(STATE);
    expect(clouds.every((cloud) => !isShown(cloud))).toBe(true);
  });

  it('builds the booster only when it is warmed up or first shown', () => {
    const late = new RaptorAssembly({ materials, textures }, STATE);
    const instanced = () => {
      let count = 0;
      late.root.traverse((object) => {
        if (
          object instanceof InstancedMesh &&
          materials.groupOf(object.material as MeshStandardMaterial) === 'booster'
        )
          count += 1;
      });
      return count;
    };
    expect(instanced()).toBe(0);
    const compiled: Object3D[] = [];
    late.warmUp((object) => compiled.push(object));
    expect(instanced()).toBeGreaterThan(0);
    expect(compiled).toHaveLength(1);
    expect(isShown(compiled[0])).toBe(false);
    late.warmUp((object) => compiled.push(object));
    expect(compiled).toHaveLength(1);
    late.dispose();
  });

  it('shows the booster with 32 more engines and plumes only in the booster view', () => {
    assembly.warmUp(() => {});
    const copies = objectsOf(
      (object): object is InstancedMesh => object instanceof InstancedMesh,
      'booster',
    );
    expect(copies.length).toBeGreaterThan(0);
    for (const copy of copies) expect(copy.count).toBe(32);
    expect(copies.every((copy) => !isShown(copy))).toBe(true);
    assembly.setState({ ...STATE, view: { ...STATE.view, cluster: true } });
    expect(copies.every(isShown)).toBe(true);
    const plumes = objectsOf(
      (object): object is InstancedMesh => object instanceof InstancedMesh,
      'plume',
    );
    expect(plumes.some((mesh) => mesh.count === 32 && isShown(mesh))).toBe(true);
    assembly.setState(STATE);
  });

  it('stays within the triangle budget in every view', () => {
    const drawn = (state: AssemblyState) => {
      assembly.setState(state);
      let total = 0;
      assembly.root.traverse((object) => {
        if (!(object instanceof Mesh) || !isShown(object)) return;
        const count = object instanceof InstancedMesh ? object.count : 1;
        total += triangles(object.geometry) * count;
      });
      return total;
    };
    const cut = drawn({ ...STATE, view: { ...STATE.view, cutaway: true, flow: true } });
    const ascent = drawn({ ...STATE, view: { ...STATE.view, cluster: true } });
    expect(cut).toBeLessThan(TRIANGLE_BUDGET.cut);
    expect(ascent).toBeLessThan(TRIANGLE_BUDGET.ascent);
    assembly.setState(STATE);
  });

  it('hides the labels of parts that are not showing', () => {
    const labels = assembly.labelAnchors();
    const shown = (id: PartId) => {
      const anchor = labels.get(id);
      if (!anchor) throw new Error(`No anchor ${id}`);
      return isShown(anchor);
    };
    assembly.setState({ ...STATE, phase: 0 });
    expect(shown('plume')).toBe(false);
    expect(shown('shockDiamonds')).toBe(false);
    assembly.setState({ ...STATE, phase: phaseAt(5) });
    expect(shown('plume')).toBe(true);
    expect(shown('shockDiamonds')).toBe(true);
    expect(shown('nozzle')).toBe(true);
    for (const id of STREAM_IDS) expect(shown(id)).toBe(false);
    expect(shown('booster')).toBe(false);
    assembly.setState({
      ...STATE,
      view: { ...STATE.view, cutaway: true, flow: true, cluster: true },
    });
    for (const id of STREAM_IDS) expect(shown(id)).toBe(true);
    expect(shown('booster')).toBe(true);
    assembly.setState(STATE);
  });

  it('frees its resources', () => {
    const extra = new RaptorAssembly({ materials, textures }, STATE);
    extra.dispose();
    expect(extra.root.parent).toBeNull();
  });
});
