/// <reference types="node" />

import { writeFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { toDegrees } from '@core/math';
import { createFigureRig } from '../parts/runner/figure/createRig';
import { GAIT_DATA } from '../../model/gaitData';
import { CYCLE_UNITS } from '../../model/timeMap';
import {
  PROBE_PACES,
  PROBE_STEP_RATES,
  groundProbe,
  landingReach,
  mirrorError,
  pelvisPath,
  phaseDeviations,
  range,
  skeletonAt,
  speedProfile,
  stanceSlip,
  wristMidline,
} from './probes.testkit';
import { STANDING_PELVIS_TILT_DEG } from './pelvis';
import { poseOf } from './skeleton';
import type { RunnerSkeleton } from './skeleton';

const TABLE_PATH = process.env.RUN_PROBE_TABLE;
const NAVEL_ABOVE_HIPS_M = 0.125;
const SCAN_STEP = 20;
const CM = 100;
const MM = 1000;

function fixed(value: number, digits = 1): string {
  return value.toFixed(digits);
}

function toleranceRows(): string[] {
  const rows = [
    '| Pace | Step rate | Stance dev | Recovery dev | Swing dev | Approach dev | Slip mm | Lowest sole mm | Flag misses | Swing clearance mm | Left vs right deg | Bounce cm (com) | Surge cm (com) | Lowest at (40% stance) | Highest at | Reach cm (model) | Hand past midline cm |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  PROBE_PACES.forEach((pace) =>
    PROBE_STEP_RATES.forEach((stepRate) => {
      const deviations = phaseDeviations(pace, stepRate);
      const ground = groundProbe(pace, stepRate);
      const path = pelvisPath(pace, stepRate, 2);
      const step = path.heights.slice(0, path.heights.length / 2);
      const toeOff = GAIT_DATA[pace].toeOffUnits;
      const reach = landingReach(pace, stepRate);
      const { com } = path.readings[0];
      rows.push(
        `| ${pace} | ${stepRate} | ${fixed(deviations.stance)} | ${fixed(deviations.recovery)} | ${fixed(deviations.swing)} | ${fixed(deviations.approach)} | ${fixed(stanceSlip(pace, stepRate) * MM, 2)} | ${fixed(ground.lowest * MM)} | ${ground.flagMismatches} | ${fixed(ground.swingClearance * MM)} | ${fixed(mirrorError(pace, stepRate), 2)} | ${fixed(range(path.heights) * CM, 2)} (${fixed(com.risePeakToPeakM * CM, 2)}) | ${fixed(range(path.surges) * CM, 2)} (${fixed(com.surgePeakToPeakM * CM, 2)}) | ${step.indexOf(Math.min(...step)) * 2} (${Math.round(0.4 * toeOff)}) | ${step.indexOf(Math.max(...step)) * 2} | ${fixed(reach.rig * CM)} (${fixed(reach.model * CM)}) | ${fixed(wristMidline(pace, stepRate, 'swing') * CM)} |`,
      );
    }),
  );
  return rows;
}

function speedRows(): string[] {
  const units = Array.from({ length: CYCLE_UNITS / SCAN_STEP }, (_, i) => i * SCAN_STEP);
  const rows = [`| Point | ${units.join(' | ')} |`, `| --- |${units.map(() => ' --- |').join('')}`];
  const points = {
    'right ankle': (s: ReturnType<typeof skeletonAt>) => s.legs.right.ankle,
    'left ankle': (s: ReturnType<typeof skeletonAt>) => s.legs.left.ankle,
    'right wrist': (s: ReturnType<typeof skeletonAt>) => s.arms.right.wrist,
    'left wrist': (s: ReturnType<typeof skeletonAt>) => s.arms.left.wrist,
    head: (s: ReturnType<typeof skeletonAt>) => poseOf(s).headCentre,
  };
  Object.entries(points).forEach(([name, point]) => {
    const speeds = speedProfile('steady', 0, point, SCAN_STEP);
    rows.push(`| ${name} | ${speeds.map((v) => fixed(v, 2)).join(' | ')} |`);
  });
  return rows;
}

function placementRows(): string[] {
  const rows = [
    '| Unit | R wrist from midline cm | L wrist from midline cm | R wrist above navel cm | L wrist above navel cm | R wrist to nearest hip cm | R knee z cm | L knee z cm | R ankle z cm | L ankle z cm |',
    '| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  for (let units = 0; units < CYCLE_UNITS; units += SCAN_STEP * 2) {
    const pose = poseOf(skeletonAt(units, 'steady', 0));
    const navel = pose.pelvis.clone().addScaledVector(pose.trunkUp, NAVEL_ABOVE_HIPS_M);
    const wrists = pose.arms;
    const hip = Math.min(
      wrists.right.wrist.distanceTo(pose.legs.right.hip),
      wrists.right.wrist.distanceTo(pose.legs.left.hip),
    );
    rows.push(
      `| ${units} | ${fixed(wrists.right.wrist.z * CM)} | ${fixed(-wrists.left.wrist.z * CM)} | ${fixed((wrists.right.wrist.y - navel.y) * CM)} | ${fixed((wrists.left.wrist.y - navel.y) * CM)} | ${fixed(hip * CM)} | ${fixed(pose.legs.right.knee.z * CM)} | ${fixed(pose.legs.left.knee.z * CM)} | ${fixed(pose.legs.right.ankle.z * CM)} | ${fixed(pose.legs.left.ankle.z * CM)} |`,
    );
  }
  return rows;
}

const BODY_STEPS = [0, 0.4, 0.5, 1] as const;
const FLOAT_OFFSET_UNITS = 70;
const FINAL_UNITS = 863;

function bodyUnits(toeOff: number): number[] {
  const stance = BODY_STEPS.map((share) => Math.round(share * toeOff));
  return [
    ...stance,
    toeOff + FLOAT_OFFSET_UNITS,
    ...stance.slice(0, 3).map((units) => units + CYCLE_UNITS / 2),
    FINAL_UNITS,
  ];
}

function sagittal(vector: Vector3): number {
  return toDegrees(Math.atan2(vector.x, vector.y));
}

function bodyRows(): string[] {
  const rig = createFigureRig();
  const { figure } = rig;
  const joint = (name: string) =>
    new Vector3()
      .fromArray(figure.jointPositions, figure.jointIndex(name) * 3)
      .applyMatrix4(rig.toRig);
  const hips = () => joint('r_upleg').add(joint('l_upleg')).multiplyScalar(0.5);
  const restNeck = sagittal(joint('c_head').sub(joint('c_neck')));
  const restLumbar = sagittal(joint('c_spine0').sub(hips()));
  const rows = [
    '| Pace | Unit | Trunk line deg (lean) | Neck change deg | Pelvis tilt change deg (reading - standing) | Hip drop deg (roll) | R fist ahead / up / side cm | L fist ahead / up / side cm |',
    '| --- | --- | --- | --- | --- | --- | --- | --- |',
  ];
  PROBE_PACES.forEach((pace) =>
    bodyUnits(GAIT_DATA[pace].toeOffUnits).forEach((units) => {
      const skeleton: RunnerSkeleton = skeletonAt(units, pace, 0);
      rig.pose(skeleton);
      const { upper } = skeleton.reading;
      const centre = hips();
      const right = joint('r_upleg');
      const left = joint('l_upleg');
      const drop = toDegrees(Math.atan2(right.y - left.y, right.z - left.z));
      const fist = (name: string, sign: number) => {
        const at = joint(name).sub(centre);
        return `${fixed(at.x * CM, 0)} / ${fixed(at.y * CM, 0)} / ${fixed(sign * at.z * CM, 0)}`;
      };
      rows.push(
        `| ${pace} | ${units} | ${fixed(sagittal(joint('c_neck').sub(centre)))} (${fixed(upper.leanDeg)}) | ${fixed(sagittal(joint('c_head').sub(joint('c_neck'))) - restNeck)} | ${fixed(sagittal(joint('c_spine0').sub(centre)) - restLumbar)} (${fixed(upper.pelvisTiltDeg - STANDING_PELVIS_TILT_DEG)}) | ${fixed(drop)} (${fixed(upper.pelvisRollDeg)}) | ${fist('r_middle1', 1)} | ${fist('l_middle1', -1)} |`,
      );
    }),
  );
  return rows;
}

describe.skipIf(!TABLE_PATH)('runner probe table', () => {
  it('writes the probe table', () => {
    const text = [
      '# Running form rig probes',
      '',
      'Generated by `RUN_PROBE_TABLE=<path> npx vitest run explainers/running-form/src/scene/rig/probeTable.test.ts`.',
      'Deviations are the largest of hip, knee and ankle flexion against the reading, in degrees. Stance: touchdown to',
      'toe-off; recovery: toe-off + 150 units; approach: the last 120 units before touchdown; swing: between them.',
      '',
      '## Tolerances',
      '',
      ...toleranceRows(),
      '',
      '## Speeds at the steady pace (m/s, every 20 units)',
      '',
      ...speedRows(),
      '',
      '## Hands, knees and feet at the steady pace',
      '',
      ...placementRows(),
      '',
      '## Body checks on the posed mesh',
      '',
      'Trunk line: hip joints to the base of the neck. Neck: base of the neck to the head joint, against the rest pose. Pelvis: hip joints to the lowest spine joint, forward tilt against the rest pose. Fists: the middle knuckle against the hip joints (ahead, up, out from the midline).',
      '',
      ...bodyRows(),
      '',
    ].join('\n');
    writeFileSync(TABLE_PATH as string, text);
    expect(text.length).toBeGreaterThan(0);
  }, 600_000);
});
