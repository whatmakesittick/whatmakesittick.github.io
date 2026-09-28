import { Group } from 'three';
import type { BufferGeometry, Mesh, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { DRILL_FLOOR_Y, depthToY, tubularRadius } from '../../../model/scale';
import { RESERVOIR_FLUIDS } from '../../../model/wellPlan';
import { ANCHOR_LIFT, PERFORATIONS, SEGMENTS, WELL_TUBES } from '../../constants';
import { PAINT } from '../../finishes';
import { MeshBuilder } from '../../geometry/meshBuilder';
import type { Vec3 } from '../../geometry/meshBuilder';
import { rodGeometry } from '../../geometry/bars';
import type { Point } from '../../geometry/bars';
import { mergePainted } from '../../geometry/merge';
import { testLineRoute } from '../../geometry/testLine';
import { BACK_HALF, tubeGeometry } from '../../geometry/tubes';
import { holeAt, isCasedSection, tubeWall, wellY } from '../../geometry/wellColumn';
import { seededRandom } from '../../geometry/random';
import { partMesh } from '../context';
import type { PartContext } from '../context';

export interface Tunnel {
  y: number;
  side: 1 | -1;
  inner: number;
  outer: number;
}

const FRONT: Vec3 = [0, 0, 1];
const TIP_HALF = 0.04;
const STREAK_SPREAD = 0.5;
const TUBING_OUTER = tubularRadius(WELL_TUBES.tubingInches);
const TUBING_INNER = TUBING_OUTER - tubeWall(WELL_TUBES.tubingInches);
const LABEL_DEPTH = 3000;
const TEST_LINE_RADIUS = 0.28;
const OIL = RESERVOIR_FLUIDS.find((leg) => leg.id === 'oil') ?? RESERVOIR_FLUIDS[0];

export const TUBING_END_DEPTH = OIL.top - WELL_TUBES.tubingAboveOilM;
const PACKER_DEPTH = OIL.top - WELL_TUBES.packerAboveOilM;

function liningRadius(depth: number): number {
  const { section } = holeAt(depth);
  return tubularRadius(isCasedSection(section) ? section.casingInches : WELL_TUBES.linerInches);
}

function perforationDepths(): number[] {
  const depths: number[] = [];
  const last = OIL.bottom - PERFORATIONS.marginBottomM;
  for (let depth = OIL.top + PERFORATIONS.marginTopM; depth <= last; depth += PERFORATIONS.stepM) {
    depths.push(depth);
  }
  return depths;
}

export function tunnels(): Tunnel[] {
  return perforationDepths().flatMap((depth) =>
    ([1, -1] as const).map((side) => {
      const inner = liningRadius(depth);
      return { y: depthToY(depth), side, inner, outer: inner + PERFORATIONS.tunnel };
    }),
  );
}

function wedge(builder: MeshBuilder, from: Vec3, to: Vec3, halfWidth: number): void {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const length = Math.hypot(dx, dy);
  const [nx, ny] = [-dy / length, dx / length];
  const z = PERFORATIONS.lift;
  const a = builder.vertex([from[0] + nx * halfWidth, from[1] + ny * halfWidth, z], FRONT);
  const b = builder.vertex([from[0] - nx * halfWidth, from[1] - ny * halfWidth, z], FRONT);
  const c = builder.vertex([to[0] - nx * TIP_HALF, to[1] - ny * TIP_HALF, z], FRONT);
  const d = builder.vertex([to[0] + nx * TIP_HALF, to[1] + ny * TIP_HALF, z], FRONT);
  builder.quad(b, c, d, a);
}

function tunnelGeometry(list: Tunnel[]): BufferGeometry {
  const builder = new MeshBuilder();
  list.forEach(({ y, side, inner, outer }) => {
    wedge(builder, [side * inner, y, 0], [side * outer, y, 0], PERFORATIONS.tunnelWidth / 2);
  });
  return builder.build();
}

function streakGeometry(list: Tunnel[]): BufferGeometry {
  const builder = new MeshBuilder();
  const random = seededRandom(PERFORATIONS.seed);
  const [shortest, longest] = PERFORATIONS.streakLength;
  list
    .filter((_, index) => Math.floor(index / 2) % PERFORATIONS.streakEvery === 0)
    .forEach(({ y, side, outer }) => {
      const angle = (random() - 1 / 2) * STREAK_SPREAD;
      const length = shortest + random() * (longest - shortest);
      const far: Vec3 = [
        side * (outer + length * Math.cos(angle)),
        y + length * Math.sin(angle),
        0,
      ];
      wedge(builder, far, [side * outer, y, 0], PERFORATIONS.streakWidth / 2);
    });
  return builder.build();
}

function packerGeometry(): BufferGeometry {
  const y = depthToY(PACKER_DEPTH);
  return mergePainted([
    [
      tubeGeometry({
        outer: tubularRadius(WELL_TUBES.packerInches),
        inner: TUBING_OUTER,
        bottom: y - WELL_TUBES.packerHeight / 2,
        top: y + WELL_TUBES.packerHeight / 2,
        segments: SEGMENTS.halfTube,
        arc: BACK_HALF,
      }),
      PAINT.packer,
    ],
  ]);
}

function tubingGeometry(): BufferGeometry {
  return mergePainted([
    [
      tubeGeometry({
        outer: TUBING_OUTER,
        inner: TUBING_INNER,
        bottom: 0,
        top: 1,
        segments: SEGMENTS.halfTube,
        arc: BACK_HALF,
      }),
      PAINT.tubing,
    ],
  ]);
}

function testLineGeometry(): BufferGeometry {
  const route = testLineRoute().slice(0, -1);
  const pipes = route
    .slice(1)
    .map((point, index): readonly [BufferGeometry, string] => [
      rodGeometry(
        route[index].toArray() as Point,
        point.toArray() as Point,
        TEST_LINE_RADIUS,
        SEGMENTS.rod,
      ),
      PAINT.tubing,
    ]);
  return mergePainted(pipes);
}

export class CompletionPart {
  readonly blockObject = new Group();
  readonly tubing: Mesh;
  readonly testLine: Mesh;
  readonly anchors: { tubing: Object3D; perforations: Object3D };
  readonly tunnels: Tunnel[];

  constructor(context: PartContext) {
    this.tunnels = tunnels();
    this.tubing = partMesh(context, tubingGeometry(), 'tubing', 'tubing');
    this.tubing.frustumCulled = false;
    this.testLine = partMesh(context, testLineGeometry(), 'tubing', 'tubing');
    this.blockObject.add(
      partMesh(context, packerGeometry(), 'tubing', 'tubing'),
      partMesh(context, tunnelGeometry(this.tunnels), 'perforations', 'tunnel'),
      partMesh(context, streakGeometry(this.tunnels), 'perforations', 'streak'),
    );
    const tubingAnchor = anchorAt(this.tubing, TUBING_OUTER, 0, ANCHOR_LIFT);
    const [first] = this.tunnels;
    const perforations = anchorAt(this.blockObject, first.outer, first.y, ANCHOR_LIFT);
    this.anchors = { tubing: tubingAnchor, perforations };
  }

  place(seaOffset: number): void {
    const bottom = wellY(TUBING_END_DEPTH, seaOffset);
    this.tubing.position.y = bottom;
    this.tubing.scale.y = DRILL_FLOOR_Y - bottom;
    this.anchors.tubing.position.y = (wellY(LABEL_DEPTH, seaOffset) - bottom) / this.tubing.scale.y;
  }

  setVisible(visible: boolean): void {
    this.blockObject.visible = visible;
    this.tubing.visible = visible;
    this.testLine.visible = visible;
  }
}
