import type { LineSegments } from 'three';
import { FULL_TURN } from '@core/math';
import { SIDE_SIGNS } from '../../../../../model';
import type { PartContext } from '../../../context';
import { GHOST_LINE } from '../finishes';
import { lineSegments, polyline } from '../geometry/lines';
import type { Point3 } from '../geometry/lines';
import { NOSE_TIPS, bodySection, bodyStations } from './bodyShape';
import type { NoseTip } from './bodyShape';
import {
  BODY,
  DOOR,
  HEADLIGHT,
  LOFT,
  NOSE,
  OUTER_SIDE,
  PROFILE_LINES,
  WINDOW_BAND,
  WINDSCREEN,
} from './constants';
import type { NoseMark } from './constants';
import type { CarSpan } from './layout';
import { halfRing, halfWidthAt, noseSection, sectionPoint } from './section';

const UNMIRRORED = 1;

function sidePoint(x: number, y: number, side: number): Point3 {
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
  const points = Array.from({ length: mark.segments }, (_, index): Point3 => {
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
    ...noseMark(tip, WINDSCREEN, UNMIRRORED),
    ...SIDE_SIGNS.flatMap((side) => noseMark(tip, HEADLIGHT, side)),
  ];
}

function profileLine(theta: number): number[] {
  return polyline(
    bodyStations().map((x): Point3 => {
      const [z, y] = sectionPoint(bodySection(x), theta);
      return [x, y, OUTER_SIDE * z];
    }),
  );
}

function carOutline(car: CarSpan): number[] {
  return [
    ...joints(car),
    ...windowBand(car, OUTER_SIDE),
    ...doorCentres(car).flatMap((centre) => door(centre, OUTER_SIDE)),
  ];
}

export function outlinePositions(cars: readonly CarSpan[]): number[] {
  return [
    ...cars.flatMap(carOutline),
    ...NOSE_TIPS.flatMap(noseMarks),
    ...PROFILE_LINES.flatMap(profileLine),
  ];
}

export function ghostOutline(context: PartContext, cars: readonly CarSpan[]): LineSegments {
  const look = { ...GHOST_LINE, depthWrite: false };
  const outline = lineSegments(context, 'ghostTrain', outlinePositions(cars), look);
  outline.name = 'ghostTrainOutline';
  return outline;
}
