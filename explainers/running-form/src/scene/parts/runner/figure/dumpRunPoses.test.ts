/// <reference types="node" />

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeFigure } from '@core/figure';
import type { FigureData } from '@core/figure/data';
import { FigureRig } from '@core/figure/body/figureRig';
import { decodeModel } from '@core/figure/decode';
import { Kinematics } from '@core/figure/kinematics';
import { JOINT_PARAMETERS } from '@core/figure/model';
import type { FigureModel } from '@core/figure/model';
import { withRolls } from '@core/figure/rolls';
import { ARMS_IDS, PACE_IDS } from '../../../../ids';
import type { ArmsId, PaceId } from '../../../../ids';
import { gaitAt } from '../../../../model/gait';
import { solveSkeleton } from '../../../rig/skeleton';
import { FIGURE_FROM_RUNNER } from './frame';

const DUMP_DIR = process.env.RUN_DUMP_DIR;
const UNIT_STEP = Number(process.env.RUN_DUMP_STEP ?? 5);
const SCRUBBER_UNITS = 1000;
const HELD_OUT_OFFSET = 2;
const FIT_STEP_RATES = [-10, -5, 0, 5, 10];
const HELD_OUT_STEP_RATES = [-10, -7, -2, 3, 8, 10];
const FEATURE_CHECK_STRIDE = 997;
const TIMEOUT_MS = 1_800_000;

interface PoseKey {
  readonly pace: PaceId;
  readonly stepRate: number;
  readonly arms: ArmsId;
  readonly units: number;
}

function poseKeys(stepRates: readonly number[], offset: number): PoseKey[] {
  const keys: PoseKey[] = [];
  for (const pace of PACE_IDS)
    for (const stepRate of stepRates)
      for (const arms of ARMS_IDS)
        for (let units = offset; units < SCRUBBER_UNITS; units += UNIT_STEP)
          keys.push({ pace, stepRate, arms, units });
  return keys;
}

function jointParametersOf(model: FigureModel, parameters: Float32Array, out: Float32Array): void {
  const { rows, columns, values, baked } = model.transform;
  out.set(baked);
  for (let i = 0; i < rows.length; i++) out[rows[i]] += values[i] * parameters[columns[i]];
}

function writeFloats(path: string, values: Float32Array): void {
  writeFileSync(path, new Uint8Array(values.buffer, values.byteOffset, values.byteLength));
}

async function loadData(): Promise<FigureData> {
  return (await import('./runner.data')).athleteData;
}

describe.skipIf(!DUMP_DIR)('running pose dump', () => {
  it(
    'writes joint parameters, model parameters and features of the run',
    async () => {
      const directory = DUMP_DIR as string;
      mkdirSync(directory, { recursive: true });
      const data = await loadData();
      const figure = decodeFigure(data);
      const model = withRolls(decodeModel(data));
      const rig = new FigureRig(figure, FIGURE_FROM_RUNNER);
      const kinematics = new Kinematics(model);
      const jointCount = model.jointCount * JOINT_PARAMETERS;
      const sets: Record<string, (PoseKey | null)[]> = {
        fit: [null, ...poseKeys(FIT_STEP_RATES, 0)],
        heldout: poseKeys(HELD_OUT_STEP_RATES, HELD_OUT_OFFSET),
      };
      let checked = 0;
      Object.entries(sets).forEach(([name, keys]) => {
        const joints = new Float32Array(keys.length * jointCount);
        const parameters = new Float32Array(keys.length * figure.parameterCount);
        const features: number[] = [];
        keys.forEach((key, i) => {
          const pose = key
            ? rig.retarget(solveSkeleton(gaitAt(key.units, key)))
            : figure.createParameters();
          parameters.set(pose, i * figure.parameterCount);
          jointParametersOf(model, pose, joints.subarray(i * jointCount, (i + 1) * jointCount));
          if (i % FEATURE_CHECK_STRIDE === 0) {
            kinematics.solve(pose);
            features.push(...kinematics.features);
            checked++;
          }
        });
        writeFloats(join(directory, `${name}.joints.f32`), joints);
        writeFloats(join(directory, `${name}.parameters.f32`), parameters);
        writeFloats(join(directory, `${name}.features.f32`), Float32Array.from(features));
        writeFileSync(
          join(directory, `${name}.json`),
          JSON.stringify({
            poses: keys.length,
            jointCount: model.jointCount,
            jointParameters: JOINT_PARAMETERS,
            parameterNames: figure.parameterNames,
            featureCheckStride: FEATURE_CHECK_STRIDE,
            keys,
          }),
        );
      });
      expect(checked).toBeGreaterThan(0);
    },
    TIMEOUT_MS,
  );
});
