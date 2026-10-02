import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { InstancedMesh, Mesh, Object3D, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Material } from 'three';
import { MaterialLibrary, UNDIMMED_GROUP } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { MOTOR_PART_IDS, PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, MotorPartId, PartId, Point, RegionId } from '../ids';
import { CROSSROADS, DRONE, MOTOR_POSITIONS, MOTOR_SPIN, PAD, STATION } from '../model/layout';
import { droneUnits } from '../model/scale';
import { PROP } from './constants';
import { FpvAssembly } from './fpvAssembly';
import { propName } from './parts/drone/propeller';

const ANCHORS: readonly AnchorId[] = ['drone', 'camera', 'station', 'crossroads'];
const REGIONS: readonly RegionId[] = ['scene', 'station', 'drone', 'crossroads', 'route'];
const TRIANGLE_BUDGET = { drone: 60_000, world: 150_000 };
const FRAME = 1 / 60;
const CRUISE: Point = [180, 40, 0];
const CRUISE_PHASE = 20;
const HOVER_SHARES = [0.25, 0.25, 0.25, 0.25] as const;

interface Patch {
  phase?: number;
  flight?: Partial<AssemblyState['flight']>;
  motors?: Partial<AssemblyState['motors']>;
  view?: Partial<AssemblyState['view']>;
  link?: Partial<AssemblyState['link']>;
  video?: AssemblyState['video'];
  playing?: boolean;
}

function stateAt(patch: Patch = {}): AssemblyState {
  return {
    phase: patch.phase ?? 0,
    flight: {
      position: PAD,
      heading: 0,
      pitch: 0,
      roll: 0,
      speedKmh: 0,
      height: 0,
      verticalSpeed: 0,
      onGround: true,
      armed: true,
      propRate: 0.3,
      ...patch.flight,
    },
    motors: { shares: HOVER_SHARES, ...patch.motors },
    battery: { share: 1, volts: 25.2, amps: 0, usedMah: 0 },
    link: { distance: 6, signal: 1, ...patch.link },
    video: patch.video ?? 'analogue',
    move: 'hover',
    playing: patch.playing ?? false,
    view: { links: true, track: true, arrows: true, labels: true, ...patch.view },
  };
}

function cruising(patch: Patch = {}): AssemblyState {
  return stateAt({
    phase: CRUISE_PHASE,
    ...patch,
    flight: {
      position: CRUISE,
      height: CRUISE[1],
      speedKmh: 70,
      onGround: false,
      propRate: 0.8,
      ...patch.flight,
    },
  });
}

let assembly: FpvAssembly;
let materials: MaterialLibrary;
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

function worldOf(object: Object3D): Vector3 {
  assembly.root.updateMatrixWorld(true);
  return object.getWorldPosition(new Vector3());
}

function triangles(geometry: BufferGeometry): number {
  return (geometry.getIndex()?.count ?? geometry.getAttribute('position').count) / 3;
}

function shownTriangles(root: Object3D): number {
  let total = 0;
  root.traverse((object) => {
    if (!(object instanceof Mesh) || !isShown(object)) return;
    const copies = object instanceof InstancedMesh ? object.count : 1;
    total += triangles(object.geometry) * copies;
  });
  return total;
}

function spinner(id: MotorPartId): Object3D {
  const found = assembly.root.getObjectByName(propName(id));
  if (!found) throw new Error(`No spinning propeller for ${id}`);
  return found;
}

function bladeTipSweep(id: MotorPartId): Vector3 {
  const marker = new Object3D();
  marker.position.set(PROP.radius, 0, 0);
  spinner(id).add(marker);
  const before = worldOf(marker);
  assembly.update(FRAME, 60);
  const after = worldOf(marker);
  marker.removeFromParent();
  return after.sub(before);
}

beforeAll(() => {
  materials = new MaterialLibrary();
  textures = createSceneTextures();
  assembly = new FpvAssembly({ materials, textures }, stateAt());
});

afterAll(() => {
  assembly.dispose();
  textures.dispose();
});

describe('fpv assembly', () => {
  it('gives every part a label anchor and every named anchor a place', () => {
    expect(assembly.labelAnchors().size).toBe(PART_IDS.length);
    for (const id of PART_IDS) expect(assembly.labelAnchors().get(id)).toBeDefined();
    for (const id of ANCHORS) expect(assembly.anchor(id)).toBeDefined();
    expect(assembly.anchor('drone').children.length).toBeGreaterThan(0);
  });

  it('returns the diorama regions and the drone box at its current pose', () => {
    show(cruising());
    for (const id of REGIONS) expect(assembly.region(id).isEmpty()).toBe(false);
    const drone = assembly.region('drone');
    expect(drone.containsPoint(new Vector3(...CRUISE).setY(CRUISE[1] + 0.4))).toBe(true);
    expect(drone.getSize(new Vector3()).x).toBeGreaterThan(droneUnits(DRONE.wheelbase));
    expect(assembly.region('scene').containsBox(drone)).toBe(true);
    expect(assembly.region('route').containsBox(drone)).toBe(true);
    show(stateAt());
    expect(assembly.region('station').containsBox(assembly.region('drone'))).toBe(true);
    expect(
      assembly.region('crossroads').containsPoint(worldOf(assembly.anchor('crossroads'))),
    ).toBe(true);
  });

  it('hands the camera the drone pose and the drawn wheelbase', () => {
    show(cruising({ flight: { heading: 0.4, pitch: 0.3, roll: -0.2 } }));
    const chase = assembly.chaseTarget();
    expect(chase.position).toEqual(CRUISE);
    expect(chase.heading).toBe(0.4);
    expect(chase.pitch).toBe(0.3);
    expect(chase.roll).toBe(-0.2);
    expect(chase.span).toBe(droneUnits(DRONE.wheelbase));
  });

  it('rests level on the pad with the arms at the rest height', () => {
    show(stateAt());
    const centre = worldOf(assembly.anchor('drone'));
    expect(centre.x).toBeCloseTo(PAD[0]);
    expect(centre.y).toBeCloseTo(droneUnits(DRONE.restHeight));
    expect(worldOf(label('launchPad')).y).toBeLessThan(0.3);
  });

  it('puts every motor at its layout position with the nose along x and right at plus z', () => {
    show(stateAt());
    const centre = worldOf(assembly.anchor('drone'));
    for (const id of MOTOR_PART_IDS) {
      const motor = worldOf(label(id));
      const [x, , z] = MOTOR_POSITIONS[id];
      expect(motor.x).toBeCloseTo(centre.x + droneUnits(x), 3);
      expect(motor.z).toBeCloseTo(centre.z + droneUnits(z), 3);
      expect(motor.y).toBeGreaterThan(centre.y);
    }
    expect(worldOf(label('camera')).x).toBeGreaterThan(centre.x + 1);
    expect(worldOf(label('videoAntenna')).x).toBeLessThan(centre.x - 0.8);
    expect(worldOf(label('battery')).y).toBeGreaterThan(centre.y + 0.4);
  });

  it('spins motors 1 and 4 clockwise and motors 2 and 3 counter-clockwise seen from above', () => {
    show(stateAt({ playing: true }));
    for (const id of MOTOR_PART_IDS) {
      const sweep = bladeTipSweep(id);
      const clockwise = MOTOR_SPIN[id] === 'clockwise';
      expect(Math.abs(sweep.z)).toBeGreaterThan(0.01);
      expect(sweep.z > 0).toBe(clockwise);
      expect(Math.abs(sweep.y)).toBeLessThan(1e-6);
    }
    expect(MOTOR_SPIN.motorRearRight).toBe('clockwise');
    expect(MOTOR_SPIN.motorFrontLeft).toBe('clockwise');
    expect(MOTOR_SPIN.motorFrontRight).toBe('counterClockwise');
    expect(MOTOR_SPIN.motorRearLeft).toBe('counterClockwise');
  });

  it('turns the nose toward plus z for a positive heading', () => {
    show(cruising({ flight: { heading: Math.PI / 2 } }));
    const centre = worldOf(assembly.anchor('drone'));
    const nose = worldOf(label('camera'));
    expect(nose.z).toBeGreaterThan(centre.z + 1);
    expect(Math.abs(nose.x - centre.x)).toBeLessThan(0.3);
  });

  it('pitches the nose down and banks the right side down for positive pitch and roll', () => {
    show(cruising());
    const level = worldOf(label('camera')).y;
    show(cruising({ flight: { pitch: 0.4 } }));
    expect(worldOf(label('camera')).y).toBeLessThan(level - 0.3);
    show(cruising({ flight: { roll: 0.4 } }));
    const right = worldOf(label('motorFrontRight'));
    const left = worldOf(label('motorFrontLeft'));
    expect(right.y).toBeLessThan(left.y - 0.8);
  });

  it('looks along the heading plus the camera tilt from the camera anchor', () => {
    show(cruising());
    const camera = assembly.anchor('camera');
    const forward = new Vector3(1, 0, 0).applyQuaternion(
      camera.getWorldQuaternion(new Quaternion()),
    );
    expect(forward.x).toBeCloseTo(Math.cos(DRONE.cameraTilt), 3);
    expect(forward.y).toBeCloseTo(Math.sin(DRONE.cameraTilt), 3);
  });

  it('draws the links only while the view shows them and the drone is armed', () => {
    show(cruising());
    expect(isShown(label('controlLink'))).toBe(true);
    expect(isShown(label('videoLink'))).toBe(true);
    show(cruising({ view: { links: false } }));
    expect(isShown(label('controlLink'))).toBe(false);
    expect(isShown(label('videoLink'))).toBe(false);
    show(stateAt({ flight: { armed: false } }));
    expect(isShown(label('controlLink'))).toBe(false);
  });

  it('puts the link labels on their beams between the station and the drone', () => {
    show(cruising());
    const station = worldOf(assembly.anchor('station'));
    const drone = worldOf(assembly.anchor('drone'));
    const onBeam = worldOf(label('controlLink'));
    const total = station.distanceTo(drone);
    expect(onBeam.distanceTo(station) + onBeam.distanceTo(drone)).toBeCloseTo(total, -1);
    expect(onBeam.y).toBeGreaterThan(1);
    expect(onBeam.y).toBeLessThan(CRUISE[1]);
  });

  it('shows the spin arrows only while the view asks for them', () => {
    show(stateAt({ view: { arrows: true } }));
    expect(isShown(label('spinArrows'))).toBe(true);
    show(stateAt({ view: { arrows: false } }));
    expect(isShown(label('spinArrows'))).toBe(false);
  });

  it('swaps the camera and antenna look with the video system', () => {
    const visibleMeshes = (id: PartId) => {
      let count = 0;
      assembly.root.traverse((object) => {
        if (!(object instanceof Mesh) || !isShown(object)) return;
        if (materials.groupOf(object.material as Material) === id) count += 1;
      });
      return count;
    };
    show(stateAt({ video: 'analogue' }));
    const analogue = visibleMeshes('camera') + visibleMeshes('videoAntenna');
    show(stateAt({ video: 'digital' }));
    const digital = visibleMeshes('camera') + visibleMeshes('videoAntenna');
    expect(analogue).toBeGreaterThan(0);
    expect(digital).toBe(analogue);
    expect(isShown(label('camera'))).toBe(true);
  });

  it('keeps the world anchors at the station, the pad and the crossroads', () => {
    show(stateAt());
    const station = worldOf(assembly.anchor('station'));
    expect(station.distanceTo(new Vector3(...STATION))).toBeLessThan(4);
    expect(worldOf(label('groundStation')).y).toBeGreaterThan(1);
    const crossroads = worldOf(assembly.anchor('crossroads'));
    expect(crossroads.x).toBeCloseTo(CROSSROADS[0]);
    expect(crossroads.z).toBeCloseTo(CROSSROADS[2]);
    const pad = worldOf(label('launchPad'));
    expect(pad.distanceTo(new Vector3(...PAD))).toBeLessThan(3);
  });

  it('moves on its own only while playing', () => {
    show(stateAt());
    expect(assembly.update(FRAME, 60)).toBe(false);
    show(stateAt({ playing: true }));
    expect(assembly.update(FRAME, 60)).toBe(true);
  });

  it('keeps the sky, the field and the trees out of the highlight', () => {
    const backdrop: Mesh[] = [];
    assembly.root.traverse((object) => {
      if (!(object instanceof Mesh)) return;
      if (materials.groupOf(object.material as Material) === UNDIMMED_GROUP) backdrop.push(object);
    });
    expect(backdrop.length).toBeGreaterThanOrEqual(3);
  });

  it('stays within the triangle budgets for the drone and the world', () => {
    show(cruising());
    const drone = shownTriangles(assembly.anchor('drone'));
    const whole = shownTriangles(assembly.root);
    expect(drone).toBeLessThan(TRIANGLE_BUDGET.drone);
    expect(whole - drone).toBeLessThan(TRIANGLE_BUDGET.world);
  });

  it('compiles every hidden material once when warming up', () => {
    show(stateAt({ video: 'analogue' }));
    const compiled: Object3D[] = [];
    assembly.warmUp((object) => compiled.push(object));
    const seen = new Set(compiled.map((object) => (object as Mesh).material));
    expect(compiled.length).toBeGreaterThan(2);
    expect(seen.size).toBe(compiled.length);
    expect(compiled.every((object) => !isShown(object))).toBe(true);
  });

  it('frees its resources on dispose', () => {
    const extra = new FpvAssembly({ materials, textures }, stateAt());
    expect(() => extra.dispose()).not.toThrow();
    expect(extra.root.parent).toBeNull();
  });
});
