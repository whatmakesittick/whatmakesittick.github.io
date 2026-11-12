import { Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import { MaterialLibrary } from '@core/scene/materials';
import { createSceneTextures } from '@core/scene/textures';
import { CAMERA_VIEW_IDS } from '../ids';
import type { CameraView, CompareId, RegisterId, ViewOptions } from '../ids';
import { MOMENTS } from '../model';
import { createAssemblyState, createPianoStore } from '../state';
import type * as AssemblyModule from './assembly';
import type { Assembly } from './assembly';
import { CAMERA_VIEWS } from './cameraViews';
import { BOUNDS_REGION, FOLLOW_ANCHOR, GROUND_Y, PianoController } from './controller';
import type { PianoControllerDependencies } from './controller';

const created = vi.hoisted(() => [] as Assembly[]);

vi.mock('./assembly', async (importOriginal) => {
  const actual = await importOriginal<typeof AssemblyModule>();
  return {
    ...actual,
    createAssembly: async (...args: Parameters<typeof actual.createAssembly>) => {
      const assembly = await actual.createAssembly(...args);
      created.push(assembly);
      return assembly;
    },
  };
});

const FRAMING = { vertical: 0.2, horizontal: 0.13 };
const DIGITS = 9;
const FRAME_SECONDS = 1 / 60;
const CAMERA_POSITION = new Vector3(-2, 1.6, 2);
const CAMERA_TARGET = new Vector3(0, 0.8, -1);
const ASSEMBLY_TIMEOUT_MS = 20_000;

interface StateChoices {
  phase?: number;
  register?: RegisterId;
  compare?: CompareId;
  view?: Partial<ViewOptions>;
}

function assemblyState(choices: StateChoices = {}) {
  const { phase = 0, register = 'middle', compare = 'grand', view = {} } = choices;
  const state = createPianoStore().getState();
  return createAssemblyState({
    ...state,
    phase,
    register,
    compare,
    view: { ...state.view, ...view },
  });
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
  return { rig, scene, shell: shell as unknown as PianoControllerDependencies };
}

async function builtController(choices: StateChoices = {}) {
  const fake = fakeShell();
  const controller = new PianoController(fake.shell);
  await controller.build(assemblyState(choices));
  return { ...fake, controller, assembly: lastAssembly() };
}

function rounded(vector: Vector3 | undefined): number[] | undefined {
  return vector?.toArray().map((value) => Number(value.toFixed(DIGITS)));
}

function expectedPose(view: CameraView): CameraPose {
  const { region, direction, margin } = CAMERA_VIEWS[view];
  const toward = new Vector3(...(direction as readonly [number, number, number])).normalize();
  return frameBox(lastAssembly().region(region), toward, FRAMING, margin);
}

describe('piano controller', { timeout: ASSEMBLY_TIMEOUT_MS }, () => {
  it('adds the assembly, attaches its labels and bounds the camera on the floor', async () => {
    const { rig, scene, shell, assembly } = await builtController();
    expect(scene.add).toHaveBeenCalledWith(assembly.root);
    expect(shell.labels.attach).toHaveBeenCalledWith(assembly.labelAnchors());
    const [bounds, floor] = rig.setBounds.mock.lastCall ?? [];
    expect(bounds).toEqual(assembly.region(BOUNDS_REGION));
    expect(floor).toBe(GROUND_Y);
  });

  it('frames nothing before the assembly exists', async () => {
    const { rig, shell } = fakeShell();
    const controller = new PianoController(shell);
    controller.views.frame('grand', false);
    expect(rig.jumpTo).not.toHaveBeenCalled();
    expect(rig.follow).not.toHaveBeenCalled();
  });

  it('frames every view on its region without following', async () => {
    const { rig, controller } = await builtController();
    for (const view of CAMERA_VIEW_IDS) {
      controller.views.frame(view, false);
      const expected = expectedPose(view);
      const pose = rig.jumpTo.mock.lastCall?.[0];
      expect(rounded(pose?.position), view).toEqual(rounded(expected.position));
      expect(rounded(pose?.target), view).toEqual(rounded(expected.target));
      expect(rig.follow).toHaveBeenLastCalledWith(null, undefined);
    }
  });

  it('tells the assembly which view it frames', async () => {
    const { controller, assembly } = await builtController();
    const focus = vi.spyOn(assembly, 'focus');
    for (const view of CAMERA_VIEW_IDS) {
      controller.views.frame(view, false);
      expect(focus).toHaveBeenLastCalledWith(view);
    }
  });

  it('tweens when animated', async () => {
    const { rig, controller } = await builtController();
    controller.views.frame('dampers', true);
    expect(rig.tweenTo).toHaveBeenCalledTimes(1);
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it('follows the hammer head while the toggle is on, through a new framing, then lets go', async () => {
    const { rig, controller, assembly } = await builtController();
    const hammer = assembly.anchor(FOLLOW_ANCHOR);
    controller.views.frame('action', false);
    controller.setState(assemblyState({ view: { follow: true } }));
    expect(rig.follow).toHaveBeenLastCalledWith(hammer);
    controller.views.frame('escapement', true);
    expect(rig.follow).toHaveBeenLastCalledWith(hammer);
    const calls = rig.follow.mock.calls.length;
    controller.setState(assemblyState({ phase: MOMENTS.letOff, view: { follow: true } }));
    expect(rig.follow).toHaveBeenCalledTimes(calls);
    controller.setState(assemblyState());
    expect(rig.follow).toHaveBeenLastCalledWith(null);
  });

  it('lifts the followed anchor with the hammer', async () => {
    const { controller, assembly } = await builtController();
    const hammer = assembly.anchor(FOLLOW_ANCHOR);
    const resting = hammer.getWorldPosition(new Vector3()).y;
    controller.setState(assemblyState({ phase: MOMENTS.strike }));
    expect(hammer.getWorldPosition(new Vector3()).y).toBeGreaterThan(resting);
  });

  it.each([
    ['the treble string', 'soundboard', 'treble'],
    ['the bass string', 'soundboard', 'bass'],
    ['the treble dampers', 'dampers', 'treble'],
    ['the bass dampers', 'dampers', 'bass'],
  ] as const)(
    'jumps to %s on the next frame with the cut and the played key',
    async (_case, view, register) => {
      const { rig, controller } = await builtController();
      controller.views.frame(view, false);
      const before = rig.jumpTo.mock.lastCall?.[0];
      controller.setState(assemblyState({ register }));
      controller.update(FRAME_SECONDS);
      const pose = rig.jumpTo.mock.lastCall?.[0];
      expect(rig.tweenTo).not.toHaveBeenCalled();
      expect(rounded(pose?.target)).toEqual(rounded(expectedPose(view).target));
      expect(rounded(pose?.target)).not.toEqual(rounded(before?.target));
    },
  );

  it.each([
    ['the ghost grows the action', 'action', { view: { ghost: true } }],
    ['the inset grows the escapement', 'escapement', { view: { inset: true } }],
    ['a compare chip picks the upright', 'lineUp', { compare: 'upright' }],
    ['a compare chip picks the harpsichord', 'lineUp', { compare: 'harpsichord' }],
  ] as const)('tweens the current view on the next frame when %s', async (_case, view, choices) => {
    const { rig, controller } = await builtController();
    controller.views.frame(view, false);
    const before = rig.jumpTo.mock.lastCall?.[0];
    controller.setState(assemblyState(choices));
    controller.update(FRAME_SECONDS);
    const pose = rig.tweenTo.mock.lastCall?.[0];
    expect(rig.jumpTo).toHaveBeenCalledTimes(1);
    expect(rounded(pose?.target)).toEqual(rounded(expectedPose(view).target));
    expect(rounded(pose?.target)).not.toEqual(rounded(before?.target));
  });

  it('lets a chapter that resets the register frame only its own view', async () => {
    const { rig, controller } = await builtController({ register: 'treble' });
    controller.views.frame('soundboard', false);
    controller.setState(assemblyState());
    controller.views.frame('lineUp', true);
    controller.update(FRAME_SECONDS);
    expect(rig.jumpTo).toHaveBeenCalledTimes(1);
    expect(rig.tweenTo).toHaveBeenCalledTimes(1);
    const pose = rig.tweenTo.mock.lastCall?.[0];
    expect(rounded(pose?.target)).toEqual(rounded(expectedPose('lineUp').target));
  });

  it.each([
    ['the register changes over the whole piano', 'grand', { register: 'treble' }],
    ['the ghost is shown beside the escapement', 'escapement', { view: { ghost: true } }],
    ['the hammer moves', 'action', { phase: MOMENTS.strike }],
    ['a compare chip is picked outside the line-up', 'action', { compare: 'upright' }],
  ] as const)('leaves the camera alone when %s', async (_case, view, choices) => {
    const { rig, controller } = await builtController();
    controller.views.frame(view, false);
    controller.setState(assemblyState(choices));
    controller.update(FRAME_SECONDS);
    expect(rig.tweenTo).not.toHaveBeenCalled();
    expect(rig.jumpTo).toHaveBeenCalledTimes(1);
  });

  it('updates the assembly with the camera distance', async () => {
    const { controller, assembly } = await builtController();
    const update = vi.spyOn(assembly, 'update');
    controller.update(FRAME_SECONDS);
    expect(update).toHaveBeenCalledWith(FRAME_SECONDS, CAMERA_POSITION.distanceTo(CAMERA_TARGET));
  });

  it('reports no motion without an assembly and removes it on dispose', async () => {
    const { scene, shell } = fakeShell();
    const controller = new PianoController(shell);
    expect(controller.update(FRAME_SECONDS)).toBe(false);
    await controller.build(assemblyState());
    const removed = vi.spyOn(scene.add.mock.lastCall?.[0] as Object3D, 'removeFromParent');
    controller.dispose();
    expect(removed).toHaveBeenCalled();
    expect(controller.update(FRAME_SECONDS)).toBe(false);
  });
});
