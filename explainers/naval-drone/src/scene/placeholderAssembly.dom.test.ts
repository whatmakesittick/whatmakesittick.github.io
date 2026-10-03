import { describe, expect, it } from 'vitest';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, RegionId } from '../ids';
import { jetAt, throttleAt } from '../model/jet';
import { planingAt } from '../model/hull';
import { boatAt, companionsAt, poseAtDistance } from '../model/run';
import { seaAt } from '../model/sea';
import { createAssembly } from './assembly';

const ANCHORS: readonly AnchorId[] = [
  'boat',
  'dome',
  'stern',
  'ship',
  'satellite',
  'backupSatellite',
  'groundStation',
];
const REGIONS: readonly RegionId[] = ['scene', 'boat', 'ship', 'shore'];
const VIEW = { cutaway: false, flow: false, links: true, labels: true };

function stateAt(phase: number, patch: Partial<AssemblyState> = {}): AssemblyState {
  const boat = boatAt(phase);
  return {
    phase,
    playing: false,
    boat,
    planing: planingAt(boat.knots),
    jet: jetAt(throttleAt(boat.knots), boat.knots, 0, false),
    companions: companionsAt(phase),
    sea: seaAt('smooth'),
    link: { mode: 'satellite', ghost: null },
    fit: 'standard',
    view: VIEW,
    waterSection: false,
    wettedBar: false,
    ...patch,
  };
}

function build(state: AssemblyState) {
  return createAssembly(
    { materials: new MaterialLibrary(), textures: createSceneTextures() },
    state,
  );
}

describe('placeholder assembly', () => {
  it('has an anchor for every part, every named anchor and every region', () => {
    const assembly = build(stateAt(60));
    const anchors = assembly.labelAnchors();
    PART_IDS.forEach((id) => expect(anchors.has(id)).toBe(true));
    ANCHORS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    REGIONS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    assembly.dispose();
  });

  it('follows the boat and reports the chase target with its heave', () => {
    const state = stateAt(60);
    const assembly = build(state);
    const target = assembly.chaseTarget();
    expect(target.position[0]).toBeCloseTo(state.boat.position[0], 9);
    expect(target.position[1]).toBeCloseTo(state.planing.heave, 9);
    expect(target.heading).toBe(state.boat.heading);
    expect(target.length).toBe(5.5);
    expect(assembly.region('boat').containsPoint(assembly.anchor('boat').position)).toBe(true);
    assembly.dispose();
  });

  it('hides what is not drawn: rails, ghost, companions and beams', () => {
    const assembly = build(stateAt(60));
    const anchors = assembly.labelAnchors();
    const shown = (id: (typeof PART_IDS)[number]) => isShown(anchors.get(id)!);
    expect(shown('missileRails')).toBe(false);
    expect(shown('videoGhost')).toBe(false);
    expect(shown('companions')).toBe(false);
    expect(shown('satLink')).toBe(true);
    expect(shown('backupLink')).toBe(false);
    assembly.setState(
      stateAt(100, {
        fit: 'missile',
        link: { mode: 'backup', ghost: poseAtDistance(900) },
      }),
    );
    expect(shown('missileRails')).toBe(true);
    expect(shown('videoGhost')).toBe(true);
    expect(shown('companions')).toBe(true);
    expect(shown('satLink')).toBe(false);
    expect(shown('backupLink')).toBe(true);
    assembly.dispose();
  });

  it('keeps drawing only while the run plays or a trial holds the boat', () => {
    const assembly = build(stateAt(60));
    expect(assembly.update(1 / 60, 10)).toBe(false);
    assembly.setState(stateAt(60, { playing: true }));
    expect(assembly.update(1 / 60, 10)).toBe(true);
    const held = stateAt(60);
    assembly.setState({ ...held, boat: { ...held.boat, held: true } });
    expect(assembly.update(1 / 60, 10)).toBe(true);
    assembly.dispose();
  });
});
