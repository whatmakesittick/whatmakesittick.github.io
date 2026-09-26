import { BoxGeometry, Group, Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { FLYWHEEL } from '../constants';
import { extrudeBetween } from '../geometry/prism';
import { axialCylinder } from '../geometry/primitives';
import { circlePath } from '../geometry/profiles';
import { PLANE_FRAME } from '../layout';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface FlywheelPart {
  object: Group;
}

const TOOTH_ROOT_SPAN = 0.25;
const TOOTH_TIP_SPAN = 0.12;
const BOLT_SIDES = 6;
const BOLT_HEIGHT = 4;
const MARK_DEPTH = 1;
const HOLE_PHASE = 0.5;

function toothedOutline(): Vector2[] {
  const pitch = (Math.PI * 2) / FLYWHEEL.toothCount;
  const root = FLYWHEEL.radius - FLYWHEEL.toothDepth;
  const polar = (radius: number, angle: number) =>
    new Vector2(radius * Math.cos(angle), radius * Math.sin(angle));
  const points: Vector2[] = [];
  for (let tooth = 0; tooth < FLYWHEEL.toothCount; tooth++) {
    const center = tooth * pitch;
    points.push(
      polar(root, center - TOOTH_ROOT_SPAN * pitch),
      polar(FLYWHEEL.radius, center - TOOTH_TIP_SPAN * pitch),
      polar(FLYWHEEL.radius, center + TOOTH_TIP_SPAN * pitch),
      polar(root, center + TOOTH_ROOT_SPAN * pitch),
    );
  }
  return points;
}

function discGeometry(): BufferGeometry {
  const shape = new Shape(toothedOutline());
  shape.holes = Array.from({ length: FLYWHEEL.holeCount }, (_, index) => {
    const angle = (Math.PI * 2 * (index + HOLE_PHASE)) / FLYWHEEL.holeCount;
    const center = new Vector2(Math.cos(angle), Math.sin(angle)).multiplyScalar(
      FLYWHEEL.holeCircleRadius,
    );
    return circlePath(center, FLYWHEEL.holeRadius);
  });
  const half = FLYWHEEL.thickness / 2;
  return extrudeBetween(shape, PLANE_FRAME, -half, half, { bevel: FLYWHEEL.bevel });
}

function addBolts(context: PartContext, object: Group): void {
  const bolt = context.tracker.track(axialCylinder(FLYWHEEL.boltRadius, BOLT_HEIGHT, BOLT_SIDES));
  const face = FLYWHEEL.hubThickness / 2 + BOLT_HEIGHT / 2;
  for (let index = 0; index < FLYWHEEL.boltCount; index++) {
    const angle = (Math.PI * 2 * index) / FLYWHEEL.boltCount;
    const mesh = partMesh(context, bolt, 'flywheel', 'polished');
    mesh.position.set(
      Math.cos(angle) * FLYWHEEL.boltCircleRadius,
      Math.sin(angle) * FLYWHEEL.boltCircleRadius,
      face,
    );
    object.add(mesh);
  }
}

function addTimingMark(context: PartContext, object: Group): void {
  const mark = new BoxGeometry(FLYWHEEL.markWidth, FLYWHEEL.markLength, MARK_DEPTH);
  const mesh = partMesh(context, mark, 'flywheel', 'paint');
  const radius = FLYWHEEL.radius - FLYWHEEL.toothDepth - FLYWHEEL.markLength / 2 - 2;
  mesh.position.set(0, radius, FLYWHEEL.thickness / 2);
  object.add(mesh);
}

export function createFlywheel(context: PartContext, z: number): FlywheelPart {
  const object = new Group();
  object.position.z = z;
  object.add(partMesh(context, discGeometry(), 'flywheel', 'darkSteel'));
  object.add(
    partMesh(
      context,
      axialCylinder(FLYWHEEL.hubRadius, FLYWHEEL.hubThickness),
      'flywheel',
      'forged',
    ),
  );
  addBolts(context, object);
  addTimingMark(context, object);
  return { object };
}
