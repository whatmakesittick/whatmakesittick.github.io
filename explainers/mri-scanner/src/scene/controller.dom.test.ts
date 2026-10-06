import { Box3, Vector3 } from 'three';
import type { Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { CameraPose } from '@core/scene/frameBox';
import { MaterialLibrary } from '@core/scene/materials';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, CameraView } from '../ids';
import { createAssemblyState, createMriScannerStore } from '../state';
import { createAssembly } from './assembly';
import { CAMERA_VIEWS, STAGE_VARIANTS } from './cameraViews';
import type { StageVariant } from './cameraViews';
import { MriScannerController } from './controller';
import type { MriScannerControllerDependencies } from './controller';

const FRAMING = { vertical: 0.2, horizontal: 0.27 };
const STAGE_WIDTH_PX: Readonly<Record<StageVariant, number>> = { phone: 390, desktop: 835 };
const DIRECTION_DIGITS = 6;
const VIEWS = Object.keys(CAMERA_VIEWS) as CameraView[];

function assemblyState(changes: Partial<AssemblyState> = {}): AssemblyState {
  return { ...createAssemblyState(createMriScannerStore().getState()), ...changes };
}

function regionBox(view: CameraView): Box3 {
  const resources = { materials: new MaterialLibrary(), textures: createSceneTextures() };
  return createAssembly(resources, assemblyState()).region(CAMERA_VIEWS[view].region);
}

function fakeShell(stageWidth: number = STAGE_WIDTH_PX.desktop) {
  const rig = {
    framing: () => FRAMING,
    follow: vi.fn(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn<(pose: CameraPose) => void>(),
    tweenTo: vi.fn<(pose: CameraPose) => void>(),
    setBounds: vi.fn<(bounds: Box3, floor: number) => void>(),
    camera: { position: new Vector3(0, 1, 6) },
    controls: { target: new Vector3(0, 1, 0) },
  };
  const scene = { add: vi.fn<(object: Object3D) => void>() };
  const shell = {
    scene,
    materials: new MaterialLibrary(),
    textures: createSceneTextures(),
    labels: { attach: vi.fn(), show: vi.fn() },
    rig,
    viewport: {
      renderer: { compileAsync: vi.fn(() => Promise.resolve()) },
      element: { clientWidth: stageWidth },
    },
  };
  return { rig, scene, shell: shell as unknown as MriScannerControllerDependencies };
}

function viewDirection(pose: CameraPose): number[] {
  return roundAll(pose.position.clone().sub(pose.target).normalize().toArray());
}

function roundAll(values: readonly number[]): number[] {
  return values.map((value) => Number(value.toFixed(DIRECTION_DIGITS)));
}

describe('mri scanner controller', () => {
  it('adds the assembly, attaches its labels and bounds the camera by the room', () => {
    const { rig, scene, shell } = fakeShell();
    new MriScannerController(shell).build(assemblyState());
    expect(scene.add).toHaveBeenCalledTimes(1);
    expect(shell.labels.attach).toHaveBeenCalledTimes(1);
    const [bounds, floor] = rig.setBounds.mock.lastCall ?? [];
    expect(bounds).toBeInstanceOf(Box3);
    expect(floor).toBe(bounds?.min.y);
  });

  it('frames nothing before the assembly exists', () => {
    const { rig, shell } = fakeShell();
    new MriScannerController(shell).views.frame('room', false);
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it.each(STAGE_VARIANTS)('frames every fixed view on its region for a %s stage', (variant) => {
    const { rig, shell } = fakeShell(STAGE_WIDTH_PX[variant]);
    const controller = new MriScannerController(shell);
    controller.build(assemblyState());
    for (const view of VIEWS) {
      controller.views.frame(view, false);
      const pose = rig.jumpTo.mock.lastCall?.[0];
      expect(pose?.target).toEqual(regionBox(view).getCenter(new Vector3()));
      const direction = new Vector3(...CAMERA_VIEWS[view].direction[variant]).normalize();
      expect(pose && viewDirection(pose)).toEqual(roundAll(direction.toArray()));
      expect(rig.follow).toHaveBeenLastCalledWith(null, undefined);
    }
  });

  it('tweens when animated and honours an explicit variant', () => {
    const { rig, shell } = fakeShell(STAGE_WIDTH_PX.phone);
    const controller = new MriScannerController(shell);
    controller.build(assemblyState());
    controller.views.frame('console', true, 'desktop');
    const pose = rig.tweenTo.mock.lastCall?.[0];
    const desktop = new Vector3(...CAMERA_VIEWS.console.direction.desktop).normalize();
    expect(pose && viewDirection(pose)).toEqual(roundAll(desktop.toArray()));
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it('reports no motion without an assembly and removes it on dispose', () => {
    const { scene, shell } = fakeShell();
    const controller = new MriScannerController(shell);
    expect(controller.update(1)).toBe(false);
    controller.build(assemblyState());
    const removed = vi.spyOn(scene.add.mock.lastCall?.[0] as Object3D, 'removeFromParent');
    controller.dispose();
    expect(removed).toHaveBeenCalledTimes(1);
    expect(controller.update(1)).toBe(false);
  });

  it('rebuilds without leaving the previous assembly behind', () => {
    const { scene, shell } = fakeShell();
    const controller = new MriScannerController(shell);
    controller.build(assemblyState());
    const first = scene.add.mock.lastCall?.[0];
    const removed = vi.spyOn(first as Object3D, 'removeFromParent');
    controller.build(assemblyState());
    expect(removed).toHaveBeenCalledTimes(1);
    expect(scene.add).toHaveBeenCalledTimes(2);
  });
});
