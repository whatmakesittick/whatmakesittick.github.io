import { Box3, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { BlackHoleController } from './controller';
import type { BlackHoleControllerDependencies } from './controller';

const { regions, prepared } = vi.hoisted(() => ({
  regions: new Map<string, unknown>(),
  prepared: { resolve: () => {} },
}));

vi.mock('./assembly', async () => {
  const { Box3: Bounds, Group, Object3D, Vector3: Point } = await import('three');
  regions.set('scene', new Bounds(new Point(-22, -22, -22), new Point(22, 22, 22)));
  regions.set('hole', new Bounds(new Point(-13, -3, -13), new Point(13, 3, 13)));
  const probe = new Object3D();
  probe.position.set(4, 3, 0);
  const ship = new Object3D();
  ship.position.set(16, 12, 0);
  return {
    createAssembly: () => ({
      root: new Group(),
      setState: vi.fn(),
      update: (_delta: number, distance: number) => distance > 0,
      labelAnchors: () => new Map(),
      anchor: (id: string) => (id === 'ship' ? ship : probe),
      region: (id: string) => (regions.get(id) as Box3 | undefined)?.clone() ?? new Bounds(),
      prepare: () => new Promise<void>((resolve) => (prepared.resolve = resolve)),
      dispose: vi.fn(),
    }),
  };
});

const SLOPES = { vertical: 0.29, horizontal: 0.45 };

const STATE: AssemblyState = {
  phase: 0,
  playing: false,
  view: { disc: true, sheet: false, labels: false },
};

function fakeShell() {
  const rig = {
    framing: () => SLOPES,
    follow: vi.fn(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn(),
    tweenTo: vi.fn(),
    setBounds: vi.fn(),
    camera: { position: new Vector3(0, 0, 40) },
    controls: { target: new Vector3() },
  };
  const shell = {
    scene: { add: vi.fn() },
    materials: {},
    textures: {},
    labels: { attach: vi.fn(), show: vi.fn() },
    rig,
    viewport: { renderer: {} },
    invalidate: vi.fn(),
  };
  return {
    rig,
    shell: shell as unknown as BlackHoleControllerDependencies,
    invalidate: shell.invalidate,
  };
}

describe('black hole controller', () => {
  it('adds the system to the scene and sizes the camera to the whole scene', () => {
    const { rig, shell } = fakeShell();
    const controller = new BlackHoleController(shell);
    controller.build(STATE);
    expect((shell.scene.add as unknown as ReturnType<typeof vi.fn>).mock.calls).toHaveLength(1);
    expect(shell.labels.attach).toHaveBeenCalledTimes(1);
    expect(rig.setBounds).toHaveBeenCalledWith(expect.any(Box3), Number.NEGATIVE_INFINITY);
  });

  it('asks for a frame once the lens is ready', async () => {
    const { shell, invalidate } = fakeShell();
    new BlackHoleController(shell).build(STATE);
    expect(invalidate).not.toHaveBeenCalled();
    prepared.resolve();
    await Promise.resolve();
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('frames a chapter region once the system is built', () => {
    const { rig, shell } = fakeShell();
    const controller = new BlackHoleController(shell);
    controller.views.frame('lens', true);
    expect(rig.tweenTo).not.toHaveBeenCalled();
    controller.build(STATE);
    controller.views.frame('lens', true);
    const target = rig.tweenTo.mock.lastCall?.[0]?.target as Vector3 | undefined;
    expect(target?.y).toBeCloseTo(0);
  });

  it('follows the probe from the probe view and looks from the ship in the ship view', () => {
    const { rig, shell } = fakeShell();
    const controller = new BlackHoleController(shell);
    controller.build(STATE);
    controller.views.frame('probe', false);
    expect(rig.follow).toHaveBeenLastCalledWith(
      expect.objectContaining({ position: expect.anything() }),
    );
    expect(rig.jumpTo.mock.lastCall?.[0]?.target).toEqual(new Vector3(4, 3, 0));
    controller.views.frame('ship', false);
    expect(rig.follow).toHaveBeenLastCalledWith(null);
    expect(rig.jumpTo.mock.lastCall?.[0]?.position).toEqual(new Vector3(16, 12, 0));
  });

  it('hands the camera distance to the assembly each frame', () => {
    const { shell } = fakeShell();
    const controller = new BlackHoleController(shell);
    expect(controller.update(0.016)).toBe(false);
    controller.build(STATE);
    expect(controller.update(0.016)).toBe(true);
  });
});
