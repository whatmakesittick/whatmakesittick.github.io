import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, LineSegments } from 'three';
import { SIDE_SIGNS } from '../../../../../model';
import { registeredMaterial } from '../../../context';
import type { PartContext } from '../../../context';
import { GHOST_LINE } from '../finishes';
import { NOSE_TIPS, bodySection } from './bodyShape';
import type { NoseTip } from './bodyShape';
import {
  BODY,
  DOOR,
  HEADLIGHT,
  LOFT,
  NOSE,
  OUTER_SIDE,
  WINDOW_BAND,
  WINDSCREEN,
} from './constants';
import type { NoseMark } from './constants';
import type { CarSpan } from './layout';
import { halfRing, halfWidthAt, noseSection, sectionPoint } from './section';

type Point = readonly [number, number, number];

const XYZ = 3;
const FULL_TURN = Math.PI * 2;

function polyline(points: readonly Point[], closed = false): number[] {
  const count = closed ? points.length : points.length - 1;
  return Array.from({ length: count }, (_, index) => [
    ...points[index],
    ...points[(index + 1) % points.length],
  ]).flat();
}

function sidePoint(x: number, y: number, side: number): Point {
  return [x, y, side * halfWidthAt(BODY, y)];
}

function plainEnds(car: CarSpan): number[] {
  return [...(car.nose === 'start' ? [] : [car.start]), ...(car.nose === 'end' ? [] : [car.end])];
}

function joints(car: CarSpan): number[] {
  return plainEnds(car).flatMap((x) =>
    polyline(halfRing(bodySection(x), LOFT.ring).map(([z, y]) => [x, y, OUTER_SIDE * z])),
  );
}

function doorCentres(car: CarSpan): number[] {
  return plainEnds(car).map((x) => (x === car.start ? x + DOOR.inset : x - DOOR.inset));
}

function door(centre: number, side: number): number[] {
  const rows = Array.from(
    { length: DOOR.edgeSegments + 1 },
    (_, index) => DOOR.bottom + ((DOOR.top - DOOR.bottom) * index) / DOOR.edgeSegments,
  );
  const [left, right] = [centre - DOOR.width / 2, centre + DOOR.width / 2];
  const up = rows.map((y) => sidePoint(right, y, side));
  const down = [...rows].reverse().map((y) => sidePoint(left, y, side));
  return polyline([...up, ...down], true);
}

function bandLimits(car: CarSpan): [number, number] {
  const clear = DOOR.inset + DOOR.width / 2 + WINDOW_BAND.doorClearance;
  const from = car.start + (car.nose === 'start' ? NOSE.length : clear);
  const to = car.end - (car.nose === 'end' ? NOSE.length : clear);
  return [from, to];
}

function windowBand(car: CarSpan, side: number): number[] {
  const [from, to] = bandLimits(car);
  return [WINDOW_BAND.bottom, WINDOW_BAND.top].flatMap((y) =>
    polyline([sidePoint(from, y, side), sidePoint(to, y, side)]),
  );
}

function squircle(value: number, roundness: number): number {
  return Math.sign(value) * Math.abs(value) ** (2 / roundness);
}

function noseMark(tip: NoseTip, mark: NoseMark, side: number): number[] {
  const points = Array.from({ length: mark.segments }, (_, index): Point => {
    const phi = (FULL_TURN * index) / mark.segments;
    const along = mark.centre + mark.halfLength * squircle(Math.cos(phi), mark.roundness);
    const theta = mark.theta + mark.spread * squircle(Math.sin(phi), mark.roundness);
    const distance = along * NOSE.length;
    const [z, y] = sectionPoint(noseSection(distance, NOSE, BODY), Math.abs(theta));
    return [tip.x - tip.direction * distance, y, side * Math.sign(theta) * z];
  });
  return polyline(points, true);
}

function noseMarks(tip: NoseTip): number[] {
  return [
    ...noseMark(tip, WINDSCREEN, 1),
    ...SIDE_SIGNS.flatMap((side) => noseMark(tip, HEADLIGHT, side)),
  ];
}

function carOutline(car: CarSpan): number[] {
  return [
    ...joints(car),
    ...windowBand(car, OUTER_SIDE),
    ...doorCentres(car).flatMap((centre) => door(centre, OUTER_SIDE)),
  ];
}

export function outlinePositions(cars: readonly CarSpan[]): number[] {
  return [...cars.flatMap(carOutline), ...NOSE_TIPS.flatMap(noseMarks)];
}

export function ghostOutline(context: PartContext, cars: readonly CarSpan[]): LineSegments {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(outlinePositions(cars), XYZ));
  const material = new LineBasicMaterial({ ...GHOST_LINE, transparent: true, depthWrite: false });
  const outline = new LineSegments(
    context.tracker.track(geometry),
    registeredMaterial(context, 'ghostTrain', material),
  );
  outline.name = 'ghostTrainOutline';
  return outline;
}
