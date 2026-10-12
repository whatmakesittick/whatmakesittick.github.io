import { describe, expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, SettingId, ViewOptions } from '../ids';
import { ENGINE_GEOMETRY, crownY, flowsAt, portsAt, sparkGlow } from '../model';
import { createChainsawAssembly } from './chainsawAssembly';

const FRAME = 1 / 60;
const SETTLE_FRAMES = 120;

interface Options {
  angle?: number;
  setting?: SettingId;
  riseDeg?: number;
  chainMm?: number;
  brake?: boolean;
  view?: Partial<ViewOptions>;
}

function stateWith({
  angle = 0,
  setting = 'bench',
  riseDeg = 0,
  chainMm = 0,
  brake = false,
  view = {},
}: Options = {}): AssemblyState {
  return {
    setting,
    phase: angle,
    playing: false,
    crank: {
      angle,
      phase: 'power',
      rpm: 9900,
      degPerSecond: 0,
      sparkGlow: sparkGlow(angle),
      ports: portsAt(angle),
      flows: flowsAt(angle),
      crankcasePressure: -1,
    },
    drive: {
      throttle: 1,
      clutch: brake ? 'slipping' : 'driving',
      shoesOut: 1,
      chainMm,
      drumDeg: 0,
      chainSpeed: 22,
      oiling: !brake,
    },
    safety: { brake, kickback: riseDeg > 0, riseDeg, guardForward: brake ? 1 : 0 },
    view: { cutaway: false, flow: true, zone: false, labels: true, ...view },
  };
}

function resources() {
  return { materials: new MaterialLibrary(), textures: createSceneTextures() };
}

function world(object: Object3D): Vector3 {
  object.updateWorldMatrix(true, false);
  return object.getWorldPosition(new Vector3());
}

function named(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`No object ${name}`);
  return found;
}

function settle(assembly: { update(delta: number, distance: number): boolean }): boolean {
  let moving = true;
  for (let frame = 0; frame < SETTLE_FRAMES && moving; frame += 1)
    moving = assembly.update(FRAME, 1);
  return moving;
}

describe('chainsaw assembly', () => {
  it('has a label anchor for every part, every anchor and every region', () => {
    const assembly = createChainsawAssembly(resources(), stateWith());
    expect([...assembly.labelAnchors().keys()]).toEqual([...PART_IDS]);
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    assembly.dispose();
  });

  it('turns the crank clockwise from the bar side and keeps the rod on the piston', () => {
    const assembly = createChainsawAssembly(resources(), stateWith({ angle: 90 }));
    const crank = named(assembly.root, 'crank');
    const pin = crank.localToWorld(new Vector3(0, ENGINE_GEOMETRY.throw, 0));
    expect(pin.x).toBeCloseTo(ENGINE_GEOMETRY.throw, 6);
    const rod = named(assembly.root, 'rod');
    const wrist = rod.localToWorld(new Vector3(0, ENGINE_GEOMETRY.rod, 0));
    expect(wrist.x).toBeCloseTo(0, 6);
    expect(wrist.y).toBeCloseTo(crownY(90) - ENGINE_GEOMETRY.pinToCrown, 6);
    expect(world(named(assembly.root, 'piston')).y).toBeCloseTo(crownY(90), 6);
    assembly.dispose();
  });

  it('runs the top of the chain toward the nose', () => {
    const assembly = createChainsawAssembly(resources(), stateWith());
    const cutters = assembly.root
      .getObjectsByProperty('name', 'cutters')
      .find((object) => object instanceof InstancedMesh) as InstancedMesh;
    const xAt = () => new Vector3().setFromMatrixPosition(cutters.getMatrixAt(0, new Matrix4())).x;
    const before = xAt();
    assembly.setState(stateWith({ chainMm: 10 }));
    expect(xAt()).toBeGreaterThan(before);
    assembly.dispose();
  });

  it('shows the bar oil whenever the pump oils, with or without the flow view', () => {
    const assembly = createChainsawAssembly(resources(), stateWith({ view: { flow: false } }));
    const oil = named(assembly.root, 'barOil');
    expect(isShown(oil)).toBe(true);
    expect(isShown(named(assembly.root, 'flow'))).toBe(false);
    assembly.setState(stateWith({ brake: true, view: { flow: true } }));
    expect(isShown(oil)).toBe(false);
    assembly.dispose();
  });

  it('opens the cutaway and shows the zone only when asked', () => {
    const assembly = createChainsawAssembly(resources(), stateWith());
    const cover = named(assembly.root, 'clutchCover');
    const front = named(assembly.root, 'cylinderFront');
    expect(isShown(cover) && isShown(front)).toBe(true);
    expect(isShown(assembly.labelAnchors().get('kickbackZone') as Object3D)).toBe(false);
    assembly.setState(stateWith({ view: { cutaway: true, zone: true } }));
    expect(isShown(cover) || isShown(front)).toBe(false);
    expect(isShown(assembly.labelAnchors().get('kickbackZone') as Object3D)).toBe(true);
    assembly.dispose();
  });

  it('raises the nose in a kickback and eases the hand guard forward', () => {
    const assembly = createChainsawAssembly(resources(), stateWith({ setting: 'kickback' }));
    settle(assembly);
    const resting = world(assembly.anchor('nose')).y;
    const guard = named(assembly.root, 'handGuard');
    assembly.setState(stateWith({ setting: 'kickback', riseDeg: 35, brake: true }));
    expect(world(assembly.anchor('nose')).y).toBeGreaterThan(resting);
    expect(assembly.update(FRAME, 1)).toBe(true);
    expect(settle(assembly)).toBe(false);
    expect(guard.rotation.z).toBeLessThan(0);
    assembly.dispose();
  });

  it('throws chips while the chain cuts and settles once they land', () => {
    const assembly = createChainsawAssembly(resources(), stateWith({ setting: 'cutting' }));
    settle(assembly);
    for (let mm = 0; mm <= 400; mm += 20)
      assembly.setState(stateWith({ setting: 'cutting', chainMm: mm }));
    const chips = named(assembly.root, 'chips') as InstancedMesh;
    expect(chips.count).toBeGreaterThan(0);
    expect(assembly.update(FRAME, 1)).toBe(true);
    for (let frame = 0; frame < 400; frame += 1) assembly.update(FRAME, 1);
    expect(chips.count).toBe(0);
    expect(assembly.update(FRAME, 1)).toBe(false);
    assembly.dispose();
  });
});
