import { Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import { MaterialLibrary } from '@core/scene/materials';
import { regionFromSpec } from '@core/scene/regions';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, RegionId } from '../ids';
import { MOMENTS } from '../model';
import { createAssemblyState, createMaglevTrainStore } from '../state';
import type * as AssemblyModule from './assembly';
import type { Assembly } from './assembly';
import { FOLLOW_MODE, FOLLOW_VIEWS, LINE_UP_VIEW, REGION_VIEWS, followPose } from './cameraViews';
import type { FollowView, RegionView } from './cameraViews';
import { BOUNDS_REGION, FOLLOW_ANCHOR, GROUND_Y, MaglevTrainController } from './controller';
import type { MaglevTrainControllerDependencies } from './controller';

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

const FRAMING = { vertical: 0.2, horizontal: 0.13 };
const FOLLOW_IDS = Object.keys(FOLLOW_VIEWS) as FollowView[];
const REGION_IDS = Object.keys(REGION_VIEWS) as RegionView[];
const DIGITS = 9;
const FRAME_SECONDS = 1 / 60;
const CAMERA_POSITION = new Vector3(0, 3, 12);
const CAMERA_TARGET = new Vector3(0, 0.5, 0);
const ASSEMBLY_TIMEOUT_MS = 20_000;

function assemblyState(phase = 0): AssemblyState {
  return createAssemblyState({ ...createMaglevTrainStore().getState(), phase });
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
  return { rig, scene, shell: shell as unknown as MaglevTrainControllerDependencies };
}

function builtController(phase = 0) {
  const fake = fakeShell();
  const controller = new MaglevTrainController(fake.shell);
  controller.build(assemblyState(phase));
  return { ...fake, controller, assembly: lastAssembly() };
}

function rounded(vector: Vector3 | undefined): number[] | undefined {
  return vector?.toArray().map((value) => Number(value.toFixed(DIGITS)));
}

function regionBox(region: RegionId): Box3 {
  return lastAssembly().region(region);
}

describe('maglev train controller', { timeout: ASSEMBLY_TIMEOUT_MS }, () => {
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
    const controller = new MaglevTrainController(shell);
    controller.views.frame('ride', false);
    controller.views.frame('arm', false);
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it.each([
    ['resting on the skids', 0],
    ['floating at full speed', MOMENTS.fullSpeed],
  ])('aims every fly-along view from the chase target and rides along, %s', (_moment, phase) => {
    const { rig, controller, assembly } = builtController(phase);
    for (const view of FOLLOW_IDS) {
      controller.views.frame(view, false);
      const pose = rig.jumpTo.mock.lastCall?.[0];
      const expected = followPose(assembly.chaseTarget(), FOLLOW_VIEWS[view]);
      expect(rounded(pose?.target), view).toEqual(rounded(expected.target));
      expect(rounded(pose?.position), view).toEqual(rounded(expected.position));
      expect(rig.follow).toHaveBeenLastCalledWith(assembly.anchor(FOLLOW_ANCHOR), FOLLOW_MODE);
    }
  });

  it('frames the fixed views on their regions without following', () => {
    const { rig, controller } = builtController();
    for (const view of REGION_IDS) {
      const { region, direction, margin } = REGION_VIEWS[view];
      controller.views.frame(view, false);
      const toward = new Vector3(...(direction as readonly [number, number, number])).normalize();
      const expected = frameBox(regionBox(region), toward, FRAMING, margin);
      const pose = rig.jumpTo.mock.lastCall?.[0];
      expect(rounded(pose?.position), view).toEqual(rounded(expected.position));
      expect(rounded(pose?.target), view).toEqual(rounded(expected.target));
      expect(rig.follow).toHaveBeenLastCalledWith(null, undefined);
    }
  });

  it('frames the line-up on its own box without following', () => {
    const { rig, controller } = builtController();
    const { box, direction, margin } = LINE_UP_VIEW;
    controller.views.frame('lineUp', false);
    const toward = new Vector3(...direction).normalize();
    const expected = frameBox(regionFromSpec(box), toward, FRAMING, margin);
    const pose = rig.jumpTo.mock.lastCall?.[0];
    expect(rounded(pose?.position)).toEqual(rounded(expected.position));
    expect(rounded(pose?.target)).toEqual(rounded(expected.target));
    expect(rig.follow).toHaveBeenLastCalledWith(null, undefined);
  });

  it('tweens when animated', () => {
    const { rig, controller } = builtController();
    controller.views.frame('rear', true);
    expect(rig.tweenTo).toHaveBeenCalledTimes(1);
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it('lifts the followed anchor with the train', () => {
    const { rig, controller } = builtController();
    controller.views.frame('ride', false);
    const anchor = rig.follow.mock.lastCall?.[0];
    const resting = anchor?.getWorldPosition(new Vector3()).y ?? 0;
    controller.setState(assemblyState(MOMENTS.lifted));
    expect(anchor?.getWorldPosition(new Vector3()).y).toBeGreaterThan(resting);
  });

  it('updates the assembly with the camera distance', () => {
    const { controller, assembly } = builtController();
    const update = vi.spyOn(assembly, 'update');
    controller.update(FRAME_SECONDS);
    expect(update).toHaveBeenCalledWith(FRAME_SECONDS, CAMERA_POSITION.distanceTo(CAMERA_TARGET));
  });

  it('reports no motion without an assembly and removes it on dispose', () => {
    const { scene, shell } = fakeShell();
    const controller = new MaglevTrainController(shell);
    expect(controller.update(FRAME_SECONDS)).toBe(false);
    controller.build(assemblyState());
    const removed = vi.spyOn(scene.add.mock.lastCall?.[0] as Object3D, 'removeFromParent');
    controller.dispose();
    expect(removed).toHaveBeenCalled();
    expect(controller.update(FRAME_SECONDS)).toBe(false);
  });
});
