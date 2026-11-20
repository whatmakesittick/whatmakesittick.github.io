import { Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createAssemblyState, createSwimStore } from '../state';
import { SwimController } from './controller';
import type { SwimControllerDependencies } from './controller';

const { disposed } = vi.hoisted(() => ({ disposed: { count: 0 } }));

vi.mock('./assembly', async () => {
  const { Box3, Group, Object3D, Vector3: Point } = await import('three');
  const bounds = new Box3(new Point(-1, -1, -1), new Point(1, 1, 1));
  return {
    createAssembly: () =>
      (function* () {
        yield;
        return {
          root: new Group(),
          setState: () => {},
          update: () => false,
          labelAnchors: () => new Map(),
          anchor: () => new Object3D(),
          region: () => bounds.clone(),
          dispose: () => (disposed.count += 1),
        };
      })(),
  };
});

function fakeShell() {
  const shell = {
    scene: { add: vi.fn() },
    materials: {},
    textures: {},
    labels: { attach: vi.fn() },
    rig: {
      setBounds: vi.fn(),
      camera: { position: new Vector3() },
      controls: { target: new Vector3() },
    },
    viewport: {},
  };
  return shell as unknown as SwimControllerDependencies & {
    scene: { add: ReturnType<typeof vi.fn> };
    rig: { setBounds: ReturnType<typeof vi.fn> };
  };
}

describe('swim controller', () => {
  it('drops a scene that finishes building after the controller is disposed', async () => {
    const shell = fakeShell();
    const swim = new SwimController(shell);
    const building = swim.build(createAssemblyState(createSwimStore().getState()));
    swim.dispose();
    await building;
    expect(shell.scene.add).not.toHaveBeenCalled();
    expect(disposed.count).toBe(1);
  });

  it('adds the scene and bounds the camera by the floor once built', async () => {
    const shell = fakeShell();
    const swim = new SwimController(shell);
    await swim.build(createAssemblyState(createSwimStore().getState()));
    expect(shell.scene.add).toHaveBeenCalledTimes(1);
    expect(shell.rig.setBounds).toHaveBeenCalledTimes(1);
    expect(shell.rig.setBounds.mock.calls[0]?.[1]).toBeLessThan(0);
    swim.dispose();
  });
});
