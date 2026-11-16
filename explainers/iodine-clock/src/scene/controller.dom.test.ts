import { Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { CameraPose } from '@core/scene/frameBox';
import { frameBox } from '@core/scene/frameBox';
import { MaterialLibrary } from '@core/scene/materials';
import { createSceneTextures } from '@core/scene/textures';
import { CAMERA_VIEW_IDS, VIEW_SCALE } from '../ids';
import type { AssemblyState, CameraView } from '../ids';
import { regionFromSpec } from '@core/scene/regions';
import { worldRegionSpec } from '../model';
import { createAssemblyState, createClockStore } from '../state';
import { CAMERA_VIEWS } from './cameraViews';
import { ClockController, FLOOR_Y } from './controller';
import type { ClockControllerDependencies } from './controller';

const FRAMING = { vertical: 0.2, horizontal: 0.27 };

function assemblyState(changes: Partial<AssemblyState> = {}): AssemblyState {
  return { ...createAssemblyState(createClockStore().getState()), ...changes };
}

function fakeShell() {
  const rig = {
    framing: () => FRAMING,
    follow: vi.fn(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn<(pose: CameraPose) => void>(),
    tweenTo: vi.fn<(pose: CameraPose) => void>(),
    setBounds: vi.fn<(bounds: Box3, floor: number) => void>(),
    camera: { position: new Vector3(0, 10, 40) },
    controls: { target: new Vector3(0, 8, 0) },
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
  return { rig, scene, shell: shell as unknown as ClockControllerDependencies };
}

function expectedPose(view: CameraView): CameraPose {
  const { region, direction, margin } = CAMERA_VIEWS[view];
  const toward = new Vector3(...(direction as readonly [number, number, number])).normalize();
  return frameBox(regionFromSpec(worldRegionSpec(region)), toward, FRAMING, margin);
}

describe('iodine clock controller', () => {
  it('adds the assembly, attaches its labels and bounds the camera on the bench', () => {
    const { rig, scene, shell } = fakeShell();
    new ClockController(shell).build(assemblyState());
    expect(scene.add).toHaveBeenCalledTimes(1);
    expect(shell.labels.attach).toHaveBeenCalledTimes(1);
    expect(rig.setBounds.mock.lastCall?.[1]).toBe(FLOOR_Y.beaker);
  });

  it('rebounds the camera only when the scale changes', () => {
    const { rig, shell } = fakeShell();
    const controller = new ClockController(shell);
    controller.build(assemblyState());
    controller.setState(assemblyState());
    expect(rig.setBounds).toHaveBeenCalledTimes(1);
    controller.setState(assemblyState({ scale: 'molecules' }));
    expect(rig.setBounds).toHaveBeenCalledTimes(2);
    expect(rig.setBounds.mock.lastCall?.[1]).toBe(FLOOR_Y.molecules);
  });

  it('frames nothing before the assembly exists', () => {
    const { rig, shell } = fakeShell();
    new ClockController(shell).views.frame('bench', false);
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it('frames every view on its own scale as a fixed view', () => {
    const { rig, shell } = fakeShell();
    const controller = new ClockController(shell);
    controller.build(assemblyState());
    CAMERA_VIEW_IDS.forEach((view) => {
      controller.views.frame(view, false, VIEW_SCALE[view]);
      expect(rig.jumpTo.mock.lastCall?.[0]).toEqual(expectedPose(view));
      expect(rig.follow).toHaveBeenLastCalledWith(null, undefined);
    });
  });

  it('frames the partner view on the other scale', () => {
    const { rig, shell } = fakeShell();
    const controller = new ClockController(shell);
    controller.build(assemblyState());
    controller.views.frame('bench', true, 'molecules');
    expect(rig.tweenTo.mock.lastCall?.[0]).toEqual(expectedPose('landolt'));
    controller.views.frame('helix', true);
    expect(rig.tweenTo.mock.lastCall?.[0]).toEqual(expectedPose('beaker'));
  });

  it('reports no motion without an assembly and removes it on dispose', () => {
    const { scene, shell } = fakeShell();
    const controller = new ClockController(shell);
    expect(controller.update(1)).toBe(false);
    controller.build(assemblyState());
    const removed = vi.spyOn(scene.add.mock.lastCall?.[0] as Object3D, 'removeFromParent');
    controller.dispose();
    expect(removed).toHaveBeenCalled();
    expect(controller.update(1)).toBe(false);
  });
});
