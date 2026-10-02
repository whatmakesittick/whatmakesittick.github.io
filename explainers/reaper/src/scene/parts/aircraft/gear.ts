import { Group, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { clamp, lerp } from '@core/math';
import { AIRCRAFT, AIRCRAFT_LAYOUT } from '../../../model/layout';
import { FUSELAGE, GEAR } from '../../constants';
import { FINISHES } from '../../finishes';
import type { Vec3 } from '../../geometry/airfoilSurface';
import { loftPatch, sectionCurve, sectionPoint } from '../../geometry/loft';
import { hubGeometry, rod, tyreGeometry } from '../../geometry/rods';
import type { TyreShape } from '../../geometry/rods';
import { partMesh } from '../context';
import type { PartContext } from '../context';

type Side = 1 | -1;

const BOTTOM = -Math.PI / 2;
const STRUT_SEGMENTS = 12;
const IDENTITY = new Quaternion();

interface Door {
  hinge: Group;
  swing: number;
}

interface MainLeg {
  pivot: Group;
  stowed: Quaternion;
}

function tyreShape(radius: number, width: number): TyreShape {
  return { radius, width, hubShare: GEAR.hubShare, segments: GEAR.wheelSegments };
}

function wheel(context: PartContext, shape: TyreShape, at: Vec3): Group {
  const group = new Group();
  group.position.set(...at);
  group.add(
    partMesh(context, tyreGeometry(shape), 'landingGear', FINISHES.tyre),
    partMesh(context, hubGeometry(shape), 'landingGear', FINISHES.hub),
  );
  return group;
}

function strut(
  context: PartContext,
  axle: Vec3,
  strutRadius: number,
  oleoRadius: number,
  oleoShare: number,
): Group {
  const group = new Group();
  const knee: Vec3 = [axle[0] * oleoShare, axle[1] * oleoShare, axle[2] * oleoShare];
  group.add(
    partMesh(
      context,
      rod([0, 0, 0], knee, oleoRadius, STRUT_SEGMENTS),
      'landingGear',
      FINISHES.strut,
    ),
    partMesh(context, rod(knee, axle, strutRadius, STRUT_SEGMENTS), 'landingGear', FINISHES.chrome),
  );
  return group;
}

function hingePoint(x: number, angle: number): Vec3 {
  const section = sectionCurve(FUSELAGE.sections)(x);
  return sectionPoint(section, angle, FUSELAGE.squareness);
}

function doorAngles(from: number, to: number): { side: Side; angles: [number, number] }[] {
  return [
    { side: 1, angles: [BOTTOM + from, BOTTOM + to] },
    { side: -1, angles: [BOTTOM - to, BOTTOM - from] },
  ];
}

export class GearPart {
  readonly object = new Group();
  readonly mainWheel: Object3D;
  private readonly nose = new Group();
  private readonly mains: MainLeg[] = [];
  private readonly doors: Door[] = [];
  private readonly wells = new Group();

  constructor(context: PartContext) {
    this.buildNose(context);
    this.mainWheel = this.buildMains(context);
    this.buildDoors(context, GEAR.nose.doors);
    this.buildDoors(context, GEAR.main.doors);
    this.object.add(this.nose, this.wells, ...this.mains.map((leg) => leg.pivot));
  }

  set(extension: number, cutaway: boolean): void {
    const gear = clamp(extension, 0, 1);
    const retract = 1 - gear;
    const out = gear > GEAR.shown;
    const shown = out || cutaway;
    this.nose.rotation.z = GEAR.nose.stowAngle * retract;
    this.nose.visible = shown;
    for (const leg of this.mains) {
      leg.pivot.quaternion.copy(IDENTITY).slerp(leg.stowed, retract);
      leg.pivot.visible = shown;
    }
    const open = clamp(gear / GEAR.doorOpenShare, 0, 1);
    for (const door of this.doors) door.hinge.rotation.x = door.swing * open;
    this.wells.visible = out;
  }

  private buildNose(context: PartContext): void {
    const { pivot, wheelRadius, wheelWidth, strutRadius, oleoRadius, oleoShare } = GEAR.nose;
    this.nose.position.set(...pivot);
    const axle: Vec3 = [0, -AIRCRAFT.restHeight + wheelRadius - pivot[1], 0];
    this.nose.add(
      strut(context, axle, strutRadius, oleoRadius, oleoShare),
      wheel(context, tyreShape(wheelRadius, wheelWidth), axle),
    );
  }

  private buildMains(context: PartContext): Object3D {
    const { pivot, wheelRadius, wheelWidth, strutRadius, oleoRadius, oleoShare, stow } = GEAR.main;
    const contact = AIRCRAFT_LAYOUT.mainGear;
    let rightWheel: Object3D | null = null;
    for (const side of [1, -1] as const) {
      const leg = new Group();
      leg.position.set(pivot[0], pivot[1], side * pivot[2]);
      const axle: Vec3 = [
        contact[0] - pivot[0],
        -AIRCRAFT.restHeight + wheelRadius - pivot[1],
        side * (contact[2] - pivot[2]),
      ];
      const tyre = wheel(context, tyreShape(wheelRadius, wheelWidth), axle);
      leg.add(strut(context, axle, strutRadius, oleoRadius, oleoShare), tyre);
      const from = new Vector3(...axle).normalize();
      const to = new Vector3(stow[0], stow[1], side * stow[2]).normalize();
      this.mains.push({ pivot: leg, stowed: new Quaternion().setFromUnitVectors(from, to) });
      if (side === 1) rightWheel = tyre;
    }
    if (!rightWheel) throw new Error('The right main wheel is missing');
    return rightWheel;
  }

  private buildDoors(
    context: PartContext,
    doors: { x: readonly [number, number]; from: number; to: number },
  ): void {
    const middle = lerp(doors.x[0], doors.x[1], 0.5);
    for (const { side, angles } of doorAngles(doors.from, doors.to)) {
      const outer = side === 1 ? angles[1] : angles[0];
      const hingeAt = hingePoint(middle, outer);
      const hinge = new Group();
      hinge.position.set(...hingeAt);
      const door = this.patch(doors.x, angles, GEAR.doorInflate);
      door.translate(-hingeAt[0], -hingeAt[1], -hingeAt[2]);
      hinge.add(partMesh(context, door, 'landingGear', FINISHES.door));
      this.doors.push({ hinge, swing: -side * GEAR.doorSwing });
      this.object.add(hinge);
      this.wells.add(
        partMesh(
          context,
          this.patch(doors.x, angles, GEAR.wellInflate),
          'landingGear',
          FINISHES.well,
        ),
      );
    }
  }

  private patch(
    x: readonly [number, number],
    angle: [number, number],
    inflate: number,
  ): BufferGeometry {
    return loftPatch(FUSELAGE.sections, FUSELAGE.squareness, {
      x,
      angle,
      samples: GEAR.doorSamples,
      inflate,
    });
  }
}
