import { Box3, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { RaptorController } from './controller';
import type { RaptorControllerDependencies } from './controller';

const { regions } = vi.hoisted(() => ({ regions: new Map<string, unknown>() }));

vi.mock('./assembly', async () => {
  const { Box3: Bounds, Group, Object3D, Vector3: Point } = await import('three');
  regions.set('scene', new Bounds(new Point(-160, -1800, -160), new Point(160, 16, 160)));
  regions.set('chamber', new Bounds(new Point(-30, -165, -25), new Point(30, -88, 25)));
  return {
    createAssembly: () => ({
      root: new Group(),
      setState: vi.fn(),
      update: (_delta: number, distance: number) => distance > 0,
      labelAnchors: () => new Map(),
      anchor: () => new Object3D(),
      region: (id: string) => (regions.get(id) as Box3 | undefined)?.clone() ?? new Bounds(),
      dispose: vi.fn(),
    }),
  };
});

const SLOPES = { vertical: 0.29, horizontal: 0.45 };

const STATE: AssemblyState = {
  phase: 0,
  propellant: 'methane',
  view: { cutaway: false, flow: false, flame: true, cluster: false, labels: false },
};

function fakeShell() {
  const rig = {
    framing: () => SLOPES,
    follow: vi.fn(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn(),
    tweenTo: vi.fn(),
    setBounds: vi.fn(),
    camera: { position: new Vector3(0, 0, 500) },
    controls: { target: new Vector3() },
  };
  const shell = {
    scene: { add: vi.fn() },
    materials: {},
    textures: {},
    labels: { attach: vi.fn(), show: vi.fn() },
    stage: { fit: vi.fn() },
    rig,
  };
  return { rig, shell: shell as unknown as RaptorControllerDependencies };
}

describe('raptor controller', () => {
  it('adds the engine to the scene and sizes the camera to the whole scene', () => {
    const { rig, shell } = fakeShell();
    const raptor = new RaptorController(shell);
    raptor.build(STATE);
    expect(shell.scene.add).toHaveBeenCalledTimes(1);
    expect(shell.labels.attach).toHaveBeenCalledTimes(1);
    expect(rig.setBounds).toHaveBeenCalledWith(expect.any(Box3), -1800);
  });

  it('frames a chapter region once the engine is built', () => {
    const { rig, shell } = fakeShell();
    const raptor = new RaptorController(shell);
    raptor.views.frame('chamber', true);
    expect(rig.tweenTo).not.toHaveBeenCalled();
    raptor.build(STATE);
    raptor.views.frame('chamber', true);
    const target = rig.tweenTo.mock.lastCall?.[0]?.target as Vector3 | undefined;
    expect(target?.y).toBeCloseTo((-165 + -88) / 2);
  });

  it('hands the camera distance to the assembly each frame', () => {
    const { shell } = fakeShell();
    const raptor = new RaptorController(shell);
    expect(raptor.update(0.016)).toBe(false);
    raptor.build(STATE);
    expect(raptor.update(0.016)).toBe(true);
  });
});
