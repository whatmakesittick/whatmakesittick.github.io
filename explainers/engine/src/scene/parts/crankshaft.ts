import { Group, Object3D, Shape, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { crankPinAngle, toRadians } from '../../model';
import { CRANK, FLYWHEEL, ROD } from '../constants';
import { extrudeBetween } from '../geometry/prism';
import { axialCylinder } from '../geometry/primitives';
import { arcPoints } from '../geometry/profiles';
import { PLANE_FRAME } from '../layout';
import type { CylinderPlacement } from '../layout';
import { hasOpenFront, partMesh, sharedMesh } from './context';
import type { PartContext } from './context';
import { createFlywheel } from './flywheel';

export interface CrankshaftPart {
  object: Group;
  labelAnchor: Object3D;
  flywheelAnchor: Object3D;
  setAngle(engineAngle: number): void;
}

interface JournalSpan {
  start: number;
  end: number;
}

function webOffset(): number {
  return ROD.width / 2 + CRANK.throwGap + CRANK.webThickness / 2;
}

function throwHalfLength(): number {
  return ROD.width / 2 + CRANK.throwGap + CRANK.webThickness;
}

function webOutline(crankRadius: number): Vector2[] {
  const halfAngle = toRadians(CRANK.counterweightHalfAngleDegrees);
  const bottom = -Math.PI / 2;
  const counterweight = arcPoints(
    new Vector2(0, 0),
    CRANK.counterweightRadius,
    bottom - halfAngle,
    bottom + halfAngle,
  );
  const boss = arcPoints(new Vector2(0, crankRadius), CRANK.webPinBossRadius, 0, Math.PI);
  return [...counterweight, ...boss];
}

function webGeometry(crankRadius: number): BufferGeometry {
  const half = CRANK.webThickness / 2;
  return extrudeBetween(new Shape(webOutline(crankRadius)), PLANE_FRAME, -half, half, {
    bevel: CRANK.bevel,
  });
}

function journalSpans(context: PartContext): JournalSpan[] {
  const half = throwHalfLength();
  const length = context.layout.halfLength;
  const throws = context.layout.cylinders.map((placement) => placement.z).sort((a, b) => a - b);
  const rear = -length - FLYWHEEL.gap;
  const lastThrow = throws[throws.length - 1] + half;
  const front = hasOpenFront(context) ? lastThrow + CRANK.openFrontStub : length + CRANK.noseLength;
  const edges = [rear, ...throws.flatMap((z) => [z - half, z + half]), front];
  const spans: JournalSpan[] = [];
  for (let index = 0; index < edges.length; index += 2) {
    spans.push({ start: edges[index], end: edges[index + 1] });
  }
  return spans;
}

function throwGroup(
  context: PartContext,
  placement: CylinderPlacement,
  web: BufferGeometry,
  pin: BufferGeometry,
): Group {
  const group = new Group();
  group.position.z = placement.z;
  group.rotation.z = -toRadians(crankPinAngle(placement.slot));
  [-1, 1].forEach((side) => {
    const mesh = sharedMesh(context, web, 'crankshaft', 'forged');
    mesh.position.z = side * webOffset();
    group.add(mesh);
  });
  const pinMesh = sharedMesh(context, pin, 'crankshaft', 'polished');
  pinMesh.position.y = context.dims.geometry.crankRadius;
  group.add(pinMesh);
  return group;
}

function staticAnchor(parent: Group, x: number, y: number, z: number): Object3D {
  const anchor = new Object3D();
  anchor.position.set(x, y, z);
  parent.add(anchor);
  return anchor;
}

function addJournals(context: PartContext, rotor: Group): JournalSpan[] {
  const spans = journalSpans(context);
  spans.forEach(({ start, end }) => {
    const mesh = partMesh(
      context,
      axialCylinder(CRANK.mainJournalRadius, end - start),
      'crankshaft',
      'forged',
    );
    mesh.position.z = (start + end) / 2;
    rotor.add(mesh);
  });
  return spans;
}

export function createCrankshaft(context: PartContext): CrankshaftPart {
  const object = new Group();
  const rotor = new Group();
  object.add(rotor);
  const crankRadius = context.dims.geometry.crankRadius;
  const web = context.tracker.track(webGeometry(crankRadius));
  const pinLength = ROD.width + 2 * CRANK.throwGap;
  const pin = context.tracker.track(axialCylinder(CRANK.pinRadius, pinLength));
  context.layout.cylinders.forEach((placement) => {
    rotor.add(throwGroup(context, placement, web, pin));
  });
  const spans = addJournals(context, rotor);
  const flywheelZ = -context.layout.halfLength - FLYWHEEL.gap - FLYWHEEL.thickness / 2;
  const flywheel = createFlywheel(context, flywheelZ);
  rotor.add(flywheel.object);
  const front = spans[spans.length - 1];
  const rimOffset = FLYWHEEL.radius * Math.SQRT1_2;
  return {
    object,
    labelAnchor: staticAnchor(object, -CRANK.mainJournalRadius, 0, (front.start + front.end) / 2),
    flywheelAnchor: staticAnchor(object, rimOffset, rimOffset, flywheelZ),
    setAngle: (engineAngle) => {
      rotor.rotation.z = -toRadians(engineAngle);
    },
  };
}
