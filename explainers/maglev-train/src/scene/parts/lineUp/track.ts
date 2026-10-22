import { BoxGeometry, Matrix4 } from 'three';
import type { Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { LINE_UP, SIDE_SIGNS } from '../../../model';
import type { PartContext } from '../context';
import type { Point2 } from '../inset/strokes';
import { ballastTexture } from './ballastTexture';
import { SLICE, WHEEL_RAIL } from './constants';
import { cutMesh, instances, sliceGeometry } from './cut';
import { LINE_UP_FINISHES } from './finishes';
import { centresAlong, trapezoid } from './layout';

const PART = 'wheelRail';
const BALLAST_COLOUR = '#b9b4ab';

const RAIL_SHAPE: readonly Point2[] = [
  [-0.075, 0],
  [0.075, 0],
  [0.075, 0.012],
  [0.014, 0.03],
  [0.0085, 0.045],
  [0.0085, 0.118],
  [0.036, 0.135],
  [0.036, 0.163],
  [0.028, 0.172],
  [-0.028, 0.172],
  [-0.036, 0.163],
  [-0.036, 0.135],
  [-0.0085, 0.118],
  [-0.0085, 0.045],
  [-0.014, 0.03],
  [-0.075, 0.012],
];

export function railOutline(centre: number): Point2[] {
  return RAIL_SHAPE.map(([a, y]): Point2 => [centre + a, WHEEL_RAIL.rail.base + y]);
}

function addBallast(context: PartContext, parent: Object3D): void {
  const { top, topHalf, slope, tile } = WHEEL_RAIL.ballast;
  const depth = top - LINE_UP.plinthTop;
  const outline = trapezoid(topHalf + depth * slope, topHalf, LINE_UP.plinthTop, top);
  const map = context.tracker.track(ballastTexture(tile));
  const side: MaterialFinish = { color: BALLAST_COLOUR, roughness: 1, metalness: 0, map };
  parent.add(cutMesh(context, sliceGeometry([outline]), PART, side, LINE_UP_FINISHES.ballastCap));
}

function sleeperXs(): number[] {
  return centresAlong(SLICE.start, SLICE.end, WHEEL_RAIL.sleeper.pitch);
}

function addSleepers(context: PartContext, parent: Object3D): void {
  const { top, height, length, width } = WHEEL_RAIL.sleeper;
  const matrices = sleeperXs().map((x) => new Matrix4().makeTranslation(x, top - height / 2, 0));
  const geometry = new BoxGeometry(width, height, length);
  parent.add(instances(context, geometry, PART, LINE_UP_FINISHES.sleeper, matrices));
}

function addClips(context: PartContext, parent: Object3D): void {
  const { width, height, length, offset } = WHEEL_RAIL.clip;
  const y = WHEEL_RAIL.sleeper.top + height / 2;
  const matrices = sleeperXs().flatMap((x) =>
    SIDE_SIGNS.flatMap((side) =>
      SIDE_SIGNS.map((edge) =>
        new Matrix4().makeTranslation(x, y, side * WHEEL_RAIL.rail.centre + edge * offset),
      ),
    ),
  );
  parent.add(
    instances(
      context,
      new BoxGeometry(length, height, width),
      PART,
      LINE_UP_FINISHES.clip,
      matrices,
    ),
  );
}

function addRails(context: PartContext, parent: Object3D): void {
  const outlines = SIDE_SIGNS.map((side) => railOutline(side * WHEEL_RAIL.rail.centre));
  const geometry = sliceGeometry(outlines);
  parent.add(
    cutMesh(context, geometry, PART, LINE_UP_FINISHES.railSteel, LINE_UP_FINISHES.railCap),
  );
}

export function buildTrack(context: PartContext, parent: Object3D): void {
  addBallast(context, parent);
  addSleepers(context, parent);
  addClips(context, parent);
  addRails(context, parent);
}
