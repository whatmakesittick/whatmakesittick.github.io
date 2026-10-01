import { Box3, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { motionAt, shotAt } from '../model';
import { RifleController } from './controller';
import type { RifleControllerDependencies } from './controller';

const { regions } = vi.hoisted(() => ({ regions: new Map<string, unknown>() }));

vi.mock('./assembly', async () => {
  const { Box3: Bounds, Group, Object3D, Vector3: Point } = await import('three');
  regions.set('scene', new Bounds(new Point(-585, -300, -120), new Point(535, 168, 120)));
  regions.set('chamber', new Bounds(new Point(-20, -30, -20), new Point(80, 40, 20)));
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
  time: 0,
  shot: shotAt(0),
  motion: motionAt(0, 'open'),
  gasPort: 'open',
  playing: false,
  view: { cutaway: false, gas: true, trail: true, labels: true },
};

function fakeShell() {
  const rig = {
    framing: () => SLOPES,
    follow: vi.fn(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn(),
    tweenTo: vi.fn(),
    setBounds: vi.fn(),
    camera: { position: new Vector3(0, 0, 900) },
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
  return { rig, shell: shell as unknown as RifleControllerDependencies };
}

describe('rifle controller', () => {
  it('adds the rifle to the scene and sets the camera and the floor to the whole scene', () => {
    const { rig, shell } = fakeShell();
    const rifle = new RifleController(shell);
    rifle.build(STATE);
    expect(shell.scene.add).toHaveBeenCalledTimes(1);
    expect(shell.labels.attach).toHaveBeenCalledTimes(1);
    expect(rig.setBounds).toHaveBeenCalledWith(expect.any(Box3), -300);
    expect(shell.stage.fit).toHaveBeenCalledWith(expect.any(Box3), -300);
  });

  it('frames a chapter region once the rifle is built', () => {
    const { rig, shell } = fakeShell();
    const rifle = new RifleController(shell);
    rifle.views.frame('cartridge', true);
    expect(rig.tweenTo).not.toHaveBeenCalled();
    rifle.build(STATE);
    rifle.views.frame('cartridge', true);
    const target = rig.tweenTo.mock.lastCall?.[0]?.target as Vector3 | undefined;
    expect(target?.x).toBeCloseTo(30);
  });

  it('hands the camera distance to the assembly each frame', () => {
    const { shell } = fakeShell();
    const rifle = new RifleController(shell);
    expect(rifle.update(0.016)).toBe(false);
    rifle.build(STATE);
    expect(rifle.update(0.016)).toBe(true);
    rifle.dispose();
    expect(rifle.update(0.016)).toBe(false);
  });
});
