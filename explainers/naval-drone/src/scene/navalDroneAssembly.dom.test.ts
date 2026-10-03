import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { helmNozzle, jetAt, throttleAt } from '../model/jet';
import { planingAt } from '../model/hull';
import { JET } from '../model/layout';
import { HELD_PHASE, boatAt, companionsAt, poseAtDistance } from '../model/run';
import { seaAt } from '../model/sea';
import { NavalDroneAssembly } from './navalDroneAssembly';

const ANCHORS: readonly AnchorId[] = [
  'boat',
  'dome',
  'stern',
  'ship',
  'satellite',
  'backupSatellite',
  'groundStation',
];
const REGIONS: readonly RegionId[] = ['scene', 'boat', 'ship', 'shore'];
const VIEW = { cutaway: false, flow: false, links: false, labels: true };
const FRAME = 1 / 60;
const HELD_KNOTS = 22;
const SPRINT = 100;
const TRIANGLE_BUDGET = 260_000;

interface Patch extends Partial<Omit<AssemblyState, 'view'>> {
  view?: Partial<AssemblyState['view']>;
  helm?: 'left' | 'straight' | 'right' | 'reverse';
  knots?: number;
}

function stateAt(phase: number, patch: Patch = {}): AssemblyState {
  const run = boatAt(phase);
  const held = patch.knots !== undefined;
  const helm = patch.helm ?? 'straight';
  const knots = held ? (helm === 'reverse' ? 0 : patch.knots!) : run.knots;
  const { view, ...rest } = patch;
  delete rest.knots;
  delete rest.helm;
  return {
    phase,
    playing: false,
    boat: { ...run, knots, held },
    planing: planingAt(knots),
    jet: jetAt(
      throttleAt(held ? patch.knots! : knots),
      knots,
      helmNozzle(helm),
      helm === 'reverse',
    ),
    companions: held ? [] : companionsAt(phase),
    sea: seaAt('smooth'),
    link: { mode: 'satellite', ghost: null },
    fit: 'standard',
    waterSection: false,
    wettedBar: false,
    ...rest,
    view: { ...VIEW, ...view },
  };
}

let assembly: NavalDroneAssembly;
let textures: ReturnType<typeof createSceneTextures>;

function show(state: AssemblyState): void {
  assembly.setState(state);
  assembly.root.updateMatrixWorld(true);
}

function label(id: PartId): Object3D {
  const anchor = assembly.labelAnchors().get(id);
  if (!anchor) throw new Error(`No label for ${id}`);
  return anchor;
}

function local(object: Object3D): Vector3 {
  const [body] = assembly.anchor('boat').children;
  assembly.root.updateMatrixWorld(true);
  return body.worldToLocal(object.getWorldPosition(new Vector3()));
}

function shownTriangles(): number {
  let total = 0;
  assembly.root.traverse((object) => {
    if (!(object instanceof Mesh) || !isShown(object)) return;
    const geometry = object.geometry;
    const count = (geometry.getIndex()?.count ?? geometry.getAttribute('position').count) / 3;
    total += count * (object instanceof InstancedMesh ? object.count : 1);
  });
  return total;
}

beforeAll(() => {
  textures = createSceneTextures();
  assembly = new NavalDroneAssembly(
    { materials: new MaterialLibrary(), textures },
    stateAt(HELD_PHASE),
  );
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
});

describe('naval drone assembly', () => {
  it('gives every part a label anchor and every anchor and region a place', () => {
    const anchors = assembly.labelAnchors();
    PART_IDS.forEach((id) => expect(anchors.has(id), id).toBe(true));
    ANCHORS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGIONS.forEach((id) => {
      const box = assembly.region(id);
      expect(box.isEmpty(), id).toBe(false);
      expect(Number.isFinite(box.min.x + box.max.z), id).toBe(true);
    });
  });

  it('keeps the posed boat inside its region and reports the chase target', () => {
    show(stateAt(SPRINT));
    const target = assembly.chaseTarget();
    const state = stateAt(SPRINT);
    expect(target.position[0]).toBeCloseTo(state.boat.position[0], 6);
    expect(target.position[1]).toBeCloseTo(state.planing.heave, 6);
    expect(target.length).toBe(5.5);
    expect(assembly.region('boat').containsPoint(assembly.anchor('boat').position)).toBe(true);
  });

  it('swings the steering nozzle exit to starboard on right helm and to port on left', () => {
    show(stateAt(HELD_PHASE, { knots: HELD_KNOTS, helm: 'straight' }));
    expect(local(assembly.anchor('stern')).z).toBeCloseTo(0, 6);
    show(stateAt(HELD_PHASE, { knots: HELD_KNOTS, helm: 'right' }));
    const right = local(assembly.anchor('stern'));
    expect(right.z).toBeGreaterThan(0.04);
    expect(right.x).toBeLessThan(JET.steeringNozzle.pivotX);
    show(stateAt(HELD_PHASE, { knots: HELD_KNOTS, helm: 'left' }));
    expect(local(assembly.anchor('stern')).z).toBeLessThan(-0.04);
  });

  it('lowers the reverse bucket over the nozzle exit only in reverse', () => {
    show(stateAt(HELD_PHASE, { knots: HELD_KNOTS, helm: 'straight' }));
    const stowed = local(label('reverseBucket'));
    show(stateAt(HELD_PHASE, { knots: HELD_KNOTS, helm: 'reverse' }));
    const down = local(label('reverseBucket'));
    expect(stowed.y).toBeGreaterThan(JET.axisY + 0.1);
    expect(down.y).toBeLessThan(stowed.y - 0.1);
    expect(down.y).toBeLessThan(JET.axisY + JET.bucket.depth * 0.6);
    expect(down.x).toBeLessThan(JET.steeringNozzle.x[0]);
  });

  it('draws the links, fit, companions, section, wetted bar and ghost only when asked', () => {
    show(stateAt(HELD_PHASE));
    ['satLink', 'backupLink', 'missileRails', 'companions', 'wettedLength', 'videoGhost'].forEach(
      (id) => expect(isShown(label(id as PartId)), id).toBe(false),
    );
    show(stateAt(HELD_PHASE, { view: { links: true } }));
    expect(isShown(label('satLink'))).toBe(true);
    expect(isShown(label('backupLink'))).toBe(false);
    show(stateAt(HELD_PHASE, { view: { links: true }, link: { mode: 'backup', ghost: null } }));
    expect(isShown(label('backupLink'))).toBe(true);
    expect(isShown(label('satLink'))).toBe(false);
    show(stateAt(HELD_PHASE, { view: { links: true }, link: { mode: 'lost', ghost: null } }));
    expect(isShown(label('satLink')) || isShown(label('backupLink'))).toBe(false);
    show(stateAt(SPRINT, { fit: 'missile' }));
    expect(isShown(label('missileRails'))).toBe(true);
    expect(isShown(label('companions'))).toBe(true);
    show(stateAt(HELD_PHASE, { wettedBar: true, waterSection: true }));
    expect(isShown(label('wettedLength'))).toBe(true);
    const ghost = poseAtDistance(boatAt(HELD_PHASE).distance - 5);
    show(stateAt(HELD_PHASE, { link: { mode: 'satellite', ghost } }));
    expect(isShown(label('videoGhost'))).toBe(true);
  });

  it('opens the cutaway only when asked', () => {
    show(stateAt(HELD_PHASE));
    expect(isShown(label('engine'))).toBe(false);
    show(stateAt(HELD_PHASE, { view: { cutaway: true } }));
    expect(isShown(label('engine'))).toBe(true);
    expect(isShown(label('impeller'))).toBe(true);
  });

  it('animates exactly while playing or held', () => {
    show(stateAt(HELD_PHASE));
    expect(assembly.update(FRAME, 10)).toBe(false);
    show(stateAt(HELD_PHASE, { playing: true }));
    expect(assembly.update(FRAME, 10)).toBe(true);
    show(stateAt(HELD_PHASE, { knots: HELD_KNOTS }));
    expect(assembly.update(FRAME, 10)).toBe(true);
    show(stateAt(HELD_PHASE, { knots: HELD_KNOTS, helm: 'reverse' }));
    expect(assembly.update(FRAME, 10)).toBe(true);
  });

  it('stays inside the triangle budget with everything drawn', () => {
    show(
      stateAt(SPRINT, {
        fit: 'missile',
        waterSection: true,
        wettedBar: true,
        view: { cutaway: true, flow: true, links: true },
      }),
    );
    expect(shownTriangles()).toBeLessThan(TRIANGLE_BUDGET);
  });

  it('compiles hidden variants during warm-up', () => {
    show(stateAt(HELD_PHASE));
    const compiled: Object3D[] = [];
    assembly.warmUp((object) => compiled.push(object));
    expect(compiled.length).toBeGreaterThan(0);
    compiled.forEach((object) => expect(isShown(object)).toBe(false));
  });
});
