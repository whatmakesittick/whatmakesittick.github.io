import { Box3, Vector3 } from 'three';
import { describe, expect, it, vi } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState } from '../ids';
import { HELD_PHASE } from '../model';
import { CHAPTER_CONTROL_DEFAULTS, DEFAULT_VIEW, runAt } from '../state';
import { NavalDroneController } from './controller';
import type { NavalDroneControllerDependencies } from './controller';

const PHONE = { vertical: 0.2, horizontal: 0.27 };
const LEVEL_LIMIT = Math.PI / 2;

function assemblyState(changes: Partial<AssemblyState> = {}): AssemblyState {
  const reading = runAt({ ...CHAPTER_CONTROL_DEFAULTS, phase: HELD_PHASE, preset: 'overview' });
  return {
    phase: HELD_PHASE,
    playing: false,
    boat: reading.boat,
    planing: reading.planing,
    jet: reading.jet,
    companions: reading.companions,
    sea: reading.sea,
    link: reading.link,
    fit: 'standard',
    view: DEFAULT_VIEW,
    waterSection: true,
    wettedBar: false,
    ...changes,
  };
}

function fakeShell() {
  const rig = {
    framing: () => PHONE,
    follow: vi.fn(),
    setDistanceLimits: vi.fn(),
    jumpTo: vi.fn(),
    tweenTo: vi.fn(),
    setBounds: vi.fn(),
    camera: { position: new Vector3(0, 0, 30) },
    controls: { target: new Vector3(), maxPolarAngle: LEVEL_LIMIT },
  };
  const shell = {
    scene: { add: vi.fn() },
    materials: new MaterialLibrary(),
    textures: createSceneTextures(),
    labels: { attach: vi.fn(), show: vi.fn() },
    rig,
    viewport: { renderer: { compileAsync: vi.fn(() => Promise.resolve()) } },
  };
  return { rig, shell: shell as unknown as NavalDroneControllerDependencies };
}

describe('naval drone controller', () => {
  it('adds the scene and keeps the camera target above the sea floor of the bounds', () => {
    const { rig, shell } = fakeShell();
    const navalDrone = new NavalDroneController(shell);
    navalDrone.build(assemblyState());
    expect(shell.scene.add).toHaveBeenCalledTimes(1);
    expect(shell.labels.attach).toHaveBeenCalledTimes(1);
    const [bounds, floor] = rig.setBounds.mock.lastCall ?? [];
    expect(bounds).toBeInstanceOf(Box3);
    expect(floor).toBe((bounds as Box3).min.y);
    expect(floor).toBeLessThan(0);
  });

  it('frames a view around the boat and follows it once the scene is built', () => {
    const { rig, shell } = fakeShell();
    const navalDrone = new NavalDroneController(shell);
    navalDrone.views.frame('chase', true);
    expect(rig.tweenTo).not.toHaveBeenCalled();
    const state = assemblyState();
    navalDrone.build(state);
    navalDrone.views.frame('chase', true);
    const target = rig.tweenTo.mock.lastCall?.[0]?.target as Vector3 | undefined;
    expect(target?.x).toBeCloseTo(state.boat.position[0], 1);
    expect(rig.follow).toHaveBeenLastCalledWith(expect.anything());
    expect(rig.setDistanceLimits).toHaveBeenLastCalledWith({});
  });

  it('rides the deck in the eye view so the camera moves with the waves', () => {
    const { rig, shell } = fakeShell();
    const navalDrone = new NavalDroneController(shell);
    navalDrone.build(assemblyState());
    navalDrone.views.frame('eye', false);
    const eyeAnchor = rig.follow.mock.lastCall?.[0] as Vector3 | undefined;
    navalDrone.views.frame('chase', false);
    const boatAnchor = rig.follow.mock.lastCall?.[0] as Vector3 | undefined;
    expect(eyeAnchor).toBeDefined();
    expect(eyeAnchor).not.toBe(boatAnchor);
  });

  it('lets the sky view look up without the camera reaching the sea, then levels again', () => {
    const { rig, shell } = fakeShell();
    const navalDrone = new NavalDroneController(shell);
    navalDrone.build(assemblyState());
    navalDrone.views.frame('sky', false);
    expect(rig.controls.maxPolarAngle).toBeGreaterThan(LEVEL_LIMIT);
    const limits = rig.setDistanceLimits.mock.lastCall?.[0] as { max: number };
    expect(limits.max).toBeGreaterThan(0);
    navalDrone.views.frame('stern', true);
    expect(rig.controls.maxPolarAngle).toBe(LEVEL_LIMIT);
    expect(rig.setDistanceLimits).toHaveBeenLastCalledWith({ min: 1.2, max: 30 });
  });

  it('keeps drawing frames while the run plays or the reader holds the boat', () => {
    const { shell } = fakeShell();
    const navalDrone = new NavalDroneController(shell);
    expect(navalDrone.update(0.016)).toBe(false);
    navalDrone.build(assemblyState());
    expect(navalDrone.update(0.016)).toBe(false);
    navalDrone.setState(assemblyState({ playing: true }));
    expect(navalDrone.update(0.016)).toBe(true);
    const held = assemblyState();
    navalDrone.setState({ ...held, boat: { ...held.boat, held: true } });
    expect(navalDrone.update(0.016)).toBe(true);
    navalDrone.dispose();
    expect(navalDrone.update(0.016)).toBe(false);
  });
});
