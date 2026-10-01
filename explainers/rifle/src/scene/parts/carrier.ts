import { CapsuleGeometry, Group } from 'three';
import { CARRIER, CHARGING_HANDLE, GAS_CYLINDER, PISTON } from '../../model/layout';
import { BEVELS, CARRIER_SHAPE, CHARGING_KNOB, PISTON_SHAPE, SEGMENTS } from '../constants';
import { FINISHES } from '../finishes';
import { boxPiece, piece, sectionPiece, solid } from '../geometry/pieces';
import { arcPoints } from '../geometry/section';
import type { Section, SectionPoint } from '../geometry/section';
import { turnStrands } from '../geometry/turned';
import type { TurnPoint, TurnStrand } from '../geometry/turned';
import { addPiece, markDynamic } from './context';
import type { PartContext } from './context';

const ARC_STEPS = 8;
const QUARTER_TURN = Math.PI / 2;
const CAP_SEGMENTS = 6;

const TOP = CARRIER.y[1];

function bodyRim(): SectionPoint[] {
  const { bottom, halfWidth, corner, lower } = CARRIER_SHAPE.body;
  const top = TOP;
  return [
    [0, top],
    ...arcPoints([-halfWidth + corner, top - corner], corner, QUARTER_TURN, Math.PI, ARC_STEPS),
    ...arcPoints([-halfWidth + lower, bottom + lower], lower, Math.PI, 3 * QUARTER_TURN, ARC_STEPS),
    [0, bottom],
  ];
}

function bodySection(withBore: boolean): Section {
  const { springBore } = CARRIER_SHAPE;
  return {
    rim: bodyRim(),
    bores: withBore ? [{ y: springBore.y, radius: springBore.radius }] : [],
  };
}

function ridgeSection(): Section {
  const { bottom, halfWidth, corner } = CARRIER_SHAPE.ridge;
  const top = TOP;
  return {
    rim: [
      [0, top],
      ...arcPoints([-halfWidth + corner, top - corner], corner, QUARTER_TURN, Math.PI, ARC_STEPS),
      [-halfWidth, bottom],
      [0, bottom],
    ],
  };
}

function edges(points: readonly TurnPoint[]): TurnStrand[] {
  return points.slice(0, -1).map((point, index) => [point, points[index + 1]]);
}

function rodStrands(): TurnStrand[] {
  const start = PISTON_SHAPE.rodStart;
  const headRear = PISTON.headFrontX - PISTON.headLength;
  return edges([
    [start, 0],
    [start, PISTON.rodRadius],
    [headRear, PISTON.rodRadius],
  ]);
}

function headStrands(): TurnStrand[] {
  const front = PISTON.headFrontX;
  const rearX = front - PISTON.headLength;
  const outer = PISTON.headRadius;
  const { grooves, grooveDepth, grooveWidth, chamfer } = PISTON_SHAPE;
  const groovePoints = [...grooves]
    .sort((a, b) => b - a)
    .flatMap((offset): TurnPoint[] => {
      const start = front - offset - grooveWidth / 2;
      const end = start + grooveWidth;
      return [
        [start, outer],
        [start, outer - grooveDepth],
        [end, outer - grooveDepth],
        [end, outer],
      ];
    });
  return edges([
    [rearX, PISTON.rodRadius],
    [rearX, outer],
    ...groovePoints,
    [front - chamfer, outer],
    [front, outer - chamfer],
    [front, 0],
  ]);
}

function addChargingHandle(context: PartContext, parent: Group): void {
  const { radius, length, arm } = CHARGING_KNOB;
  const centreX = (CHARGING_HANDLE.x[0] + CHARGING_HANDLE.x[1]) / 2;
  const centreY = (CHARGING_HANDLE.y[0] + CHARGING_HANDLE.y[1]) / 2;
  const outer = CHARGING_HANDLE.z[1];
  const knobLength = length + 2 * radius;
  const knob = new CapsuleGeometry(radius, length, CAP_SEGMENTS, SEGMENTS.knob);
  knob.rotateX(QUARTER_TURN).translate(centreX, centreY, outer - knobLength / 2);
  const look = context.looks.bright;
  addPiece(context, parent, piece(knob), 'chargingHandle', look, FINISHES.ghost);
  addPiece(
    context,
    parent,
    boxPiece(
      {
        x: [centreX - radius * 0.6, centreX + radius * 0.6],
        y: arm.y,
        z: [CHARGING_HANDLE.z[0] - 2, outer - knobLength / 2],
      },
      BEVELS.round,
    ),
    'chargingHandle',
    look,
    FINISHES.ghost,
  );
}

export class CarrierPart {
  readonly object = new Group();

  constructor(context: PartContext) {
    const look = context.looks.bright;
    const { body, ridge, springBore } = CARRIER_SHAPE;
    const add = (section: Section, x: readonly [number, number]) =>
      addPiece(context, this.object, sectionPiece(section, x, BEVELS.carrier), 'carrier', look);
    add(bodySection(true), [body.x[0], springBore.end]);
    add(bodySection(false), [springBore.end, body.x[1]]);
    add(ridgeSection(), ridge.x);
    const axis = GAS_CYLINDER.axisY;
    const rod = turnStrands(rodStrands(), SEGMENTS.rod).translate(0, axis, 0);
    const head = turnStrands(headStrands(), SEGMENTS.tube).translate(0, axis, 0);
    addPiece(context, this.object, solid(rod), 'pistonRod', look);
    addPiece(context, this.object, solid(head), 'pistonHead', look);
    addChargingHandle(context, this.object);
    markDynamic(this.object);
  }

  set(carrier: number): void {
    this.object.position.x = -carrier;
  }
}
