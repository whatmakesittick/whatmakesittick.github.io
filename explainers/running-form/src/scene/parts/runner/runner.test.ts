import { Mesh, Texture, Vector3 } from 'three';
import type { Object3D } from 'three';
import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { runNow } from '@core/scene/pacing';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import { PACE_IDS } from '../../../ids';
import type { PaceId } from '../../../ids';
import { gaitAt } from '../../../model/gait';
import { CYCLE_UNITS } from '../../../model/timeMap';
import type { RunnerFigure } from '../../runnerSlot';
import { createFigureRig } from './figure/createRig';
import { runnerResources } from './resources';

const MM = 1000;
const ROAD_SINK_LIMIT_MM = 2.5;
const CONTACT_LIMIT_MM = 3.5;
const SCAN_STEP = 20;
const EVENT_MARGIN = 20;
const TIMEOUT_MS = 120_000;

const rig = createFigureRig();
const { solvePose, buildRunner } = runnerResources(rig);

function context() {
  return {
    materials: new MaterialLibrary(),
    textures: {
      dot: new Texture(),
      glow: new Texture(),
      shadow: new Texture(),
      dispose: () => {},
    } as SceneTextures,
    tracker: new ResourceTracker(),
  };
}

function lowestPoint(object: Object3D): number {
  object.updateMatrixWorld(true);
  let lowest = Infinity;
  const point = new Vector3();
  object.traverse((child) => {
    if (!(child instanceof Mesh)) return;
    const position = child.geometry.getAttribute('position');
    for (let v = 0; v < position.count; v++) {
      lowest = Math.min(
        lowest,
        point.fromBufferAttribute(position, v).applyMatrix4(child.matrixWorld).y,
      );
    }
  });
  return lowest;
}

function shoeOf(runner: RunnerFigure, side: 'right' | 'left'): Object3D {
  const shoe = runner.root.getObjectByName(`${side}Shoe`);
  if (!shoe) throw new Error(`no ${side} shoe`);
  return shoe;
}

function poseAt(runner: RunnerFigure, units: number, pace: PaceId): ReturnType<typeof gaitAt> {
  const reading = gaitAt(units, { pace, stepRate: 0, arms: 'swing' });
  runner.apply(solvePose(reading), reading);
  return reading;
}

describe('dressed runner', () => {
  const runner = runNow(buildRunner(context()));

  it('builds the body, both shoes, the headwear and the watch', () => {
    ['body', 'rightShoe', 'leftShoe', 'headwear', 'watch'].forEach((name) =>
      expect(runner.root.getObjectByName(name), name).toBeDefined(),
    );
  });

  it(
    'keeps the soles on the road through the stance and never below it',
    () => {
      PACE_IDS.forEach((pace) => {
        for (let units = 0; units < CYCLE_UNITS; units += SCAN_STEP) {
          const reading = poseAt(runner, units, pace);
          (['right', 'left'] as const).forEach((side) => {
            const lowest = lowestPoint(shoeOf(runner, side)) * MM;
            expect(lowest, `${pace} ${units} ${side}`).toBeGreaterThan(-ROAD_SINK_LIMIT_MM);
            const leg = reading[side];
            const settled = leg.contact && reading.units % CYCLE_UNITS > EVENT_MARGIN;
            if (settled) expect(lowest, `${pace} ${units} ${side}`).toBeLessThan(CONTACT_LIMIT_MM);
          });
        }
      });
    },
    TIMEOUT_MS,
  );

  it('solves the skeleton once for the pose and the mesh of the same reading', () => {
    const reading = gaitAt(250, { pace: 'steady', stepRate: 0, arms: 'swing' });
    const pose = solvePose(reading);
    expect(solvePose(reading)).toEqual(pose);
    runner.apply(pose, reading);
    const shoe = shoeOf(runner, 'right');
    const at = new Vector3().setFromMatrixPosition(shoe.matrix);
    expect(at.distanceTo(pose.legs.right.ankle)).toBeLessThan(1e-6);
  });

  it('disposes everything it created', () => {
    const own = context();
    const built = runNow(buildRunner(own));
    built.dispose();
    own.tracker.dispose();
    expect(built.root.parent).toBeNull();
  });
});
