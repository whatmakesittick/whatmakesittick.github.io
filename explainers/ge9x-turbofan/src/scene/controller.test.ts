import { Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { createAssemblyState, createEngineStore } from '../state';
import { EngineController } from './controller';
import type { EngineControllerDependencies } from './controller';

const { disposed, build } = vi.hoisted(() => ({
  disposed: { count: 0 },
  build: { paced: false },
}));

vi.mock('./assembly', async () => {
  const { Box3, Group, Object3D, Vector3: Point } = await import('three');
  const bounds = new Box3(new Point(-1, -1, -1), new Point(1, 1, 1));
  return {
    createAssembly: () => {
      const assembly = {
        root: new Group(),
        setState: () => {},
        update: () => false,
        labelAnchors: () => new Map(),
        anchor: () => new Object3D(),
        region: () => bounds.clone(),
        dispose: () => (disposed.count += 1),
      };
      if (!build.paced) return assembly;
      return (function* () {
        yield;
        return assembly;
      })();
    },
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
      camera: { position: new Vector3(0, 0, 10) },
      controls: { target: new Vector3() },
    },
    viewport: {},
  };
  return shell as unknown as EngineControllerDependencies & {
    scene: { add: ReturnType<typeof vi.fn> };
    rig: { setBounds: ReturnType<typeof vi.fn> };
  };
}

function initial() {
  return createAssemblyState(createEngineStore().getState(), 'near');
}

describe('engine controller', () => {
  it('adds the assembly and bounds the camera by the whole scene', async () => {
    const shell = fakeShell();
    const engine = new EngineController(shell);
    await engine.build(initial());
    expect(shell.scene.add).toHaveBeenCalledTimes(1);
    expect(shell.rig.setBounds).toHaveBeenCalledTimes(1);
    build.paced = true;
    await engine.build(initial());
    expect(shell.scene.add).toHaveBeenCalledTimes(2);
    build.paced = false;
    expect(engine.update(0.016)).toBe(false);
    engine.dispose();
  });

  it('picks the level of detail from the camera distance', async () => {
    const shell = fakeShell();
    const engine = new EngineController(shell);
    expect(engine.detail()).toBe('near');
    shell.rig.camera.position.set(0, 0, 40);
    expect(engine.detail()).toBe('far');
  });

  it('drops an assembly that is built after the controller is disposed', async () => {
    const shell = fakeShell();
    disposed.count = 0;
    build.paced = true;
    const engine = new EngineController(shell);
    const building = engine.build(initial());
    engine.dispose();
    await building;
    expect(shell.scene.add).not.toHaveBeenCalled();
    expect(disposed.count).toBe(1);
    build.paced = false;
  });
});
