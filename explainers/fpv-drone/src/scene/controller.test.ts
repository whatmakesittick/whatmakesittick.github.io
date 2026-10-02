import { Box3, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { CHAPTER_CONTROL_DEFAULTS, DEFAULT_VIEW, sortieAt } from '../state';
import { FpvController } from './controller';
import type { FpvControllerDependencies } from './controller';

const { drone } = vi.hoisted(() => ({ drone: { position: [0, 0, 0] } }));

vi.mock('./assembly', async () => {
  const { Box3: Bounds, Group, Object3D, Vector3: Point } = await import('three');
  const anchor = new Object3D();
  return {
    createAssembly: () => ({
      root: new Group(),
      setState: vi.fn(),
      update: (_delta: number, distance: number) => distance > 0,
      labelAnchors: () => new Map(),
      anchor: () => anchor,
      region: () => new Bounds(new Point(-40, 0, -140), new Point(430, 90, 110)),
      chaseTarget: () => ({ position: drone.position, heading: 0, pitch: 0, roll: 0, span: 3.4 }),
      dispose: vi.fn(),
    }),
  };
});

const SLOPES = { vertical: 0.29, horizontal: 0.45 };

function state(): AssemblyState {
  const { flight, motors, battery, link } = sortieAt({ phase: 0, payload: 300 });
  return {
    phase: 0,
    flight,
    motors,
    battery,
    link,
    video: 'analogue',
    move: CHAPTER_CONTROL_DEFAULTS.move,
    playing: false,
    view: DEFAULT_VIEW,
  };
}

function fakeShell() {
  const rig = {
    framing: () => SLOPES,
    follow: vi.fn(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn(),
    tweenTo: vi.fn(),
    setBounds: vi.fn(),
    camera: { position: new Vector3(0, 0, 50) },
    controls: { target: new Vector3() },
  };
  const shell = {
    scene: { add: vi.fn() },
    materials: {},
    textures: {},
    labels: { attach: vi.fn(), show: vi.fn() },
    rig,
  };
  return { rig, shell: shell as unknown as FpvControllerDependencies };
}

describe('fpv controller', () => {
  it('adds the scene and sets the camera bounds to the whole field on the ground', () => {
    const { rig, shell } = fakeShell();
    const controller = new FpvController(shell);
    controller.build(state());
    expect(shell.scene.add).toHaveBeenCalledTimes(1);
    expect(shell.labels.attach).toHaveBeenCalledTimes(1);
    expect(rig.setBounds).toHaveBeenCalledWith(expect.any(Box3), 0);
  });

  it('frames a view around the drone and follows it once the scene is built', () => {
    const { rig, shell } = fakeShell();
    const controller = new FpvController(shell);
    controller.views.frame('chase', true);
    expect(rig.tweenTo).not.toHaveBeenCalled();
    drone.position = [100, 40, 0];
    controller.build(state());
    controller.views.frame('chase', true);
    const target = rig.tweenTo.mock.lastCall?.[0]?.target as Vector3 | undefined;
    expect(target?.toArray()).toEqual([100, 40, 0]);
    expect(rig.follow).toHaveBeenLastCalledWith(expect.anything(), 'heading');
  });

  it('frames the pilot view on the route region without following', () => {
    const { rig, shell } = fakeShell();
    const controller = new FpvController(shell);
    controller.build(state());
    controller.views.frame('pilot', false);
    expect(rig.follow).toHaveBeenLastCalledWith(null, undefined);
    expect(rig.jumpTo).toHaveBeenCalledTimes(1);
  });

  it('hands the camera distance to the assembly each frame', () => {
    const { shell } = fakeShell();
    const controller = new FpvController(shell);
    expect(controller.update(0.016)).toBe(false);
    controller.build(state());
    expect(controller.update(0.016)).toBe(true);
    controller.dispose();
    expect(controller.update(0.016)).toBe(false);
  });
});
