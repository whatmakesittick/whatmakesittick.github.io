import { Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import type { FramingSlopes } from '@core/scene/lens';
import { MaterialLibrary } from '@core/scene/materials';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, CameraView, RegionId } from '../ids';
import { createAssemblyState, createWindFarmStore } from '../state';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { CAMERA_VIEWS, STAGE_VARIANTS } from './cameraViews';
import type { StageVariant } from './cameraViews';
import { WindFarmController } from './controller';
import type { WindFarmControllerDependencies } from './controller';

const FRAMING = { vertical: 0.2, horizontal: 0.27 };
const STAGE_SLOPES: Readonly<Record<StageVariant, FramingSlopes>> = {
  phone: { vertical: 0.75, horizontal: 0.38 },
  desktop: { vertical: 0.42, horizontal: 0.75 },
};
const STAGE_WIDTH_PX: Readonly<Record<StageVariant, number>> = { phone: 390, desktop: 835 };
const DIRECTION_DIGITS = 6;
const VIEWS = Object.keys(CAMERA_VIEWS) as CameraView[];

function assemblyState(changes: Partial<AssemblyState> = {}): AssemblyState {
  return { ...createAssemblyState(createWindFarmStore().getState()), ...changes };
}

function referenceAssembly(): Assembly {
  const resources = { materials: new MaterialLibrary(), textures: createSceneTextures() };
  return createAssembly(resources, assemblyState());
}

function regionBox(region: RegionId): Box3 {
  return referenceAssembly().region(region);
}

function fakeShell(stageWidth: number = STAGE_WIDTH_PX.desktop) {
  const rig = {
    framing: () => FRAMING,
    follow: vi.fn<(anchor: Object3D | null, mode?: string) => void>(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn<(pose: CameraPose) => void>(),
    tweenTo: vi.fn<(pose: CameraPose) => void>(),
    setBounds: vi.fn<(bounds: Box3, floor: number) => void>(),
    camera: { position: new Vector3(0, 100, 600) },
    controls: { target: new Vector3(0, 100, 0) },
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
  return { rig, scene, shell: shell as unknown as WindFarmControllerDependencies };
}

function viewDirection(pose: CameraPose): number[] {
  return roundAll(pose.position.clone().sub(pose.target).normalize().toArray());
}

function roundAll(values: readonly number[]): number[] {
  return values.map((value) => Number(value.toFixed(DIRECTION_DIGITS)));
}

describe('wind farm controller', () => {
  it('adds the assembly, attaches its labels and bounds the camera by the shown scene', () => {
    const { rig, scene, shell } = fakeShell();
    new WindFarmController(shell).build(assemblyState());
    expect(scene.add).toHaveBeenCalledTimes(1);
    expect(shell.labels.attach).toHaveBeenCalledTimes(1);
    const [bounds, floor] = rig.setBounds.mock.lastCall ?? [];
    expect(bounds).toEqual(regionBox('farm'));
    expect(floor).toBe(bounds?.min.y);
  });

  it('rebounds the camera only when the scene swaps', () => {
    const { rig, shell } = fakeShell();
    const controller = new WindFarmController(shell);
    controller.build(assemblyState());
    controller.setState(assemblyState());
    expect(rig.setBounds).toHaveBeenCalledTimes(1);
    controller.setState(assemblyState({ scene: 'turbine' }));
    expect(rig.setBounds).toHaveBeenCalledTimes(2);
    expect(rig.setBounds.mock.lastCall?.[0]).toEqual(regionBox('turbine'));
  });

  it('frames nothing before the assembly exists', () => {
    const { rig, shell } = fakeShell();
    new WindFarmController(shell).views.frame('farmAerial', false);
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it.each(STAGE_VARIANTS)('frames every view on its region for a %s stage', (variant) => {
    const { rig, shell } = fakeShell(STAGE_WIDTH_PX[variant]);
    const controller = new WindFarmController(shell);
    controller.build(assemblyState());
    for (const view of VIEWS) {
      const spec = CAMERA_VIEWS[view];
      controller.views.frame(view, false);
      const pose = rig.jumpTo.mock.lastCall?.[0];
      expect(pose?.target).toEqual(regionBox(spec.region).getCenter(new Vector3()));
      const direction = new Vector3(...spec.direction[variant]).normalize();
      expect(pose && viewDirection(pose)).toEqual(roundAll(direction.toArray()));
      expect(rig.setDistanceLimits).toHaveBeenLastCalledWith(spec.distance);
    }
  });

  it('turns the close-up views with the yaw pivot and keeps the rest still', () => {
    const { rig, scene, shell } = fakeShell();
    const controller = new WindFarmController(shell);
    controller.build(assemblyState());
    const root = scene.add.mock.lastCall?.[0];
    for (const view of VIEWS) {
      controller.views.frame(view, false);
      const [anchor, mode] = rig.follow.mock.lastCall ?? [];
      if (CAMERA_VIEWS[view].follow) {
        expect(anchor && root?.getObjectById(anchor.id), view).toBe(anchor);
        expect(mode, view).toBe('heading');
      } else expect(anchor, view).toBeNull();
    }
  });

  it.each(STAGE_VARIANTS)('starts every view inside its zoom limits on a %s', (variant) => {
    const direction = (view: CameraView) =>
      new Vector3(...CAMERA_VIEWS[view].direction[variant]).normalize();
    for (const view of VIEWS) {
      const { region, margin, distance } = CAMERA_VIEWS[view];
      const pose = frameBox(regionBox(region), direction(view), STAGE_SLOPES[variant], margin);
      const reach = pose.position.distanceTo(pose.target);
      expect(reach, view).toBeGreaterThanOrEqual(distance?.min ?? 0);
      expect(reach, view).toBeLessThanOrEqual(distance?.max ?? Infinity);
    }
  });

  it('tweens when animated and honours an explicit variant', () => {
    const { rig, shell } = fakeShell(STAGE_WIDTH_PX.phone);
    const controller = new WindFarmController(shell);
    controller.build(assemblyState());
    controller.views.frame('gridSubstation', true, 'desktop');
    const pose = rig.tweenTo.mock.lastCall?.[0];
    const desktop = new Vector3(...CAMERA_VIEWS.gridSubstation.direction.desktop).normalize();
    expect(pose && viewDirection(pose)).toEqual(roundAll(desktop.toArray()));
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it('reports no motion without an assembly and removes it on dispose', () => {
    const { scene, shell } = fakeShell();
    const controller = new WindFarmController(shell);
    expect(controller.update(1)).toBe(false);
    controller.build(assemblyState());
    const removed = vi.spyOn(scene.add.mock.lastCall?.[0] as Object3D, 'removeFromParent');
    controller.dispose();
    expect(removed).toHaveBeenCalledTimes(1);
    expect(controller.update(1)).toBe(false);
  });

  it('rebuilds without leaving the previous assembly behind', () => {
    const { rig, scene, shell } = fakeShell();
    const controller = new WindFarmController(shell);
    controller.build(assemblyState());
    const first = scene.add.mock.lastCall?.[0];
    const removed = vi.spyOn(first as Object3D, 'removeFromParent');
    controller.build(assemblyState());
    expect(removed).toHaveBeenCalledTimes(1);
    expect(scene.add).toHaveBeenCalledTimes(2);
    expect(rig.setBounds).toHaveBeenCalledTimes(2);
  });
});
