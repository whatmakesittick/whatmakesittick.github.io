import { Object3D, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { SCROLL_WRAP_M } from '../model';
import { createAssemblyState, createRunStore } from '../state';
import { RunController } from './controller';
import type { RunControllerDependencies } from './controller';

const { disposed, anchors } = vi.hoisted(() => ({
  disposed: { count: 0 },
  anchors: { requested: [] as string[] },
}));

vi.mock('./assembly', async () => {
  const { Box3, Group, Object3D: Anchor, Vector3: Point } = await import('three');
  const bounds = new Box3(new Point(-1, 0, -1), new Point(1, 2, 1));
  return {
    createAssembly: () =>
      (function* () {
        yield;
        return {
          root: new Group(),
          setState: () => {},
          update: () => false,
          nameParts: () => {},
          fitTags: () => [],
          labelAnchors: () => new Map(),
          anchor: (id: string) => {
            anchors.requested.push(id);
            return new Anchor();
          },
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
    labels: { attach: vi.fn(), setKeepOut: vi.fn(), setObstacles: vi.fn() },
    rig: {
      setBounds: vi.fn(),
      follow: vi.fn(),
      camera: { position: new Vector3() },
      controls: { target: new Vector3() },
    },
    viewport: { onResize: vi.fn(() => () => {}), element: { closest: () => null } },
  };
  return shell as unknown as RunControllerDependencies & {
    scene: { add: ReturnType<typeof vi.fn> };
    rig: { setBounds: ReturnType<typeof vi.fn>; follow: ReturnType<typeof vi.fn> };
  };
}

function stateAt(phase: number, extra: Parameters<typeof createRunStore>[0] = {}) {
  return createAssemblyState(createRunStore({ phase, ...extra }).getState());
}

describe('run controller', () => {
  it('drops a scene that finishes building after the controller is disposed', async () => {
    const shell = fakeShell();
    const run = new RunController(shell);
    const building = run.build(stateAt(0));
    run.dispose();
    await building;
    expect(shell.scene.add).not.toHaveBeenCalled();
    expect(disposed.count).toBe(0);
  });

  it('adds the scene and bounds the camera above the road once built', async () => {
    const shell = fakeShell();
    const run = new RunController(shell);
    await run.build(stateAt(0));
    expect(shell.scene.add).toHaveBeenCalledTimes(1);
    expect(shell.rig.setBounds).toHaveBeenCalledTimes(1);
    expect(shell.rig.setBounds.mock.calls[0]?.[1]).toBeGreaterThanOrEqual(0);
    run.dispose();
  });

  it('advances the road by the stride distance the scrubber covers', () => {
    const run = new RunController(fakeShell());
    const first = stateAt(0);
    run.setState(first);
    const half = stateAt(500);
    run.setState(half);
    expect(half.scrollM).toBeCloseTo(first.reading.timing.strideLengthM / 2);
    const wrapped = stateAt(0);
    run.setState(wrapped);
    expect(wrapped.scrollM).toBeCloseTo(first.reading.timing.strideLengthM);
    expect(wrapped.scrollM).toBeLessThan(SCROLL_WRAP_M);
  });

  it('keeps the road still when the pace or the step rate changes with the scrubber still', () => {
    const run = new RunController(fakeShell());
    const store = createRunStore({ phase: 240, playing: false });
    const read = () => {
      const state = createAssemblyState(store.getState());
      run.setState(state);
      return state.scrollM;
    };
    const before = read();
    store.getState().setPace('fast');
    expect(read()).toBe(before);
    store.getState().setStepRate(10);
    expect(read()).toBe(before);
    store.getState().setPace('easy');
    store.getState().setStepRate(-10);
    expect(read()).toBe(before);
  });

  it('restarts the road on a rebuild', async () => {
    const run = new RunController(fakeShell());
    run.setState(stateAt(0));
    run.setState(stateAt(600));
    const rebuilt = stateAt(600);
    await run.build(rebuilt);
    expect(rebuilt.scrollM).toBe(0);
    run.dispose();
  });

  it('moves the camera to the road point when follow is switched off and back', async () => {
    const shell = fakeShell();
    const run = new RunController(shell);
    await run.build(stateAt(0));
    const off = stateAt(0);
    off.view.follow = false;
    run.setState(off);
    expect(shell.rig.follow).toHaveBeenCalledTimes(1);
    expect(anchors.requested.at(-1)).toBe('runner');
    run.setState(off);
    expect(shell.rig.follow).toHaveBeenCalledTimes(1);
    run.setState(stateAt(0));
    expect(shell.rig.follow).toHaveBeenCalledTimes(2);
    expect(anchors.requested.at(-1)).toBe('pelvis');
    expect(shell.rig.follow.mock.calls[1]?.[0]).toBeInstanceOf(Object3D);
    run.dispose();
  });
});
