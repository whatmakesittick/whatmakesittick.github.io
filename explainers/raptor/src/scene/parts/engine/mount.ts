import {
  CylinderGeometry,
  ExtrudeGeometry,
  Group,
  Quaternion,
  Shape,
  SphereGeometry,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, Mesh, Object3D, Matrix4 } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ACTUATORS, GIMBAL } from '../../../model';
import type { Point, Strut } from '../../../model';
import { ACTUATOR, MOUNT, SEGMENTS, SOCKET_OUTLINE } from '../../constants';
import { smoothStrand } from '../../geometry/profile';
import { revolveShell } from '../../geometry/revolve';
import { tubeAlong } from '../../geometry/tube';
import { partMesh, shellMeshes } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

const DOWN = new Vector3(0, -1, 0);
const ROD_OVERLAP = 0.8;
const SOCKET_SAMPLES = 24;
const BRACKET_SURFACE_RADIUS = 19;

export function notchedDisc(
  radius: number,
  notchCentre: number,
  notchRadius: number,
  steps: number,
): Vector2[] {
  const centres = [notchCentre, -notchCentre];
  return Array.from({ length: steps }, (_, index) => {
    const angle = (index / steps) * Math.PI * 2;
    const direction = new Vector2(Math.cos(angle), Math.sin(angle));
    const reach = centres.reduce((nearest, centre) => {
      const along = direction.x * centre;
      const clearance = along * along - (centre * centre - notchRadius * notchRadius);
      if (along <= 0 || clearance < 0) return nearest;
      return Math.min(nearest, along - Math.sqrt(clearance));
    }, radius);
    return direction.multiplyScalar(reach);
  });
}

function plateGeometry(): BufferGeometry {
  const shape = new Shape(
    notchedDisc(MOUNT.radius, MOUNT.notchCentre, MOUNT.notchRadius, MOUNT.outlineSteps),
  );
  const geometry = new ExtrudeGeometry(shape, {
    depth: MOUNT.top - MOUNT.bottom - MOUNT.bevel * 2,
    bevelEnabled: true,
    bevelThickness: MOUNT.bevel,
    bevelSize: MOUNT.bevel,
    bevelSegments: 2,
    curveSegments: 1,
  });
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, MOUNT.bottom + MOUNT.bevel, 0);
  return geometry;
}

export interface BoltRingSpec {
  radius: number;
  y: number;
  count: number;
  size: number;
  height: number;
}

export function boltRing(spec: BoltRingSpec, backOnly = false): BufferGeometry {
  const { radius, y, count, size, height } = spec;
  const angles = Array.from({ length: count }, (_, index) => ((index + 0.5) / count) * Math.PI * 2);
  const bolts = angles
    .filter((angle) => !backOnly || Math.cos(angle) <= 0)
    .map((angle) => {
      const bolt = new CylinderGeometry(size, size, height, 6);
      bolt.translate(radius * Math.sin(angle), y, radius * Math.cos(angle));
      return bolt;
    });
  const merged = mergeGeometries(bolts);
  bolts.forEach((bolt) => bolt.dispose());
  if (!merged) throw new Error('Cannot merge bolts');
  return merged;
}

export function addBoltRing(
  context: PartContext,
  parent: Object3D,
  spec: BoltRingSpec,
  group: EmphasisGroup,
): void {
  const { cutaway, finishes } = context;
  parent.add(
    cutaway.whole(partMesh(context, boltRing(spec), group, finishes.brightSteel)),
    cutaway.opened(partMesh(context, boltRing(spec, true), group, finishes.brightSteel)),
  );
}

function toVector([x, y, z]: Point): Vector3 {
  return new Vector3(x, y, z);
}

function bracketPath(bottom: Point): Point[] {
  const [x, y, z] = bottom;
  const reach = Math.hypot(x, z);
  const share = BRACKET_SURFACE_RADIUS / reach;
  return [
    [x * share, y + 3, z * share],
    [x * 0.8, y + 1, z * 0.8],
    [x, y, z],
  ];
}

class Actuator {
  readonly object = new Group();
  private readonly rod: Mesh;
  private readonly eye: Mesh;
  private readonly top: Vector3;
  private readonly bottom: Vector3;
  private readonly bodyLength: number;
  private readonly moved = new Vector3();
  private readonly turn = new Quaternion();

  constructor(context: PartContext, strut: Strut) {
    const { finishes } = context;
    this.top = toVector(strut.top);
    this.bottom = toVector(strut.bottom);
    this.bodyLength = this.top.distanceTo(this.bottom) * ACTUATOR.bodyShare;
    const body = new CylinderGeometry(
      ACTUATOR.bodyRadius,
      ACTUATOR.bodyRadius * 0.92,
      this.bodyLength,
      SEGMENTS.small,
    );
    body.translate(0, -this.bodyLength / 2, 0);
    const rod = new CylinderGeometry(ACTUATOR.rodRadius, ACTUATOR.rodRadius, 1, SEGMENTS.small);
    rod.translate(0, -0.5, 0);
    const eye = new SphereGeometry(ACTUATOR.eyeRadius, SEGMENTS.small, SEGMENTS.small / 2);
    const lug = new SphereGeometry(ACTUATOR.eyeRadius * 1.1, SEGMENTS.small, SEGMENTS.small / 2);
    this.rod = partMesh(context, rod, 'actuators', finishes.brightSteel);
    this.eye = partMesh(context, eye, 'actuators', finishes.steel);
    this.object.add(
      partMesh(context, body, 'actuators', finishes.coat),
      partMesh(context, lug, 'actuators', finishes.steel),
      this.rod,
      this.eye,
    );
    this.object.position.copy(this.top);
  }

  follow(engine: Matrix4): void {
    this.moved.copy(this.bottom).applyMatrix4(engine).sub(this.top);
    const length = this.moved.length();
    this.turn.setFromUnitVectors(DOWN, this.moved.normalize());
    this.object.quaternion.copy(this.turn);
    const rodStart = this.bodyLength - ROD_OVERLAP;
    this.rod.position.y = -rodStart;
    this.rod.scale.y = Math.max(0.01, length - rodStart);
    this.eye.position.y = -length;
  }
}

export class MountPart {
  readonly fixed = new Group();
  readonly hanging = new Group();
  private readonly actuators: Actuator[];

  constructor(context: PartContext) {
    const { finishes } = context;
    this.fixed.add(
      partMesh(context, plateGeometry(), 'gimbal', finishes.steel),
      partMesh(
        context,
        boltRing({
          radius: MOUNT.boltCircle,
          y: MOUNT.bottom - MOUNT.boltHeight / 2,
          count: MOUNT.boltCount,
          size: MOUNT.boltRadius,
          height: MOUNT.boltHeight,
        }),
        'gimbal',
        finishes.brightSteel,
      ),
    );
    const ball = new SphereGeometry(GIMBAL.radius, SEGMENTS.part, SEGMENTS.part / 2);
    this.hanging.add(partMesh(context, ball, 'gimbal', finishes.brightSteel));
    const socket = revolveShell(
      { outline: [{ strand: smoothStrand(SOCKET_OUTLINE, SOCKET_SAMPLES) }] },
      { segments: SEGMENTS.part },
    );
    shellMeshes(context, this.hanging, socket, 'gimbal', { outer: finishes.steel });
    for (const strut of ACTUATORS) {
      const bracket = tubeAlong(bracketPath(strut.bottom), {
        radius: ACTUATOR.bracketRadius,
        samples: 12,
        radial: SEGMENTS.small,
      });
      this.hanging.add(partMesh(context, bracket, 'actuators', finishes.coat));
    }
    this.actuators = ACTUATORS.map((strut) => new Actuator(context, strut));
    this.actuators.forEach((actuator) => this.fixed.add(actuator.object));
  }

  follow(engine: Object3D): void {
    engine.updateMatrix();
    this.actuators.forEach((actuator) => actuator.follow(engine.matrix));
  }
}
