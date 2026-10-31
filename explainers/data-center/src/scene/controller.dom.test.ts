import { Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import { MaterialLibrary } from '@core/scene/materials';
import { regionFromSpec } from '@core/scene/regions';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../ids';
import { GROUND_Y, MOMENTS } from '../model';
import { createAssemblyState, createDataCenterStore } from '../state';
import type * as AssemblyModule from './assembly';
import type { Assembly } from './assembly';
import { CHASE, CHASE_VIEW, FIXED_VIEWS, FOLLOW_MODE, chasePose } from './cameraViews';
import type { FixedView } from './cameraViews';
import { BOUNDS_REGION, DataCenterController, FOLLOW_ANCHOR } from './controller';
import type { DataCenterControllerDependencies } from './controller';
import { framedRegionSpec, isAssemblyRegion } from './regions';
import type { FramedRegionId } from './regions';

const created = vi.hoisted(() => [] as Assembly[]);

vi.mock('./assembly', async (importOriginal) => {
  const actual = await importOriginal<typeof AssemblyModule>();
  return {
    ...actual,
    createAssembly: (...args: Parameters<typeof actual.createAssembly>) => {
      const assembly = actual.createAssembly(...args);
      created.push(assembly);
      return assembly;
    },
  };
});

const FRAMING = { vertical: 0.223, horizontal: 0.259 };
const FIXED_IDS = Object.keys(FIXED_VIEWS) as FixedView[];
const DIGITS = 9;
const FRAME_SECONDS = 1 / 60;
const CAMERA_POSITION = new Vector3(0, 30, 120);
const CAMERA_TARGET = new Vector3(0, 5, 0);
const ASSEMBLY_TIMEOUT_MS = 20_000;

function assemblyState(phase = 0): AssemblyState {
  return createAssemblyState({ ...createDataCenterStore().getState(), phase });
}

function lastAssembly(): Assembly {
  const assembly = created.at(-1);
  if (!assembly) throw new Error('no assembly was built');
  return assembly;
}

function fakeShell() {
  const rig = {
    framing: () => FRAMING,
    follow: vi.fn<(anchor: Object3D | null, mode?: string) => void>(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn<(pose: CameraPose) => void>(),
    tweenTo: vi.fn<(pose: CameraPose) => void>(),
    setBounds: vi.fn<(bounds: Box3, floor: number) => void>(),
    camera: { position: CAMERA_POSITION.clone() },
    controls: { target: CAMERA_TARGET.clone() },
  };
  const scene = { add: vi.fn<(object: Object3D) => void>() };
  const shell = {
    scene,
    materials: new MaterialLibrary(),
    textures: createSceneTextures(),
    labels: { attach: vi.fn(), show: vi.fn() },
    rig,
    viewport: { renderer: { compileAsync: vi.fn(() => Promise.resolve()) } },
  };
  return { rig, scene, shell: shell as unknown as DataCenterControllerDependencies };
}

function builtController(phase = 0) {
  const fake = fakeShell();
  const controller = new DataCenterController(fake.shell);
  controller.build(assemblyState(phase));
  return { ...fake, controller, assembly: lastAssembly() };
}

function rounded(vector: Vector3 | undefined): number[] | undefined {
  return vector?.toArray().map((value) => Number(value.toFixed(DIGITS)));
}

function regionBox(region: FramedRegionId): Box3 {
  if (isAssemblyRegion(region)) return lastAssembly().region(region);
  return regionFromSpec(framedRegionSpec(region));
}

describe('data centre controller', { timeout: ASSEMBLY_TIMEOUT_MS }, () => {
  it('adds the assembly, attaches its labels and bounds the camera on the ground', () => {
    const { rig, scene, shell, assembly } = builtController();
    expect(scene.add).toHaveBeenCalledWith(assembly.root);
    expect(shell.labels.attach).toHaveBeenCalledWith(assembly.labelAnchors());
    const [bounds, floor] = rig.setBounds.mock.lastCall ?? [];
    expect(bounds).toEqual(assembly.region(BOUNDS_REGION));
    expect(floor).toBe(GROUND_Y);
  });

  it('frames nothing before the assembly exists', () => {
    const { rig, shell } = fakeShell();
    const controller = new DataCenterController(shell);
    controller.views.frame(CHASE_VIEW, false);
    controller.views.frame('campus', false);
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it.each([
    ['on the grid line', 0],
    ['at the rack', MOMENTS.atRack],
    ['on the roof', MOMENTS.onRoof],
  ])('aims the chase from the joule and rides along, %s', (_moment, phase) => {
    const { rig, controller, assembly } = builtController(phase);
    controller.views.frame(CHASE_VIEW, false);
    const pose = rig.jumpTo.mock.lastCall?.[0];
    const expected = chasePose(assembly.chaseTarget(), CHASE, FRAMING);
    expect(rounded(pose?.target)).toEqual(rounded(expected.target));
    expect(rounded(pose?.position)).toEqual(rounded(expected.position));
    expect(rig.follow).toHaveBeenLastCalledWith(assembly.anchor(FOLLOW_ANCHOR), FOLLOW_MODE);
  });

  it('frames the fixed views on their regions without following', () => {
    const { rig, controller } = builtController();
    for (const view of FIXED_IDS) {
      const { region, direction, margin } = FIXED_VIEWS[view];
      controller.views.frame(view, false);
      const toward = new Vector3(...(direction as readonly [number, number, number])).normalize();
      const expected = frameBox(regionBox(region), toward, FRAMING, margin);
      const pose = rig.jumpTo.mock.lastCall?.[0];
      expect(rounded(pose?.position), view).toEqual(rounded(expected.position));
      expect(rounded(pose?.target), view).toEqual(rounded(expected.target));
      expect(rig.follow).toHaveBeenLastCalledWith(null, undefined);
    }
  });

  it('tweens when animated', () => {
    const { rig, controller } = builtController();
    controller.views.frame('coolingPlant', true);
    expect(rig.tweenTo).toHaveBeenCalledTimes(1);
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it('moves the followed anchor with the joule', () => {
    const { rig, controller } = builtController();
    controller.views.frame(CHASE_VIEW, false);
    const anchor = rig.follow.mock.lastCall?.[0];
    const start = anchor?.getWorldPosition(new Vector3()).x ?? 0;
    controller.setState(assemblyState(MOMENTS.atRack));
    expect(anchor?.getWorldPosition(new Vector3()).x).toBeGreaterThan(start);
  });

  it('updates the assembly with the camera distance', () => {
    const { controller, assembly } = builtController();
    const update = vi.spyOn(assembly, 'update');
    controller.update(FRAME_SECONDS);
    expect(update).toHaveBeenCalledWith(FRAME_SECONDS, CAMERA_POSITION.distanceTo(CAMERA_TARGET));
  });

  it('reports no motion without an assembly and removes it on dispose', () => {
    const { scene, shell } = fakeShell();
    const controller = new DataCenterController(shell);
    expect(controller.update(FRAME_SECONDS)).toBe(false);
    controller.build(assemblyState());
    const removed = vi.spyOn(scene.add.mock.lastCall?.[0] as Object3D, 'removeFromParent');
    controller.dispose();
    expect(removed).toHaveBeenCalled();
    expect(controller.update(FRAME_SECONDS)).toBe(false);
  });
});
