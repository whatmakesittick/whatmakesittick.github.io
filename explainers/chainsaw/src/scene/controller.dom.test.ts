import { Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { CameraPose } from '@core/scene/frameBox';
import { MaterialLibrary } from '@core/scene/materials';
import { createSceneTextures } from '@core/scene/textures';
import { CAMERA_VIEW_IDS } from '../ids';
import type { AssemblyState, RegionId } from '../ids';
import { createAssemblyState, createChainsawStore } from '../state';
import { createAssembly } from './assembly';
import { CAMERA_VIEWS, STAGE_VARIANTS, framedRegion } from './cameraViews';
import type { StageVariant } from './cameraViews';
import { ChainsawController } from './controller';
import type { ChainsawControllerDependencies } from './controller';

const FRAMING = { vertical: 0.2, horizontal: 0.27 };
const STAGE_WIDTH_PX: Readonly<Record<StageVariant, number>> = { phone: 390, desktop: 835 };
const DIRECTION_DIGITS = 6;

function assemblyState(changes: Partial<AssemblyState> = {}): AssemblyState {
  return { ...createAssemblyState(createChainsawStore().getState()), ...changes };
}

function regionBox(region: RegionId, state = assemblyState()): Box3 {
  const resources = { materials: new MaterialLibrary(), textures: createSceneTextures() };
  return createAssembly(resources, state).region(region);
}

function fakeShell(stageWidth: number = STAGE_WIDTH_PX.desktop) {
  const rig = {
    framing: () => FRAMING,
    follow: vi.fn<(anchor: Object3D | null, mode?: string) => void>(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn<(pose: CameraPose) => void>(),
    tweenTo: vi.fn<(pose: CameraPose) => void>(),
    setBounds: vi.fn<(bounds: Box3, floor: number) => void>(),
    camera: { position: new Vector3(0, 0.3, 1) },
    controls: { target: new Vector3(0, 0.1, 0) },
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
  return { rig, scene, shell: shell as unknown as ChainsawControllerDependencies };
}

function roundAll(values: readonly number[]): number[] {
  return values.map((value) => Number(value.toFixed(DIRECTION_DIGITS)));
}

function viewDirection(pose: CameraPose): number[] {
  return roundAll(pose.position.clone().sub(pose.target).normalize().toArray());
}

describe('chainsaw controller', () => {
  it('adds the assembly, attaches its labels and bounds the camera on the floor', () => {
    const { rig, scene, shell } = fakeShell();
    new ChainsawController(shell).build(assemblyState());
    expect(scene.add).toHaveBeenCalledTimes(1);
    expect(shell.labels.attach).toHaveBeenCalledTimes(1);
    const [bounds, floor] = rig.setBounds.mock.lastCall ?? [];
    expect(bounds).toEqual(regionBox('saw'));
    expect(floor).toBe(0);
  });

  it('rebounds the camera only when the setting changes', () => {
    const { rig, shell } = fakeShell();
    const controller = new ChainsawController(shell);
    controller.build(assemblyState());
    controller.setState(assemblyState());
    expect(rig.setBounds).toHaveBeenCalledTimes(1);
    controller.setState(assemblyState({ setting: 'bench' }));
    expect(rig.setBounds).toHaveBeenCalledTimes(2);
  });

  it('frames nothing before the assembly exists', () => {
    const { rig, shell } = fakeShell();
    new ChainsawController(shell).views.frame('sawSide', false);
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it.each(STAGE_VARIANTS)('frames every view on its region, still, for a %s stage', (variant) => {
    const { rig, shell } = fakeShell(STAGE_WIDTH_PX[variant]);
    const controller = new ChainsawController(shell);
    controller.build(assemblyState());
    for (const view of CAMERA_VIEW_IDS) {
      const spec = CAMERA_VIEWS[view];
      controller.views.frame(view, false);
      const pose = rig.jumpTo.mock.lastCall?.[0];
      const framed = framedRegion(regionBox(spec.region), spec.region, variant);
      expect(pose?.target).toEqual(framed?.getCenter(new Vector3()));
      const direction = new Vector3(...spec.direction[variant]).normalize();
      expect(pose && viewDirection(pose)).toEqual(roundAll(direction.toArray()));
      expect(rig.follow).toHaveBeenLastCalledWith(null, undefined);
    }
  });

  it('tweens when animated and honours an explicit variant', () => {
    const { rig, shell } = fakeShell(STAGE_WIDTH_PX.phone);
    const controller = new ChainsawController(shell);
    controller.build(assemblyState());
    controller.views.frame('barChain', true, 'desktop');
    const pose = rig.tweenTo.mock.lastCall?.[0];
    const desktop = new Vector3(...CAMERA_VIEWS.barChain.direction.desktop).normalize();
    expect(pose && viewDirection(pose)).toEqual(roundAll(desktop.toArray()));
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it('reports no motion without an assembly and removes it on dispose', () => {
    const { scene, shell } = fakeShell();
    const controller = new ChainsawController(shell);
    expect(controller.update(1)).toBe(false);
    controller.build(assemblyState());
    const removed = vi.spyOn(scene.add.mock.lastCall?.[0] as Object3D, 'removeFromParent');
    controller.dispose();
    expect(removed).toHaveBeenCalled();
    expect(controller.update(1)).toBe(false);
  });
});
