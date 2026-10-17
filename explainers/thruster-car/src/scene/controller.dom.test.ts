import { Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { frameBox } from '@core/scene/frameBox';
import type { CameraPose } from '@core/scene/frameBox';
import { MaterialLibrary } from '@core/scene/materials';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, RegionId } from '../ids';
import { MOMENTS } from '../model';
import { createAssemblyState, createThrusterCarStore } from '../state';
import { createAssembly } from './assembly';
import type { Assembly } from './assembly';
import { FIXED_VIEWS, FOLLOW_MODE, FOLLOW_VIEWS, carCentre } from './cameraViews';
import type { FixedView, FollowView } from './cameraViews';
import { BOUNDS_REGION, FLOOR_Y, ThrusterCarController } from './controller';
import type { ThrusterCarControllerDependencies } from './controller';

const FRAMING = { vertical: 0.2, horizontal: 0.13 };
const FOLLOW_IDS = Object.keys(FOLLOW_VIEWS) as FollowView[];
const FIXED_IDS = Object.keys(FIXED_VIEWS) as FixedView[];
const DIGITS = 9;

const RESTING_SECONDS = 16;

function assemblyState(phase = 0): AssemblyState {
  return createAssemblyState({ ...createThrusterCarStore().getState(), phase });
}

function assemblyAt(state: AssemblyState): Assembly {
  const resources = { materials: new MaterialLibrary(), textures: createSceneTextures() };
  return createAssembly(resources, state);
}

function regionBox(region: RegionId, state = assemblyState()): Box3 {
  return assemblyAt(state).region(region);
}

function fakeShell() {
  const rig = {
    framing: () => FRAMING,
    follow: vi.fn<(anchor: Object3D | null, mode?: string) => void>(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn<(pose: CameraPose) => void>(),
    tweenTo: vi.fn<(pose: CameraPose) => void>(),
    setBounds: vi.fn<(bounds: Box3, floor: number) => void>(),
    camera: { position: new Vector3(0, 3, 12) },
    controls: { target: new Vector3(0, 0.5, 0) },
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
  return { rig, scene, shell: shell as unknown as ThrusterCarControllerDependencies };
}

function rounded(vector: Vector3 | undefined): number[] | undefined {
  return vector?.toArray().map((value) => Number(value.toFixed(DIGITS)));
}

describe('thruster car controller', () => {
  it('adds the assembly, attaches its labels and bounds the camera on the site floor', () => {
    const { rig, scene, shell } = fakeShell();
    new ThrusterCarController(shell).build(assemblyState());
    expect(scene.add).toHaveBeenCalledTimes(1);
    expect(shell.labels.attach).toHaveBeenCalledTimes(1);
    const [bounds, floor] = rig.setBounds.mock.lastCall ?? [];
    expect(bounds).toEqual(regionBox(BOUNDS_REGION));
    expect(floor).toBe(FLOOR_Y);
  });

  it('frames nothing before the assembly exists', () => {
    const { rig, shell } = fakeShell();
    new ThrusterCarController(shell).views.frame('tankClose', false);
    new ThrusterCarController(shell).views.frame('siteWide', false);
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it.each([
    ['standing at the start', 0],
    ['upside down over the loop', MOMENTS.inverted],
  ])('aims every follow view at the car centre and rides along, %s', (_moment, phase) => {
    const { rig, shell } = fakeShell();
    const controller = new ThrusterCarController(shell);
    const state = assemblyState(phase);
    controller.build(state);
    const chase = assemblyAt(state).chaseTarget();
    for (const view of FOLLOW_IDS) {
      controller.views.frame(view, false);
      const pose = rig.jumpTo.mock.lastCall?.[0];
      expect(rounded(pose?.target), view).toEqual(rounded(carCentre(chase)));
      const [anchor, mode] = rig.follow.mock.lastCall ?? [];
      expect(mode).toBe(FOLLOW_MODE);
      expect(rounded(anchor?.getWorldPosition(new Vector3())), view).toEqual(rounded(pose?.target));
    }
  });

  it('frames the wide views on their regions without following', () => {
    const { rig, shell } = fakeShell();
    const controller = new ThrusterCarController(shell);
    controller.build(assemblyState());
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
    const { rig, shell } = fakeShell();
    const controller = new ThrusterCarController(shell);
    controller.build(assemblyState());
    controller.views.frame('flipChase', true);
    expect(rig.tweenTo).toHaveBeenCalledTimes(1);
    expect(rig.jumpTo).not.toHaveBeenCalled();
  });

  it('moves the followed car with each new state', () => {
    const { rig, shell } = fakeShell();
    const controller = new ThrusterCarController(shell);
    controller.build(assemblyState());
    controller.views.frame('boostSide', false);
    const anchor = rig.follow.mock.lastCall?.[0];
    const start = anchor?.getWorldPosition(new Vector3()).x ?? 0;
    controller.setState(assemblyState(MOMENTS.inverted));
    expect(anchor?.getWorldPosition(new Vector3()).x).toBeGreaterThan(start);
  });

  it('reports no motion without an assembly and removes it on dispose', () => {
    const { scene, shell } = fakeShell();
    const controller = new ThrusterCarController(shell);
    expect(controller.update(1)).toBe(false);
    controller.build(assemblyState(RESTING_SECONDS));
    expect(controller.update(1)).toBe(false);
    const removed = vi.spyOn(scene.add.mock.lastCall?.[0] as Object3D, 'removeFromParent');
    controller.dispose();
    expect(removed).toHaveBeenCalled();
    expect(controller.update(1)).toBe(false);
  });
});
