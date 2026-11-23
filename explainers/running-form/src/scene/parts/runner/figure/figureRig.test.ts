import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { decodeFigure } from '@core/figure';
import { FigureRig } from '@core/figure/body/figureRig';
import { toDegrees } from '@core/math';
import { ARMS_IDS, PACE_IDS, SIDE_IDS } from '../../../../ids';
import type { ArmsId, PaceId, SideId } from '../../../../ids';
import { gaitAt } from '../../../../model/gait';
import { GAIT_DATA } from '../../../../model/gaitData';
import { CYCLE_UNITS } from '../../../../model/timeMap';
import { solveSkeleton } from '../../../rig/skeleton';
import type { RunnerSkeleton } from '../../../rig/skeleton';
import { FIGURE_FROM_RUNNER } from './frame';

const { athleteData } = await import('./runner.data');
const figure = decodeFigure(athleteData);
const rig = new FigureRig(figure, FIGURE_FROM_RUNNER);
const STEP_RATES = [-10, 0, 10];
const SCAN_STEP = 10;
const MM = 1000;
const JOINT_LIMIT_MM = 10;
const BONE_LIMIT_DEG = 1.5;
const FOOT_LIMIT_DEG = 3;
const STEP_LIMIT_DEG = 1.5;
const VERTEX_STEP_LIMIT_MM = 12;
const VERTEX_ACCELERATION_LIMIT_MM = 3;
const PLANTED_DRIFT_MM = 5;
const STRAIGHT_KNEE_DEG = -1;
const TIMEOUT_MS = 600_000;
const NATURAL_LIMITS_DEG: readonly (readonly [RegExp, number])[] = [
  [/_clavicle_rx$/, 10],
  [/_clavicle_r[yz]$/, 40],
  [/_uparm_twist$/, 115],
  [/_uparm_roll$/, 45],
  [/_upleg_twist$/, 20],
  [/_lowleg_twist$/, 25],
  [/_ball_bend$/, 40],
];

interface Setup {
  readonly pace: PaceId;
  readonly stepRate: number;
  readonly arms: ArmsId;
}

const SETUPS: readonly Setup[] = PACE_IDS.flatMap((pace) =>
  STEP_RATES.flatMap((stepRate) => ARMS_IDS.map((arms) => ({ pace, stepRate, arms }))),
);

function skeletonAt(units: number, setup: Setup): RunnerSkeleton {
  return solveSkeleton(gaitAt(((units % CYCLE_UNITS) + CYCLE_UNITS) % CYCLE_UNITS, setup));
}

function joint(name: string): Vector3 {
  return new Vector3()
    .fromArray(figure.jointPositions, figure.jointIndex(name) * 3)
    .applyMatrix4(rig.toRig);
}

function prefix(side: SideId): string {
  return side === 'right' ? 'r' : 'l';
}

function bone(from: Vector3, to: Vector3): Vector3 {
  return to.clone().sub(from).normalize();
}

describe('runner figure rig', () => {
  it(
    'lands the body joints on the rig over the whole run',
    () => {
      const worst = { joint: 0, bone: 0, foot: 0 };
      SETUPS.forEach((setup) => {
        for (let units = 0; units < CYCLE_UNITS; units += SCAN_STEP) {
          const skeleton = skeletonAt(units, setup);
          figure.solveSkeleton(rig.retarget(skeleton));
          SIDE_IDS.forEach((side) => {
            const p = prefix(side);
            const arm = skeleton.arms[side];
            const leg = skeleton.legs[side];
            const pairs: [Vector3, string][] = [
              [arm.elbow, `${p}_lowarm`],
              [arm.wrist, `${p}_wrist`],
              [leg.knee, `${p}_lowleg`],
              [leg.ankle, `${p}_foot`],
            ];
            pairs.forEach(([want, name]) => {
              worst.joint = Math.max(worst.joint, want.distanceTo(joint(name)) * MM);
            });
            const bones: [Vector3, Vector3, string, string][] = [
              [arm.shoulder, arm.elbow, `${p}_uparm`, `${p}_lowarm`],
              [arm.elbow, arm.wrist, `${p}_lowarm`, `${p}_wrist`],
              [leg.hip, leg.knee, `${p}_upleg`, `${p}_lowleg`],
              [leg.knee, leg.ankle, `${p}_lowleg`, `${p}_foot`],
            ];
            bones.forEach(([a, b, ja, jb]) => {
              const angle = bone(a, b).angleTo(bone(joint(ja), joint(jb)));
              worst.bone = Math.max(worst.bone, toDegrees(angle));
            });
            const foot = bone(joint(`${p}_foot`), joint(`${p}_ball`));
            worst.foot = Math.max(worst.foot, toDegrees(foot.angleTo(leg.footAxis)));
          });
        }
      });
      expect(worst.joint).toBeLessThan(JOINT_LIMIT_MM);
      expect(worst.bone).toBeLessThan(BONE_LIMIT_DEG);
      expect(worst.foot).toBeLessThan(FOOT_LIMIT_DEG);
    },
    TIMEOUT_MS,
  );

  it(
    'keeps the collarbones, the twists and the toes in a natural range and the knees bent forward',
    () => {
      const worst = NATURAL_LIMITS_DEG.map(() => 0);
      let straightest = Infinity;
      const knees = SIDE_IDS.map((side) => figure.parameterIndex(`${prefix(side)}_knee_bend`));
      SETUPS.forEach((setup) => {
        for (let units = 0; units < CYCLE_UNITS; units += SCAN_STEP) {
          const parameters = rig.retarget(skeletonAt(units, setup));
          figure.parameterNames.forEach((name, index) => {
            const group = NATURAL_LIMITS_DEG.findIndex(([pattern]) => pattern.test(name));
            if (group >= 0)
              worst[group] = Math.max(worst[group], Math.abs(toDegrees(parameters[index])));
          });
          knees.forEach(
            (index) => (straightest = Math.min(straightest, toDegrees(parameters[index]))),
          );
        }
      });
      NATURAL_LIMITS_DEG.forEach(([, limit], group) => expect(worst[group]).toBeLessThan(limit));
      expect(straightest).toBeGreaterThan(STRAIGHT_KNEE_DEG);
    },
    TIMEOUT_MS,
  );

  it(
    'changes no parameter by a jump between neighbouring scrubber units',
    () => {
      let worst = 0;
      SETUPS.filter((setup) => setup.stepRate !== 0).forEach((setup) => {
        let previous = rig.retarget(skeletonAt(-1, setup)).slice();
        for (let units = 0; units <= CYCLE_UNITS; units++) {
          const parameters = rig.retarget(skeletonAt(units, setup)).slice();
          figure.parameterNames.forEach((name, index) => {
            if (name.startsWith('root_t')) return;
            worst = Math.max(worst, Math.abs(toDegrees(parameters[index] - previous[index])));
          });
          previous = parameters;
        }
      });
      expect(worst).toBeLessThan(STEP_LIMIT_DEG);
    },
    TIMEOUT_MS,
  );

  it(
    'moves every vertex smoothly between neighbouring scrubber units',
    () => {
      const worst = { step: 0, acceleration: 0 };
      (['easy', 'fast'] as const).forEach((pace) => {
        const frames: Float32Array[] = [];
        for (let units = -1; units <= CYCLE_UNITS; units++) {
          rig.pose(skeletonAt(units, { pace, stepRate: 0, arms: 'swing' }));
          frames.push(figure.positions.slice());
        }
        for (let i = 1; i < frames.length - 1; i++) {
          for (let v = 0; v < figure.vertexCount * 3; v += 3) {
            const d = (f: number, k: number) => frames[f][v + k];
            const step = Math.hypot(
              d(i + 1, 0) - d(i, 0),
              d(i + 1, 1) - d(i, 1),
              d(i + 1, 2) - d(i, 2),
            );
            const acceleration = Math.hypot(
              d(i + 1, 0) - 2 * d(i, 0) + d(i - 1, 0),
              d(i + 1, 1) - 2 * d(i, 1) + d(i - 1, 1),
              d(i + 1, 2) - 2 * d(i, 2) + d(i - 1, 2),
            );
            worst.step = Math.max(worst.step, step * MM);
            worst.acceleration = Math.max(worst.acceleration, acceleration * MM);
          }
        }
      });
      expect(worst.step).toBeLessThan(VERTEX_STEP_LIMIT_MM);
      expect(worst.acceleration).toBeLessThan(VERTEX_ACCELERATION_LIMIT_MM);
    },
    TIMEOUT_MS,
  );

  it('keeps the mesh foot joints on the planted rig foot through the stance', () => {
    PACE_IDS.forEach((pace) => {
      const setup = { pace, stepRate: 0, arms: 'swing' as const };
      const toeOff = GAIT_DATA[pace].toeOffUnits;
      let drift = 0;
      for (let units = 0; units < toeOff; units += SCAN_STEP) {
        const skeleton = skeletonAt(units, setup);
        figure.solveSkeleton(rig.retarget(skeleton));
        drift = Math.max(drift, skeleton.legs.right.ankle.distanceTo(joint('r_foot')) * MM);
      }
      expect(drift).toBeLessThan(PLANTED_DRIFT_MM);
    });
  });

  it('poses the same state identically whatever came before', () => {
    const first = skeletonAt(250, SETUPS[3]);
    const a = rig.retarget(first).slice();
    rig.retarget(skeletonAt(710, SETUPS[7]));
    const b = rig.retarget(first).slice();
    expect(Array.from(b)).toEqual(Array.from(a));
  });
});
