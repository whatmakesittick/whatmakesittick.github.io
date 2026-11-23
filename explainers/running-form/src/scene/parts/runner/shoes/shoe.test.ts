import { Matrix4, Vector3 } from 'three';
import type { BufferGeometry , Quaternion} from 'three';
import { describe, expect, it } from 'vitest';
import { PACE_IDS, SIDE_IDS } from '../../../../ids';
import { gaitAt } from '../../../../model/gait';
import { CYCLE_UNITS } from '../../../../model/timeMap';
import { BALL_PIVOT, profileSamples } from '../../../rig/shoe';
import { solveSkeleton } from '../../../rig/skeleton';
import { createFigureRig } from '../figure/createRig';
import { BendingGeometry, bendShare } from './bend';
import { UPPER, UPPER_BACK_M, UPPER_TIP_M, archAt, collarHeight, soleBottom } from './design';
import { mirrorGeometry } from './grid';
import { soleGeometry } from './sole';

const MM = 1000;
const PROFILE_TOLERANCE_MM = 0.5;
const FIT_LIMIT_MM = 4;
const COLLAR_BAND_M = 0.025;
const COLLAR_EDGE_M = 0.003;
const SCAN_STEP = 50;
const TIMEOUT_MS = 120_000;
const UNIT = new Vector3(1, 1, 1);

function positions(geometry: BufferGeometry): Vector3[] {
  const position = geometry.getAttribute('position');
  return Array.from({ length: position.count }, (_, v) =>
    new Vector3().fromBufferAttribute(position, v),
  );
}

function upperEdge(x: number, y: number, side: 1 | -1): number | null {
  const arch = archAt(x);
  const share = (y - arch.base) / arch.height;
  const width = side > 0 ? arch.span.lateral : -arch.span.medial;
  if (share < 0) return width;
  if (share > 1) return null;
  const cos = Math.pow(share, UPPER.heightExponent / 2);
  const across = Math.pow(Math.sqrt(1 - cos * cos), 2 / UPPER.sideExponent);
  return width * across + arch.ridge * (1 - across);
}

describe('road shoe', () => {
  it('lays the outsole on the rig profile the foot contact is computed on', () => {
    const { rear, fore } = profileSamples(0.01);
    [...rear, ...fore].forEach((point) =>
      expect(Math.abs(soleBottom(point.x) - point.y) * MM).toBeLessThan(PROFILE_TOLERANCE_MM),
    );
    const sole = positions(soleGeometry());
    const lowest = (x: number) =>
      Math.min(...sole.filter((p) => Math.abs(p.x - x) < 0.004).map((p) => p.y));
    [-0.03, 0.05, 0.12, 0.18].forEach((x) =>
      expect(Math.abs(lowest(x) - soleBottom(x)) * MM).toBeLessThan(2),
    );
  });

  it('bends the forefoot about the ball pivot and keeps the heel still', () => {
    const geometry = soleGeometry();
    const rest = positions(geometry);
    const bending = new BendingGeometry(geometry);
    const angle = 0.4;
    bending.bend(angle);
    const bent = positions(geometry);
    rest.forEach((point, v) => {
      const share = bendShare(point.x);
      const turned = point
        .clone()
        .sub(new Vector3(BALL_PIVOT.x, BALL_PIVOT.y, 0))
        .applyAxisAngle(new Vector3(0, 0, 1), share * angle)
        .add(new Vector3(BALL_PIVOT.x, BALL_PIVOT.y, 0));
      expect(bent[v].distanceTo(turned)).toBeLessThan(1e-5);
    });
  });

  it('mirrors the left shoe across the foot axis', () => {
    const right = soleGeometry();
    const left = mirrorGeometry(right);
    const a = positions(right);
    const b = positions(left);
    a.forEach((point, v) => expect(b[v].toArray()).toEqual([point.x, point.y, -point.z]));
  });

  it(
    'covers the foot below the collar in every pose of the run',
    () => {
      const rig = createFigureRig();
      const { figure } = rig;
      let worst = 0;
      PACE_IDS.forEach((pace) => {
        for (let units = 0; units < CYCLE_UNITS; units += SCAN_STEP) {
          const skeleton = solveSkeleton(gaitAt(units, { pace, stepRate: 0, arms: 'swing' }));
          rig.pose(skeleton);
          SIDE_IDS.forEach((side) => {
            const chain = skeleton.legs[side].solution.chain;
            const toLocal = new Matrix4()
              .compose(chain.ankle, chain.foot as Quaternion, UNIT)
              .invert();
            if (side === 'left') toLocal.premultiply(new Matrix4().makeScale(1, 1, -1));
            const point = new Vector3();
            for (let v = 0; v < figure.vertexCount; v++) {
              if (figure.restPositions[v * 3] < 0 !== (side === 'right')) continue;
              point
                .fromArray(figure.positions, v * 3)
                .applyMatrix4(rig.toRig)
                .applyMatrix4(toLocal);
              if (point.x < UPPER_BACK_M || point.x > UPPER_TIP_M) continue;
              const collar = collarHeight(point.x);
              if (point.y > collar - COLLAR_EDGE_M || point.y < collar - COLLAR_BAND_M) continue;
              const across = point.z >= 0 ? 1 : -1;
              const edge = upperEdge(point.x, point.y, across);
              if (edge === null) continue;
              worst = Math.max(worst, across > 0 ? point.z - edge : edge - point.z);
            }
          });
        }
      });
      expect(worst * MM).toBeLessThan(FIT_LIMIT_MM);
    },
    TIMEOUT_MS,
  );
});
