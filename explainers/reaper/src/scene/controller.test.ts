import { Box3, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import type { AssemblyState } from '../ids';
import { flightAt, sensorAt, strikeAt } from '../model';
import { ReaperController } from './controller';
import type { ReaperControllerDependencies } from './controller';

const { aircraft } = vi.hoisted(() => ({ aircraft: { position: [0, 0, 0] } }));

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
      region: () => new Bounds(new Point(-400, 0, -400), new Point(1400, 520, 700)),
      chaseTarget: () => ({
        position: aircraft.position,
        heading: 0,
        span: 20.1,
        target: [1000, 0, 150],
      }),
      dispose: vi.fn(),
    }),
  };
});

const SLOPES = { vertical: 0.29, horizontal: 0.45 };

const STATE: AssemblyState = {
  phase: 0,
  clock: 0,
  flight: flightAt(0),
  strike: strikeAt(0),
  sensor: sensorAt(0, 'day'),
  link: 'los',
  load: 'armed',
  playing: false,
  view: { cutaway: false, links: true, track: true, labels: true },
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
    rig,
  };
  return { rig, shell: shell as unknown as ReaperControllerDependencies };
}

describe('reaper controller', () => {
  it('adds the scene and sets the camera bounds to the whole diorama on the ground', () => {
    const { rig, shell } = fakeShell();
    const reaper = new ReaperController(shell);
    reaper.build(STATE);
    expect(shell.scene.add).toHaveBeenCalledTimes(1);
    expect(shell.labels.attach).toHaveBeenCalledTimes(1);
    expect(rig.setBounds).toHaveBeenCalledWith(expect.any(Box3), 0);
  });

  it('frames a view around the aircraft and follows it once the scene is built', () => {
    const { rig, shell } = fakeShell();
    const reaper = new ReaperController(shell);
    reaper.views.frame('chase', true);
    expect(rig.tweenTo).not.toHaveBeenCalled();
    aircraft.position = [500, 300, 0];
    reaper.build(STATE);
    reaper.views.frame('chase', true);
    const target = rig.tweenTo.mock.lastCall?.[0]?.target as Vector3 | undefined;
    expect(target?.toArray()).toEqual([500, 300, 0]);
    expect(rig.follow).toHaveBeenLastCalledWith(expect.anything());
  });

  it('hands the camera distance to the assembly each frame', () => {
    const { shell } = fakeShell();
    const reaper = new ReaperController(shell);
    expect(reaper.update(0.016)).toBe(false);
    reaper.build(STATE);
    expect(reaper.update(0.016)).toBe(true);
    reaper.dispose();
    expect(reaper.update(0.016)).toBe(false);
  });
});
