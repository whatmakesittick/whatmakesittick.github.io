import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh, Vector3 } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { MaterialLibrary, UNDIMMED_GROUP } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { PART_IDS } from '../ids';
import type {
  AnchorId,
  AssemblyState,
  PartId,
  RegionId,
  SensorReading,
  StrikeReading,
} from '../ids';
import { flightAt } from '../model/flight';
import { AIRCRAFT, LOITER, TARGET } from '../model/layout';
import { IMPACT_UNITS, LAUNCH_POINT, LAUNCH_UNITS } from '../model/strike';
import { FINISHES } from './finishes';
import { ReaperAssembly } from './reaperAssembly';

const ON_STATION = 50;
const STRIKE: StrikeReading = { stage: 'armed', share: 0, launchPoint: null, flash: 0 };
const SENSOR: SensorReading = { mode: 'day', aim: TARGET, onTarget: true, lasing: false };
const VIEW = { cutaway: false, links: true, track: true, labels: true };
const ANCHORS: readonly AnchorId[] = [
  'aircraft',
  'sensorBall',
  'hump',
  'target',
  'groundStation',
  'satellite',
  'missile',
];
const REGIONS: readonly RegionId[] = ['scene', 'airfield', 'aircraft', 'target'];
const TRIANGLE_BUDGET = { whole: 200_000, cut: 240_000 };
const FRAME = 1 / 60;

interface Patch {
  phase?: number;
  strike?: Partial<StrikeReading>;
  sensor?: Partial<SensorReading>;
  flight?: Partial<AssemblyState['flight']>;
  view?: Partial<AssemblyState['view']>;
  link?: AssemblyState['link'];
  load?: AssemblyState['load'];
  playing?: boolean;
}

function stateAt(patch: Patch = {}): AssemblyState {
  const phase = patch.phase ?? ON_STATION;
  return {
    phase,
    clock: phase,
    flight: { ...flightAt(phase), ...patch.flight },
    strike: { ...STRIKE, ...patch.strike },
    sensor: { ...SENSOR, ...patch.sensor },
    link: patch.link ?? 'sat',
    load: patch.load ?? 'armed',
    playing: patch.playing ?? false,
    view: { ...VIEW, ...patch.view },
  };
}

let assembly: ReaperAssembly;
let materials: MaterialLibrary;
let textures: ReturnType<typeof createSceneTextures>;

function show(patch: Patch = {}): void {
  assembly.setState(stateAt(patch));
  assembly.root.updateMatrixWorld(true);
}

function label(id: PartId): Object3D {
  const anchor = assembly.labelAnchors().get(id);
  if (!anchor) throw new Error(`No label for ${id}`);
  return anchor;
}

function worldOf(object: Object3D): Vector3 {
  assembly.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
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

function meshWith(material: Material): Mesh {
  let found: Mesh | null = null;
  assembly.root.traverse((object) => {
    if (object instanceof Mesh && object.material === material) found = object;
  });
  if (!found) throw new Error('No mesh uses the material');
  return found;
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = new ReaperAssembly({ materials, textures }, stateAt());
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
});

describe('reaper assembly', () => {
  it('gives every part a label anchor and every named anchor a place', () => {
    expect(assembly.labelAnchors().size).toBe(PART_IDS.length);
    for (const id of PART_IDS) expect(assembly.labelAnchors().get(id)).toBeDefined();
    for (const id of ANCHORS) expect(assembly.anchor(id)).toBeDefined();
    expect(assembly.anchor('aircraft').children.length).toBeGreaterThan(5);
  });

  it('returns the diorama regions and the aircraft box at its current pose', () => {
    show();
    for (const id of REGIONS) expect(assembly.region(id).isEmpty()).toBe(false);
    const aircraft = assembly.region('aircraft');
    expect(aircraft.containsPoint(new Vector3(...flightAt(ON_STATION).position))).toBe(true);
    expect(assembly.region('scene').containsBox(aircraft)).toBe(true);
    expect(
      assembly.region('target').containsPoint(worldOf(assembly.anchor('target')).setY(1)),
    ).toBe(true);
    show({ phase: 0 });
    expect(assembly.region('airfield').containsBox(assembly.region('aircraft'))).toBe(true);
  });

  it('hands the camera the aircraft position, heading, span and the target', () => {
    show({ phase: ON_STATION });
    const chase = assembly.chaseTarget();
    expect(chase.position).toEqual(flightAt(ON_STATION).position);
    expect(chase.heading).toBe(flightAt(ON_STATION).heading);
    expect(chase.span).toBe(AIRCRAFT.span);
    expect(chase.target).toEqual(TARGET);
  });

  it('rests on its wheels on the runway with the nose along x and the right wing at plus z', () => {
    show({ phase: 0 });
    const centre = worldOf(assembly.anchor('aircraft'));
    expect(centre.y).toBeCloseTo(AIRCRAFT.restHeight);
    expect(worldOf(label('landingGear')).y).toBeLessThan(0.5);
    expect(worldOf(label('wing')).z).toBeGreaterThan(centre.z + 3);
    expect(worldOf(label('noseHump')).y).toBeGreaterThan(centre.y + 0.5);
    const ball = worldOf(label('sensorBall'));
    expect(ball.y).toBeLessThan(centre.y - 0.5);
    expect(ball.x).toBeGreaterThan(centre.x + 4);
    expect(ball.z).toBeCloseTo(centre.z);
    expect(worldOf(label('propeller')).x).toBeLessThan(centre.x - 4);
    expect(worldOf(label('vTail')).y).toBeGreaterThan(centre.y + 0.5);
    expect(worldOf(label('ventralFin')).y).toBeLessThan(centre.y - 0.5);
  });

  it('lights the left wingtip red and the right wingtip green', () => {
    show({ phase: 0 });
    const red = worldOf(meshWith(materials.get('wing', FINISHES.navRed)));
    const green = worldOf(meshWith(materials.get('wing', FINISHES.navGreen)));
    expect(red.z).toBeLessThan(-AIRCRAFT.span / 2 + 0.5);
    expect(green.z).toBeGreaterThan(AIRCRAFT.span / 2 - 0.5);
  });

  it('rolls the right wing down when the bank is positive', () => {
    show({ phase: 0, flight: { bank: 0.4 } });
    const centre = worldOf(assembly.anchor('aircraft'));
    expect(worldOf(label('wing')).y).toBeLessThan(centre.y - 1);
  });

  it('stows the gear in flight and shows it in its bay in the cutaway', () => {
    show({ phase: ON_STATION });
    expect(isShown(label('landingGear'))).toBe(false);
    show({ phase: ON_STATION, view: { cutaway: true } });
    expect(isShown(label('landingGear'))).toBe(true);
    const centre = worldOf(assembly.anchor('aircraft'));
    expect(Math.abs(worldOf(label('landingGear')).y - centre.y)).toBeLessThan(1);
  });

  it('opens the shell to show the fuel, the engine and the satellite dish in the cutaway', () => {
    show();
    for (const id of ['fuelTank', 'engine', 'satelliteDish'] as const) {
      expect(isShown(label(id))).toBe(false);
    }
    show({ view: { cutaway: true } });
    for (const id of ['fuelTank', 'engine', 'satelliteDish'] as const) {
      expect(isShown(label(id))).toBe(true);
    }
  });

  it('carries the bombs and the Hellfires only in the armed load', () => {
    show({ load: 'armed' });
    expect(isShown(label('hellfire'))).toBe(true);
    expect(isShown(label('bombs'))).toBe(true);
    show({ load: 'clean' });
    expect(isShown(label('hellfire'))).toBe(false);
    expect(isShown(label('bombs'))).toBe(false);
    expect(isShown(label('pylons'))).toBe(true);
  });

  it('flies one Hellfire from its rail to the target and hides it after the hit', () => {
    show({ phase: LAUNCH_UNITS - 1 });
    expect(isShown(label('missile'))).toBe(false);
    const share = 0.5;
    const phase = LAUNCH_UNITS + share * (IMPACT_UNITS - LAUNCH_UNITS);
    show({ phase, strike: { stage: 'flying', share, launchPoint: LAUNCH_POINT } });
    expect(isShown(label('missile'))).toBe(true);
    const missile = worldOf(label('missile'));
    expect(missile.y).toBeLessThan(LAUNCH_POINT[1]);
    expect(missile.y).toBeGreaterThan(TARGET[1]);
    show({ phase: IMPACT_UNITS + 0.5, strike: { stage: 'hit', share: 1, flash: 0.7 } });
    expect(isShown(label('missile'))).toBe(false);
  });

  it('draws the satellite link and the line-of-sight link only for their mode', () => {
    show({ link: 'sat' });
    expect(isShown(label('satLink'))).toBe(true);
    expect(isShown(label('losLink'))).toBe(false);
    show({ link: 'los' });
    expect(isShown(label('losLink'))).toBe(true);
    expect(isShown(label('satLink'))).toBe(false);
    show({ link: 'sat', view: { links: false } });
    expect(isShown(label('satLink'))).toBe(false);
  });

  it('puts the link labels on their beams between the aircraft and the far end', () => {
    show({ link: 'sat' });
    const hump = worldOf(assembly.anchor('hump'));
    const satellite = worldOf(assembly.anchor('satellite'));
    const middle = worldOf(label('satLink'));
    expect(middle.distanceTo(hump) + middle.distanceTo(satellite)).toBeCloseTo(
      hump.distanceTo(satellite),
      0,
    );
  });

  it('shows the sensor cone in day and infrared and the laser on the target', () => {
    show();
    expect(isShown(label('sensorCone'))).toBe(true);
    expect(isShown(label('laserBeam'))).toBe(false);
    show({ sensor: { mode: 'laser' } });
    expect(isShown(label('sensorCone'))).toBe(false);
    expect(isShown(label('laserBeam'))).toBe(true);
    show({ sensor: { lasing: true } });
    expect(isShown(label('laserBeam'))).toBe(true);
    show({ phase: 0 });
    expect(isShown(label('sensorCone'))).toBe(false);
  });

  it('keeps the world anchors on the airfield, at the target and in the sky', () => {
    show();
    expect(worldOf(label('runway')).x).toBeLessThan(0);
    expect(worldOf(label('groundStation')).z).toBeGreaterThan(20);
    expect(worldOf(label('target')).x).toBeCloseTo(LOITER.centre[0]);
    expect(worldOf(label('satellite')).y).toBeGreaterThan(1000);
  });

  it('moves on its own only while playing', () => {
    show();
    expect(assembly.update(FRAME, 60)).toBe(false);
    show({ playing: true });
    expect(assembly.update(FRAME, 60)).toBe(true);
  });

  it('keeps the sky and the ground out of the highlight', () => {
    const backdrop: Mesh[] = [];
    assembly.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (materials.groupOf(object.material as Material) === UNDIMMED_GROUP) backdrop.push(object);
    });
    expect(backdrop.length).toBeGreaterThanOrEqual(2);
  });

  it('stays within the triangle budget with and without the cutaway', () => {
    show();
    expect(shownTriangles()).toBeLessThan(TRIANGLE_BUDGET.whole);
    show({ view: { cutaway: true } });
    expect(shownTriangles()).toBeLessThan(TRIANGLE_BUDGET.cut);
  });

  it('compiles every hidden material once when warming up', () => {
    show();
    const compiled: Object3D[] = [];
    assembly.warmUp((object) => compiled.push(object));
    const seen = new Set(compiled.map((object) => (object as Mesh).material));
    expect(compiled.length).toBeGreaterThan(5);
    expect(seen.size).toBe(compiled.length);
    expect(compiled.every((object) => !isShown(object))).toBe(true);
  });

  it('frees its resources on dispose', () => {
    const extra = new ReaperAssembly({ materials, textures }, stateAt());
    expect(() => extra.dispose()).not.toThrow();
    expect(extra.root.parent).toBeNull();
  });
});
