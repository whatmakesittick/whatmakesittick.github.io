import { describe, expect, it } from 'vitest';
import { Group, InstancedMesh, Matrix4, Texture, Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { runNow } from '@core/scene/pacing';
import type { SceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, GaitReading, ViewOptions } from '../ids';
import { gaitAt } from '../model/gait';
import type { createAssembly } from './assembly';
import { createRunAssembly } from './runAssembly';
import type { RunAssemblyResources } from './runAssembly';
import { referencePose } from './runnerPose';
import type { RunnerFigure } from './runnerSlot';

const OPTIONS = { pace: 'steady', stepRate: 0, arms: 'swing' } as const;
const VIEW: ViewOptions = {
  labels: true,
  forces: false,
  formLines: false,
  footPath: false,
  follow: true,
};
const SETTLE_STEPS = 30;
const STEP_SECONDS = 0.05;
const SHIFT_M = 0.25;

function stateAt(phase: number, scrollM = 0, view: Partial<ViewOptions> = {}): AssemblyState {
  return {
    phase,
    playing: false,
    reading: gaitAt(phase, OPTIONS),
    ...OPTIONS,
    scrollM,
    view: { ...VIEW, ...view },
  };
}

function resources(extra: Partial<RunAssemblyResources> = {}): RunAssemblyResources {
  return {
    materials: new MaterialLibrary(),
    textures: {
      dot: new Texture(),
      glow: new Texture(),
      shadow: new Texture(),
      dispose: () => {},
    } as SceneTextures,
    ...extra,
  };
}

function firstInstanced(root: Object3D, name: string): InstancedMesh {
  let found: InstancedMesh | undefined;
  root.traverse((object) => {
    if (!found && object instanceof InstancedMesh && object.parent?.name === name) found = object;
  });
  if (!found) throw new Error(`no instanced mesh under ${name}`);
  return found;
}

function matrices(mesh: InstancedMesh): number[] {
  const matrix = new Matrix4();
  return Array.from({ length: mesh.count }, (_, index) => {
    mesh.getMatrixAt(index, matrix);
    return matrix.elements[12];
  });
}

describe('run assembly', () => {
  it('keeps the frozen createAssembly signature', () => {
    const factory: typeof createAssembly = createRunAssembly;
    expect(factory).toBe(createRunAssembly);
  });

  it('has every anchor, label anchor and region, with the labels on the right side', () => {
    const assembly = runNow(createRunAssembly(resources(), stateAt(431)));
    assembly.root.updateMatrixWorld(true);
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    PART_IDS.forEach((id) => {
      const anchor = assembly.labelAnchors().get(id);
      expect(anchor).toBeDefined();
      expect(anchor?.getWorldPosition(new Vector3()).z).toBeGreaterThan(0);
    });
    assembly.dispose();
  });

  it('follows the pelvis and puts the runner anchor on the road', () => {
    const state = stateAt(431);
    const assembly = runNow(createRunAssembly(resources(), state));
    const pelvis = referencePose(state.reading).pelvis;
    expect(assembly.chaseTarget().position.y).toBeCloseTo(pelvis.y, 6);
    expect(assembly.chaseTarget().heading).toBe(0);
    expect(assembly.anchor('runner').position.y).toBe(0);
    expect(assembly.anchor('runner').position.x).toBeCloseTo(pelvis.x, 6);
    assembly.dispose();
  });

  it('takes the pose from a supplied solver and drives a supplied runner', () => {
    const applied: number[] = [];
    const runner: RunnerFigure = {
      root: new Group(),
      apply: (_pose, reading: GaitReading) => applied.push(reading.units),
      dispose: () => {},
    };
    const solvePose = (reading: GaitReading) => {
      const pose = referencePose(reading);
      pose.pelvis.x += SHIFT_M;
      return pose;
    };
    const buildRunner = function* () {
      yield;
      return runner;
    };
    const assembly = runNow(createRunAssembly(resources({ solvePose, buildRunner }), stateAt(120)));
    expect(assembly.chaseTarget().position.x).toBeGreaterThan(SHIFT_M * 0.9);
    assembly.setState(stateAt(300));
    expect(applied).toContain(300);
    assembly.dispose();
  });

  it('scrolls the scenery with the scroll only and keeps a paused state still', () => {
    const assembly = runNow(createRunAssembly(resources(), stateAt(200, 10)));
    const lamps = firstInstanced(assembly.root, 'land');
    const before = matrices(lamps);
    assembly.setState(stateAt(600, 10));
    expect(matrices(lamps)).toEqual(before);
    assembly.setState(stateAt(600, 14));
    expect(matrices(lamps)).not.toEqual(before);
    assembly.dispose();
  });

  it('eases the overlays in and then settles', () => {
    const assembly = runNow(createRunAssembly(resources(), stateAt(150)));
    expect(assembly.update(STEP_SECONDS, 5)).toBe(false);
    assembly.setState(stateAt(150, 0, { forces: true, formLines: true, footPath: true }));
    expect(assembly.update(STEP_SECONDS, 5)).toBe(true);
    for (let step = 0; step < SETTLE_STEPS; step += 1) assembly.update(STEP_SECONDS, 5);
    expect(assembly.update(STEP_SECONDS, 5)).toBe(false);
    assembly.dispose();
  });

  it('warms up the hidden overlays', () => {
    const assembly = runNow(createRunAssembly(resources(), stateAt(150)));
    const compiled: Object3D[] = [];
    assembly.warmUp?.((object) => compiled.push(object));
    expect(compiled.length).toBeGreaterThan(0);
    expect(compiled.every((object) => object.visible || object.parent !== null)).toBe(true);
    assembly.dispose();
  });
});
