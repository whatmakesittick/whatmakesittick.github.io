import type { Group } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import type { Extent } from '@core/scene/regions';
import { ROOM_WALL_X, legsFor } from '../../../model';
import { FINISHES } from '../../finishes';
import { INNER_WALL, ROOF_GIRDER, ROOF_GIRDER_TOP_Y } from '../campus/constants';
import { PIPE_R } from '../campus/pipeKit';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { instances } from './instances';
import { along, openBox, runMatrix } from './shapes';

const CHANNEL_M = 0.041;
const MERGE_M = 0.2;
const HANGER_GAP_M = 1.8;
const BRACE_PITCH_M = 2.4;

export const BRACE_Z = 0.15;
export const CHANNEL_Y = ROOF_GIRDER_TOP_Y - ROOF_GIRDER.depth - CHANNEL_M;

const RUN: Extent = [ROOM_WALL_X, INNER_WALL.east];
const WALL_PIPE = {
  x: INNER_WALL.east - 0.05 - PIPE_R,
  z: legsFor('air', 'release')[0].points[0][2],
};

function runOf(z: number): Extent {
  const blocked = Math.abs(z - WALL_PIPE.z) < PIPE_R + CHANNEL_M;
  return blocked ? [RUN[0], WALL_PIPE.x - PIPE_R] : RUN;
}

export const BRACE_X: readonly number[] = Array.from(
  { length: Math.floor((RUN[1] - RUN[0]) / BRACE_PITCH_M) },
  (_, index) => RUN[0] + (index + 0.5) * BRACE_PITCH_M,
);

export interface CeilingGrid {
  lines: readonly number[];
  hangers(from: number, to: number): number[];
}

export function ceilingGrid(lines: readonly number[], lamps: readonly number[]): CeilingGrid {
  const merged = [...lines, ...lamps, -BRACE_Z, BRACE_Z]
    .sort((a, b) => a - b)
    .reduce<number[]>((kept, z) => {
      const last = kept.at(-1);
      return last !== undefined && z - last < MERGE_M ? kept : [...kept, z];
    }, []);
  const free = merged.filter((z) => !lamps.includes(z));
  return {
    lines: merged,
    hangers(from, to) {
      return free
        .filter((z) => z > Math.min(from, to) && z < Math.max(from, to))
        .reduce<number[]>((kept, z) => {
          const last = kept.at(-1);
          return last !== undefined && z - last < HANGER_GAP_M ? kept : [...kept, z];
        }, []);
    },
  };
}

export function buildCeiling(context: PartContext, parent: Group, grid: CeilingGrid): Group {
  const group = namedGroup('ceilingStruts', parent);
  const material = context.materials.get(STRUCTURE_GROUP, FINISHES.steelDark);
  const height: Extent = [CHANNEL_Y, CHANNEL_Y + CHANNEL_M];
  const inner = BRACE_Z - CHANNEL_M / 2;
  group.add(
    instances(
      context,
      openBox(['px', 'nx']),
      material,
      grid.lines.map((z) => runMatrix(runOf(z), height, along(z, CHANNEL_M))),
    ),
    instances(
      context,
      openBox(['pz', 'nz']),
      material,
      BRACE_X.map((x) => runMatrix(along(x, CHANNEL_M), height, [-inner, inner])),
    ),
  );
  return group;
}
