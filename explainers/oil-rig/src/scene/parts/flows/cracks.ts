import { Group, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { CRACKS } from '../../constants';
import { MeshBuilder } from '../../geometry/meshBuilder';
import { seededRandom } from '../../geometry/random';
import { partMesh } from '../context';
import type { PartContext } from '../context';

export interface CrackPath {
  side: 1 | -1;
  points: readonly Vector2[];
}

const SPREAD = Math.PI * 0.8;
const BRANCH_TURN = 0.7;
const BRANCH_LENGTH_SHARE = 0.45;
const SIDES = [1, -1] as const;

function walk(start: Vector2, angle: number, length: number, random: () => number): Vector2[] {
  const points = [start.clone()];
  const step = length / CRACKS.segments;
  let heading = angle;
  for (let index = 0; index < CRACKS.segments; index++) {
    heading += (random() - 1 / 2) * CRACKS.jitter;
    const last = points[points.length - 1];
    points.push(new Vector2(last.x + step * Math.cos(heading), last.y + step * Math.sin(heading)));
  }
  return points;
}

export function crackPaths(): CrackPath[] {
  const random = seededRandom(CRACKS.seed);
  const [shortest, longest] = CRACKS.length;
  const paths: CrackPath[] = [];
  for (let index = 0; index < CRACKS.count; index++) {
    const side = SIDES[index % SIDES.length];
    const angle = (side > 0 ? 0 : Math.PI) + (random() - 1 / 2) * SPREAD;
    const trunk = walk(
      new Vector2(0, 0),
      angle,
      shortest + random() * (longest - shortest),
      random,
    );
    paths.push({ side, points: trunk });
    if (random() < CRACKS.branchShare) {
      const fork = trunk[Math.floor(trunk.length / 2)];
      const turn = angle + (random() > 1 / 2 ? 1 : -1) * BRANCH_TURN;
      paths.push({ side, points: walk(fork, turn, longest * BRANCH_LENGTH_SHARE, random) });
    }
  }
  return paths;
}

function ribbon(builder: MeshBuilder, points: readonly Vector2[]): void {
  const normal = [0, 0, 1] as const;
  let previous: [number, number] | null = null;
  points.forEach((point, index) => {
    const next = points[Math.min(index + 1, points.length - 1)];
    const before = points[Math.max(index - 1, 0)];
    const direction = new Vector2().subVectors(next, before).normalize();
    const width = (CRACKS.width / 2) * (1 - index / (points.length - 1));
    const across = new Vector2(-direction.y, direction.x).multiplyScalar(width);
    const left = builder.vertex([point.x + across.x, point.y + across.y, CRACKS.lift], normal);
    const right = builder.vertex([point.x - across.x, point.y - across.y, CRACKS.lift], normal);
    if (previous) builder.quad(previous[1], right, left, previous[0]);
    previous = [left, right];
  });
}

function sideGeometry(paths: readonly CrackPath[], side: 1 | -1): BufferGeometry {
  const builder = new MeshBuilder();
  paths.filter((path) => path.side === side).forEach((path) => ribbon(builder, path.points));
  return builder.build();
}

export class CracksPart {
  readonly object = new Group();
  readonly paths: CrackPath[];
  private readonly sides = new Map<1 | -1, Group>(SIDES.map((side) => [side, new Group()]));

  constructor(context: PartContext) {
    this.paths = crackPaths();
    this.sides.forEach((group, side) => {
      group.add(partMesh(context, sideGeometry(this.paths, side), 'annulus', 'crack'));
      this.object.add(group);
    });
    this.object.visible = false;
  }

  place(y: number, holeRadius: number): void {
    this.object.position.y = y;
    this.sides.forEach((group, side) => (group.position.x = side * holeRadius));
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
  }
}
