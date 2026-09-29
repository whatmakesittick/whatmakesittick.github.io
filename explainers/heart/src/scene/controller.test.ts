import { Object3D, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState, ValveId } from '../ids';
import { createHeartStore } from '../state';
import { bindStore } from './bindings';
import { HeartController } from './controller';
import type { HeartControllerDependencies } from './controller';

const { valveAnchors } = vi.hoisted(() => ({ valveAnchors: new Map<string, unknown>() }));

vi.mock('./assembly', async () => {
  const { Box3, Group, Object3D: Anchor, Vector3: Point } = await import('three');
  const spots: Record<string, [number, number, number]> = {
    tricuspid: [-20, 0, 0],
    pulmonary: [-10, 20, 0],
    mitral: [15, 0, 0],
    aortic: [5, 20, 0],
  };
  Object.entries(spots).forEach(([valve, spot]) => {
    const anchor = new Anchor();
    anchor.position.set(...spot);
    anchor.updateMatrixWorld(true);
    valveAnchors.set(valve, anchor);
  });
  const bounds = new Box3(new Point(-60, -60, -60), new Point(60, 60, 60));
  return {
    createAssembly: () => ({
      root: new Group(),
      setState: () => {},
      update: () => false,
      labelAnchors: () => new Map(),
      anchor: (id: string) => valveAnchors.get(id) ?? new Anchor(),
      region: () => bounds.clone(),
      dispose: () => {},
    }),
  };
});

const SLOPES = { vertical: 0.29, horizontal: 0.45 };

function anchorOf(valve: ValveId): Object3D {
  const anchor = valveAnchors.get(valve);
  if (!(anchor instanceof Object3D)) throw new Error(`No anchor for ${valve}`);
  return anchor;
}

function fakeShell() {
  const rig = {
    framing: () => SLOPES,
    follow: vi.fn(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn(),
    tweenTo: vi.fn(),
    setBounds: vi.fn(),
    camera: { position: new Vector3() },
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
  return { rig, shell: shell as unknown as HeartControllerDependencies };
}

function stateWith(valve: ValveId): AssemblyState {
  return {
    time: 0,
    chamber: 'leftVentricle',
    valve,
    view: { cutaway: true, flow: true, conduction: false, labels: false },
  };
}

function lastTarget(tweenTo: ReturnType<typeof vi.fn>): Vector3 | undefined {
  return tweenTo.mock.lastCall?.[0]?.target;
}

describe('heart controller', () => {
  it('frames the picked valve even before the scene hears of the pick', () => {
    let picked: ValveId = 'mitral';
    const { rig, shell } = fakeShell();
    const heart = new HeartController(shell, () => picked);
    heart.build(stateWith('mitral'));
    picked = 'aortic';
    heart.views.frame('valve', true);
    expect(rig.follow).toHaveBeenLastCalledWith(anchorOf('aortic'));
    expect(lastTarget(rig.tweenTo)?.distanceTo(anchorOf('aortic').position)).toBeCloseTo(0);
  });

  it('follows each valve chip to its own valve in the valves chapter', () => {
    const { rig, shell } = fakeShell();
    const store = createHeartStore();
    const heart = new HeartController(shell, () => store.getState().valve);
    bindStore(store, {
      heart,
      labelVisibility: { setWanted: vi.fn() },
      highlighter: { setHighlight: vi.fn() },
      labels: { show: vi.fn() },
    });
    store.getState().applyPreset('valves');
    (['tricuspid', 'pulmonary', 'aortic', 'mitral'] as const).forEach((valve) => {
      store.getState().setValve(valve);
      expect(rig.follow, valve).toHaveBeenLastCalledWith(anchorOf(valve));
      expect(lastTarget(rig.tweenTo)?.distanceTo(anchorOf(valve).position), valve).toBeCloseTo(0);
    });
  });
});
