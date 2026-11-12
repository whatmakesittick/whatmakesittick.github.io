import type { Point } from '../ids';
import { LIGHT_SPEED } from './constants';
import { BEAM_WAYPOINTS, WAYPOINT_IDS } from './layout';
import type { WaypointId } from './layout';

export type Path = readonly Point[];

export interface PathPose {
  position: Point;
  direction: Point;
}

function distance(from: Point, to: Point): number {
  return Math.hypot(to[0] - from[0], to[1] - from[1], to[2] - from[2]);
}

function unit(from: Point, to: Point): Point {
  const length = distance(from, to);
  return [(to[0] - from[0]) / length, (to[1] - from[1]) / length, (to[2] - from[2]) / length];
}

export function legLengths(path: Path): number[] {
  return path.slice(1).map((point, index) => distance(path[index], point));
}

export function pathLength(path: Path): number {
  return legLengths(path).reduce((sum, length) => sum + length, 0);
}

export function pointOnPath(path: Path, share: number): PathPose {
  const lengths = legLengths(path);
  const target = Math.min(1, Math.max(0, share)) * pathLength(path);
  let travelled = 0;
  for (let leg = 0; leg < lengths.length; leg += 1) {
    const end = travelled + lengths[leg];
    if (target <= end || leg === lengths.length - 1) {
      const along = lengths[leg] === 0 ? 0 : Math.min(1, (target - travelled) / lengths[leg]);
      const [from, to] = [path[leg], path[leg + 1]];
      return {
        position: [
          from[0] + (to[0] - from[0]) * along,
          from[1] + (to[1] - from[1]) * along,
          from[2] + (to[2] - from[2]) * along,
        ],
        direction: unit(from, to),
      };
    }
    travelled = end;
  }
  return { position: path[0], direction: [0, 0, 0] };
}

function between(from: WaypointId, to: WaypointId): Path {
  const start = WAYPOINT_IDS.indexOf(from);
  const end = WAYPOINT_IDS.indexOf(to);
  return BEAM_WAYPOINTS.slice(start, end + 1).map((entry) => entry.point);
}

export const DROPLET_PATH: Path = between('nozzle', 'plasma');
export const COLLECT_PATH: Path = between('plasma', 'focus');
export const MASK_PATH: Path = between('focus', 'mask');
export const EXPOSE_PATH: Path = between('mask', 'wafer');

export function lightSeconds(path: Path): number {
  return pathLength(path) / LIGHT_SPEED;
}

function shares(path: Path): number[] {
  const lengths = legLengths(path);
  const total = pathLength(path);
  let travelled = 0;
  return lengths.map((length) => {
    travelled += length;
    return travelled / total;
  });
}

export const MASK_BOUNCE_SHARES: readonly number[] = shares(MASK_PATH);
export const EXPOSE_BOUNCE_SHARES: readonly number[] = shares(EXPOSE_PATH).slice(0, -1);
