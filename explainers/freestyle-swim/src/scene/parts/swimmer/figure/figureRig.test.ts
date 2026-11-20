import { describe, expect, it } from 'vitest';
import { Matrix3, Quaternion, Vector3 } from 'three';
import { decodeFigure } from '@core/figure';
import { TargetReader } from '@core/figure/retarget.testkit';
import { toDegrees } from '@core/math';
import { KICK_IDS, PACE_IDS } from '../../../../ids';
import type { KickId, PaceId } from '../../../../ids';
import { strokeAt } from '../../../../model';
import { bodyPose } from '../../../pose';
import { createSkeleton, solveSkeleton } from '../../../rig/skeleton';
import type { Skeleton } from '../../../rig/skeleton';
import { FigureRig, figureOrigin, rigFromFigure } from './figureRig';

const { athleteData } = await import('./athlete.data');
const figure = decodeFigure(athleteData);
const rig = new FigureRig(figure);
const reader = new TargetReader(figure);
const toRig = rigFromFigure(figureOrigin(figure));
const toRigTurn = new Matrix3().setFromMatrix4(toRig);
const SIDES = ['right', 'left'] as const;
const BREATHING = ['none', 'right'] as const;
const SCAN_STEP = 5;
const MM = 1000;
const JOINT_LIMIT_MM = 10;
const BONE_LIMIT_DEG = 1.5;
const PALM_LIMIT_DEG = 8;
const HEAD_LIMIT_DEG = 2;
const STEP_LIMIT_MM = 30;
const ACCELERATION_LIMIT_MM = 6;
const TIMEOUT_MS = 240_000;

interface Setup {
  pace: PaceId;
  kick: KickId;
  breathing: (typeof BREATHING)[number];
  headUp: number;
}

function setups(): Setup[] {
  return PACE_IDS.flatMap((pace) =>
    KICK_IDS.flatMap((kick) =>
      BREATHING.flatMap((breathing) => [0, 1].map((headUp) => ({ pace, kick, breathing, headUp }))),
    ),
  );
}

function skeletonAt(units: number, setup: Setup): Skeleton {
  const { pace, kick, breathing, headUp } = setup;
  const reading = strokeAt(units, { pace, kick, breathing, headUp: headUp > 0 });
  return solveSkeleton(createSkeleton(), reading, headUp, bodyPose(headUp, 0).y);
}

function jointInRig(name: string): Vector3 {
  return new Vector3()
    .fromArray(figure.jointPositions, figure.jointIndex(name) * 3)
    .applyMatrix4(toRig);
}

function bone(a: Vector3, b: Vector3): Vector3 {
  return b.clone().sub(a).normalize();
}

function inRig(p: { x: number; y: number; z: number }): Vector3 {
  return new Vector3(p.x, p.y, p.z).applyMatrix3(toRigTurn).normalize();
}

describe('figure rig', () => {
  it(
    'lands on the rig over the whole stroke',
    () => {
      const worst = { joint: 0, bone: 0, palm: 0, head: 0 };
      setups().forEach((setup) => {
        for (let units = 0; units < 1000; units += SCAN_STEP) {
          const skeleton = skeletonAt(units, setup);
          const parameters = rig.retarget(skeleton);
          const target = reader.read(parameters);
          figure.solveSkeleton(parameters);
          SIDES.forEach((id) => {
            const p = id === 'right' ? 'r' : 'l';
            const { arms, legs } = skeleton;
            const pairs: [Vector3, Vector3][] = [
              [arms[id].elbow, jointInRig(`${p}_lowarm`)],
              [arms[id].wrist, jointInRig(`${p}_wrist`)],
              [legs[id].knee, jointInRig(`${p}_lowleg`)],
              [legs[id].ankle, jointInRig(`${p}_foot`)],
            ];
            pairs.forEach(([want, got]) => {
              worst.joint = Math.max(worst.joint, want.distanceTo(got) * MM);
            });
            const bones: [Vector3, Vector3][] = [
              [
                bone(arms[id].shoulder, arms[id].elbow),
                bone(jointInRig(`${p}_uparm`), jointInRig(`${p}_lowarm`)),
              ],
              [
                bone(arms[id].elbow, arms[id].wrist),
                bone(jointInRig(`${p}_lowarm`), jointInRig(`${p}_wrist`)),
              ],
              [
                bone(legs[id].hip, legs[id].knee),
                bone(jointInRig(`${p}_upleg`), jointInRig(`${p}_lowleg`)),
              ],
              [
                bone(legs[id].knee, legs[id].ankle),
                bone(jointInRig(`${p}_lowleg`), jointInRig(`${p}_foot`)),
              ],
            ];
            bones.forEach(([want, got]) => {
              worst.bone = Math.max(worst.bone, toDegrees(want.angleTo(got)));
            });
            worst.palm = Math.max(
              worst.palm,
              toDegrees(inRig(target.arms[id].palm).angleTo(arms[id].palm)),
            );
          });
          const head = target.head;
          const turned = inRig(head).multiplyScalar(Math.hypot(head.x, head.y, head.z));
          const face = new Vector3(0, -1, 0).applyQuaternion(skeleton.head);
          const got = new Vector3(0, -1, 0).applyQuaternion(
            new Quaternion(turned.x, turned.y, turned.z, head.w),
          );
          worst.head = Math.max(worst.head, toDegrees(face.angleTo(got)));
        }
      });
      expect(worst.joint).toBeLessThan(JOINT_LIMIT_MM);
      expect(worst.bone).toBeLessThan(BONE_LIMIT_DEG);
      expect(worst.palm).toBeLessThan(PALM_LIMIT_DEG);
      expect(worst.head).toBeLessThan(HEAD_LIMIT_DEG);
    },
    TIMEOUT_MS,
  );

  it(
    'moves every vertex smoothly between neighbouring scrubber units',
    () => {
      const worst = { step: 0, acceleration: 0 };
      setups()
        .filter((setup) => setup.headUp === 1 || setup.kick === 'six')
        .forEach((setup) => {
          const frames: Float32Array[] = [];
          for (let units = -1; units <= 1000; units++) {
            rig.pose(skeletonAt(units, setup));
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
      expect(worst.step).toBeLessThan(STEP_LIMIT_MM);
      expect(worst.acceleration).toBeLessThan(ACCELERATION_LIMIT_MM);
    },
    TIMEOUT_MS,
  );

  it('poses the same state identically whatever came before', () => {
    const setup = setups()[3];
    const first = skeletonAt(250, setup);
    const a = rig.retarget(first).slice();
    rig.retarget(skeletonAt(710, setups()[7]));
    const b = rig.retarget(first).slice();
    expect(Array.from(b)).toEqual(Array.from(a));
  });
});
