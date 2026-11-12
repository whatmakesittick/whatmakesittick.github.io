import { Vector2 } from 'three';
import type { Point } from '../../../ids';
import { latheAlongX } from '@core/scene/geometry/lathe';
import { ENTRY } from './dims';
import type { Bin } from './geo';
import { bolts, circlePoints, ring } from './geo';
import type { PartContext } from '../context';
import type { Object3D } from 'three';

const LATHE_SEGMENTS = 28;
const NECK_LENGTH = 0.03;
const BOLT_RADIUS_SHARE = 0.82;

function bellows() {
  const { bellowsFrom, bellowsTo, ridges, ridgeRise, radius } = ENTRY;
  const points: Vector2[] = [];
  const step = (bellowsTo - bellowsFrom) / (ridges * 2);
  for (let index = 0; index <= ridges * 2; index += 1) {
    const rise = index % 2 === 1 ? ridgeRise : 0;
    points.push(new Vector2(radius + rise, bellowsFrom + index * step));
  }
  return latheAlongX(points, LATHE_SEGMENTS).translate(0, ENTRY.y, 0);
}

function tubeSection(from: number, to: number) {
  const profile = [new Vector2(ENTRY.radius, from), new Vector2(ENTRY.radius, to)];
  return latheAlongX(profile, LATHE_SEGMENTS).translate(0, ENTRY.y, 0);
}

export function addEntry(context: PartContext, solid: Bin, parent: Object3D): void {
  const { fromX, toX, y, radius, flangeOuter, flangeThickness, bolts: count } = ENTRY;
  solid.add('frame', tubeSection(fromX, ENTRY.bellowsFrom), tubeSection(ENTRY.bellowsTo, toX));
  solid.add('tray', bellows());
  const flangeXs = [fromX, toX - flangeThickness];
  flangeXs.forEach((x) =>
    solid.add(
      'flange',
      ring('x', [x + flangeThickness / 2, y, 0], radius, flangeOuter, flangeThickness),
    ),
  );
  [fromX + flangeThickness, ENTRY.bellowsFrom - NECK_LENGTH].forEach((x) =>
    solid.add('darkFrame', ring('x', [x, y, 0], radius, radius + 0.025, NECK_LENGTH)),
  );
  const faces = [fromX + flangeThickness, toX - flangeThickness];
  const heads: Point[] = faces.flatMap((x) =>
    circlePoints('x', [x, y, 0], flangeOuter * BOLT_RADIUS_SHARE + 0.02, count),
  );
  parent.add(bolts(context, 'illuminator', 'x', heads));
}
