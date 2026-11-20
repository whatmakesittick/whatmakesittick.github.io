/// <reference types="node" />

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { decodeFigure } from '@core/figure';
import { decodeModel } from '@core/figure/decode';
import { Kinematics } from '@core/figure/kinematics';
import { JOINT_PARAMETERS } from '@core/figure/model';
import type { FigureModel } from '@core/figure/model';
import { withRolls } from '@core/figure/rolls';
import { BREATH_IDS, KICK_IDS, PACE_IDS } from '../ids';
import type { BreathId, KickId, PaceId } from '../ids';
import { strokeAt } from '../model';
import { FigureRig } from './parts/swimmer/figure/figureRig';
import { bodyPose } from './pose';
import { createSkeleton, solveSkeleton } from './rig/skeleton';

const { athleteData } = await import('./parts/swimmer/figure/athlete.data');

const DUMP_DIR = process.env.STROKE_DUMP_DIR;
const SCRUBBER_UNITS = 1000;
const UNIT_STEP = 5;
const HELD_OUT_OFFSET = 2;
const FIT_HEAD_UP = [0, 1];
const HELD_OUT_HEAD_UP = [0, 0.5, 1];
const FEATURE_CHECK_STRIDE = 997;
const TIMEOUT_MS = 600_000;

interface PoseKey {
  readonly pace: PaceId;
  readonly kick: KickId;
  readonly breathing: BreathId;
  readonly headUp: number;
  readonly units: number;
}

function poseKeys(headUps: readonly number[], offset: number): PoseKey[] {
  const keys: PoseKey[] = [];
  for (const pace of PACE_IDS)
    for (const kick of KICK_IDS)
      for (const breathing of BREATH_IDS)
        for (const headUp of headUps)
          for (let units = offset; units < SCRUBBER_UNITS; units += UNIT_STEP)
            keys.push({ pace, kick, breathing, headUp, units });
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

describe.skipIf(!DUMP_DIR)('stroke pose dump', () => {
  it(
    'writes joint parameters, model parameters and features of the stroke',
    () => {
      const directory = DUMP_DIR as string;
      mkdirSync(directory, { recursive: true });
      const figure = decodeFigure(athleteData);
      const model = withRolls(decodeModel(athleteData));
      const rig = new FigureRig(figure);
      const kinematics = new Kinematics(model);
      const jointCount = model.jointCount * JOINT_PARAMETERS;
      const sets: Record<string, (PoseKey | null)[]> = {
        fit: [null, ...poseKeys(FIT_HEAD_UP, 0)],
        heldout: poseKeys(HELD_OUT_HEAD_UP, HELD_OUT_OFFSET),
      };
      let checked = 0;
      Object.entries(sets).forEach(([name, keys]) => {
        const joints = new Float32Array(keys.length * jointCount);
        const parameters = new Float32Array(keys.length * figure.parameterCount);
        const features: number[] = [];
        keys.forEach((key, i) => {
          const pose = key
            ? rig.retarget(
                solveSkeleton(
                  createSkeleton(),
                  strokeAt(key.units, { ...key, headUp: key.headUp > 0 }),
                  key.headUp,
                  bodyPose(key.headUp, 0).y,
                ),
              )
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
