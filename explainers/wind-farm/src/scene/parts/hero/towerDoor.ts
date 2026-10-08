import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { degrees, groupMesh } from '../context';
import type { PartContext } from '../context';
import { PLINTH, towerRadiusAt } from './constants';
import { mergeParts } from '../../geometry/merge';

const DOOR = {
  facingDeg: 25,
  sillY: 1.6,
  width: 0.9,
  height: 2.2,
  proud: 0.03,
  depth: 0.12,
  frame: 0.1,
} as const;

const PLATFORM = { halfWidth: 1.05, depth: 1.55, thickness: 0.14, tuck: 0.3 } as const;
const RAIL = { post: 0.06, heights: [0.55, 1.05], bar: 0.05 } as const;
const STEPS = { count: 4, run: 0.3, inset: 0.15 } as const;

function doorFace(): BufferGeometry {
  const front = towerRadiusAt(DOOR.sillY) + DOOR.proud;
  const half = DOOR.width / 2;
  const frameHalf = half + DOOR.frame;
  const panel = box({
    minX: -half,
    maxX: half,
    minY: DOOR.sillY,
    maxY: DOOR.sillY + DOOR.height,
    minZ: front - DOOR.depth,
    maxZ: front,
  });
  const lintel = box({
    minX: -frameHalf,
    maxX: frameHalf,
    minY: DOOR.sillY + DOOR.height,
    maxY: DOOR.sillY + DOOR.height + DOOR.frame,
    minZ: front - DOOR.depth,
    maxZ: front + DOOR.proud,
  });
  const jambs = [-1, 1].map((side) =>
    box({
      minX: side < 0 ? -frameHalf : half,
      maxX: side < 0 ? -half : frameHalf,
      minY: DOOR.sillY,
      maxY: DOOR.sillY + DOOR.height,
      minZ: front - DOOR.depth,
      maxZ: front + DOOR.proud,
    }),
  );
  return mergeParts([panel, lintel, ...jambs]);
}

function platformGeometry(): BufferGeometry {
  const back = towerRadiusAt(DOOR.sillY) - PLATFORM.tuck;
  const front = back + PLATFORM.depth;
  const deck = box({
    minX: -PLATFORM.halfWidth,
    maxX: PLATFORM.halfWidth,
    minY: DOOR.sillY - PLATFORM.thickness,
    maxY: DOOR.sillY,
    minZ: back,
    maxZ: front,
  });
  const rise = (DOOR.sillY - PLINTH.topY) / STEPS.count;
  const steps = Array.from({ length: STEPS.count }, (_, index) =>
    box({
      minX: PLATFORM.halfWidth + index * STEPS.run,
      maxX: PLATFORM.halfWidth + (index + 1) * STEPS.run,
      minY: PLINTH.topY - STEPS.inset,
      maxY: DOOR.sillY - (index + 1) * rise,
      minZ: back + STEPS.inset * 2,
      maxZ: front - STEPS.inset,
    }),
  );
  return mergeParts([deck, ...steps, ...railGeometry(front)]);
}

function railGeometry(front: number): BufferGeometry[] {
  const edge = front - RAIL.post;
  const top = DOOR.sillY + RAIL.heights[RAIL.heights.length - 1];
  const postAt = (x: number, z: number) =>
    box({
      minX: x - RAIL.post / 2,
      maxX: x + RAIL.post / 2,
      minY: DOOR.sillY,
      maxY: top,
      minZ: z - RAIL.post / 2,
      maxZ: z + RAIL.post / 2,
    });
  const side = -PLATFORM.halfWidth + RAIL.post;
  const posts = [postAt(side, edge), postAt(-side, edge), postAt(side, edge - PLATFORM.depth / 2)];
  const bars = RAIL.heights.flatMap((height) => {
    const y = DOOR.sillY + height;
    return [
      box({
        minX: side,
        maxX: -side,
        minY: y - RAIL.bar,
        maxY: y,
        minZ: edge - RAIL.bar / 2,
        maxZ: edge + RAIL.bar / 2,
      }),
      box({
        minX: side - RAIL.bar / 2,
        maxX: side + RAIL.bar / 2,
        minY: y - RAIL.bar,
        maxY: y,
        minZ: edge - PLATFORM.depth + RAIL.post * 2,
        maxZ: edge,
      }),
    ];
  });
  return [...posts, ...bars];
}

export function buildTowerDoor(context: PartContext, tower: Object3D): void {
  const turn = degrees(DOOR.facingDeg);
  const door = doorFace();
  const platform = platformGeometry();
  door.rotateY(turn);
  platform.rotateY(turn);
  tower.add(
    groupMesh(context, door, 'tower', 'paintShade'),
    groupMesh(context, platform, 'tower', 'steel'),
  );
}
