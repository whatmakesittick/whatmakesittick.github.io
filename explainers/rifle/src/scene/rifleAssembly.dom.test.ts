import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, MotionReading, RegionId, ShotReading } from '../ids';
import {
  BARREL,
  BULLET_SEAT_X,
  CARRIER_STROKE,
  EJECTOR_X,
  FREE_TRAVEL,
  HAMMER,
  RETARDER_ANGLE,
  UNLOCK_ANGLE,
} from '../model/layout';
import { RifleAssembly } from './rifleAssembly';

const SHOT: ShotReading = {
  pressure: 0,
  travel: 0,
  speed: 0,
  spin: 0,
  turns: 0,
  stage: 'seated',
  muzzleFlash: 0,
  gas: 0,
};
const MOTION: MotionReading = {
  carrier: 0,
  bolt: 0,
  hammer: RETARDER_ANGLE,
  spring: 0,
  caseFlight: 0,
  feed: 0,
  trigger: 1,
};
const STATE: AssemblyState = {
  time: 0,
  shot: SHOT,
  motion: MOTION,
  gasPort: 'open',
  playing: false,
  view: { cutaway: false, gas: true, trail: true, labels: true },
};
const ANCHORS: readonly AnchorId[] = [
  'muzzle',
  'chamber',
  'gasBlock',
  'carrier',
  'bolt',
  'hammer',
  'magazine',
  'ejectionPort',
  'bullet',
];
const REGIONS: readonly RegionId[] = [
  'scene',
  'rifle',
  'receiver',
  'chamber',
  'barrel',
  'gasSystem',
  'reloadBay',
];
const TRIANGLE_BUDGET = { whole: 160_000, cut: 200_000 };
const FRAME = 1 / 60;
const RIGHT_SIDE = 0.5;

let assembly: RifleAssembly;
let materials: MaterialLibrary;
let textures: ReturnType<typeof createSceneTextures>;

function show(patch: {
  shot?: Partial<ShotReading>;
  motion?: Partial<MotionReading>;
  view?: Partial<AssemblyState['view']>;
  playing?: boolean;
  gasPort?: AssemblyState['gasPort'];
  time?: number;
}): void {
  assembly.setState({
    ...STATE,
    time: patch.time ?? 0,
    playing: patch.playing ?? false,
    gasPort: patch.gasPort ?? 'open',
    shot: { ...SHOT, ...patch.shot },
    motion: { ...MOTION, ...patch.motion },
    view: { ...STATE.view, ...patch.view },
  });
}

function worldPosition(object: Object3D): Vector3 {
  assembly.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function labelPosition(id: (typeof PART_IDS)[number]): Vector3 {
  const anchor = assembly.labelAnchors().get(id);
  if (!anchor) throw new Error(`No label for ${id}`);
  return worldPosition(anchor);
}

function meshesOf(group: string): Mesh[] {
  const found: Mesh[] = [];
  assembly.root.traverse((object) => {
    if (!(object instanceof Mesh)) return;
    const material = object.material as Material;
    if (materials.groupOf(material) === group) found.push(object);
  });
  return found;
}

function opaque(mesh: Mesh): boolean {
  return !(mesh.material as Material).transparent;
}

function triangles(geometry: BufferGeometry): number {
  return (geometry.getIndex()?.count ?? geometry.getAttribute('position').count) / 3;
}

function shownTriangles(): number {
  let total = 0;
  assembly.root.traverse((object) => {
    if (!(object instanceof Mesh) || !isShown(object)) return;
    const copies = object instanceof InstancedMesh ? object.count : 1;
    total += triangles(object.geometry) * copies;
  });
  return total;
}

function rightmostShownZ(group: string): number {
  assembly.root.updateMatrixWorld(true);
  let reach = -Infinity;
  for (const mesh of meshesOf(group).filter((item) => isShown(item) && opaque(item))) {
    mesh.geometry.computeBoundingBox();
    const box = mesh.geometry.boundingBox?.clone().applyMatrix4(mesh.matrixWorld);
    if (box) reach = Math.max(reach, box.max.z);
  }
  return reach;
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = new RifleAssembly({ materials, textures }, STATE);
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
});

describe('rifle assembly', () => {
  it('gives every part a label anchor and every named anchor a place', () => {
    const labels = assembly.labelAnchors();
    expect(labels.size).toBe(PART_IDS.length);
    for (const id of PART_IDS) expect(labels.get(id)).toBeDefined();
    for (const id of ANCHORS) expect(assembly.anchor(id)).toBeDefined();
  });

  it('returns a box for every region that holds its subject', () => {
    show({});
    for (const id of REGIONS) expect(assembly.region(id).isEmpty()).toBe(false);
    const holds = (region: RegionId, anchor: AnchorId) =>
      assembly.region(region).containsPoint(worldPosition(assembly.anchor(anchor)));
    expect(holds('chamber', 'chamber')).toBe(true);
    expect(holds('gasSystem', 'gasBlock')).toBe(true);
    expect(holds('reloadBay', 'ejectionPort')).toBe(true);
    expect(holds('receiver', 'hammer')).toBe(true);
    expect(holds('barrel', 'muzzle')).toBe(true);
    expect(assembly.region('scene').containsBox(assembly.region('rifle'))).toBe(true);
  });

  it('puts the charging handle and the selector on the right side', () => {
    show({});
    expect(labelPosition('chargingHandle').z).toBeGreaterThan(RIGHT_SIDE);
    expect(labelPosition('selector').z).toBeGreaterThan(RIGHT_SIDE);
    expect(labelPosition('gasTube').y).toBeGreaterThan(labelPosition('barrel').y);
    expect(labelPosition('cleaningRod').y).toBeLessThan(labelPosition('barrel').y);
  });

  it('removes the right half of the housings in the cutaway and ghosts the controls', () => {
    show({ view: { cutaway: true } });
    for (const group of ['receiver', 'barrel', 'gasBlock', 'gasTube', 'stock', 'handguard']) {
      expect(rightmostShownZ(group)).toBeLessThanOrEqual(RIGHT_SIDE);
    }
    expect(meshesOf('chargingHandle').some((mesh) => isShown(mesh) && opaque(mesh))).toBe(false);
    expect(meshesOf('selector').some((mesh) => isShown(mesh) && !opaque(mesh))).toBe(true);
    show({});
    expect(rightmostShownZ('receiver')).toBeGreaterThan(RIGHT_SIDE);
  });

  it('moves the carrier and the handle back and turns the bolt only after the free travel', () => {
    show({});
    const carrierHome = worldPosition(assembly.anchor('carrier')).x;
    const boltHome = worldPosition(assembly.anchor('bolt')).x;
    const handleHome = labelPosition('chargingHandle').x;
    show({ motion: { carrier: FREE_TRAVEL, bolt: -UNLOCK_ANGLE / 2 } });
    expect(worldPosition(assembly.anchor('bolt')).x).toBeCloseTo(boltHome);
    show({ motion: { carrier: CARRIER_STROKE, bolt: -UNLOCK_ANGLE } });
    expect(worldPosition(assembly.anchor('carrier')).x).toBeCloseTo(carrierHome - CARRIER_STROKE);
    expect(labelPosition('chargingHandle').x).toBeCloseTo(handleHome - CARRIER_STROKE);
    expect(worldPosition(assembly.anchor('bolt')).x).toBeCloseTo(
      boltHome - (CARRIER_STROKE - FREE_TRAVEL),
    );
  });

  it('turns the extractor with the bolt, counterclockwise seen from behind when unlocking', () => {
    show({});
    const locked = labelPosition('extractor');
    show({ motion: { bolt: -UNLOCK_ANGLE } });
    const open = labelPosition('extractor');
    expect(open.y).toBeGreaterThan(locked.y);
    expect(open.z).toBeLessThan(locked.z);
  });

  it('lets the bolt push the hammer back and lets it fall to strike', () => {
    show({ motion: { hammer: 0 } });
    const struck = worldPosition(assembly.anchor('hammer'));
    show({ motion: { hammer: HAMMER.swing, carrier: 80 } });
    const cocked = worldPosition(assembly.anchor('hammer'));
    expect(cocked.x).toBeLessThan(struck.x);
    expect(cocked.y).toBeLessThan(struck.y);
  });

  it('drives the bullet down the bore, spins it and hides it once gone', () => {
    show({});
    expect(worldPosition(assembly.anchor('bullet')).x).toBeCloseTo(BULLET_SEAT_X + 13);
    show({ shot: { stage: 'moving', travel: 200, turns: 0.6, pressure: 150 } });
    expect(worldPosition(assembly.anchor('bullet')).x).toBeCloseTo(BULLET_SEAT_X + 213);
    expect(isShown(assembly.anchor('bullet'))).toBe(true);
    show({ shot: { stage: 'gone', travel: BARREL.x[1] - BULLET_SEAT_X, muzzleFlash: 1 } });
    expect(isShown(assembly.anchor('bullet'))).toBe(false);
  });

  it('carries the empty case on the bolt face, then throws it out to the right', () => {
    show({ shot: { stage: 'gone' }, motion: { carrier: FREE_TRAVEL - EJECTOR_X } });
    const ejected = labelPosition('spentCase');
    expect(ejected.x).toBeCloseTo(EJECTOR_X + 20, 0);
    show({ shot: { stage: 'gone' }, motion: { carrier: 100, caseFlight: 0.8 } });
    expect(labelPosition('spentCase').z).toBeGreaterThan(80);
    show({ shot: { stage: 'gone' }, motion: { carrier: 100, caseFlight: 1 } });
    expect(meshesOf('spentCase').some((mesh) => isShown(mesh))).toBe(false);
  });

  it('shows the live round as a section in the chamber with the cutaway on', () => {
    show({ view: { cutaway: true } });
    const shownPowder = meshesOf('powder').filter((mesh) => isShown(mesh));
    expect(shownPowder.length).toBeGreaterThan(0);
    show({});
    expect(meshesOf('powder').some((mesh) => isShown(mesh))).toBe(false);
  });

  it('animates the vent wisps on its own only while playing and venting', () => {
    show({});
    expect(assembly.update(FRAME, 500)).toBe(false);
    const venting = { shot: { gas: 1, stage: 'gone' as const }, motion: { carrier: 22 } };
    show({ ...venting, playing: true });
    expect(assembly.update(FRAME, 500)).toBe(true);
    show({ ...venting, playing: false });
    expect(assembly.update(FRAME, 500)).toBe(false);
  });

  it('plugs the gas port when it is blocked', () => {
    show({ gasPort: 'blocked', view: { cutaway: true } });
    expect(meshesOf('gasPort').filter((mesh) => isShown(mesh)).length).toBe(2);
    show({ view: { cutaway: true } });
    expect(meshesOf('gasPort').filter((mesh) => isShown(mesh)).length).toBe(1);
  });

  it('stays within the triangle budget with and without the cutaway', () => {
    show({});
    expect(shownTriangles()).toBeLessThan(TRIANGLE_BUDGET.whole);
    show({ view: { cutaway: true } });
    expect(shownTriangles()).toBeLessThan(TRIANGLE_BUDGET.cut);
  });

  it('frees its resources on dispose', () => {
    const extra = new RifleAssembly({ materials, textures }, STATE);
    expect(() => extra.dispose()).not.toThrow();
    expect(extra.root.parent).toBeNull();
  });
});
