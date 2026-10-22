import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, PartId, PowerFlowId } from '../../../ids';
import { BEAM_M, SECTION_M, STATIONS, motionAt } from '../../../model';
import { RESTING_NUDGE } from '../nudge';
import type { Frame, PartContext, Section } from '../context';
import { buildLine } from '.';

const FRAME: Frame = { delta: 1 / 60, cameraDistance: 30, nudge: RESTING_NUDGE };
const CRUISE_UNITS = 500;

interface Overrides {
  units?: number;
  playing?: boolean;
  flow?: PowerFlowId;
  wave?: boolean;
  reversed?: boolean;
}

function stateAt({
  units = CRUISE_UNITS,
  playing = false,
  flow = 'none',
  wave = true,
  reversed = false,
}: Overrides): AssemblyState {
  const motion = motionAt(units, 'kmh430', 'regen');
  const sectionIndex = Math.floor(motion.distance / SECTION_M);
  return {
    phase: units,
    playing,
    topSpeed: 'kmh430',
    brakeMode: 'regen',
    motion,
    wave: {
      on: true,
      reversed,
      hz: 0,
      sectionIndex,
      nextSectionIndex: null,
      sectionStart: sectionIndex * SECTION_M,
      sectionEnd: (sectionIndex + 1) * SECTION_M,
    },
    power: { flow, onboard: 'generator', eddy: false },
    ghost: { distance: 0, speedKmh: 0, behind: 0 },
    nudge: { id: null, token: 0 },
    compare: 'transrapid',
    view: { wave, gap: false, ghost: false, labels: true, cutaway: false, lineUp: false },
  };
}

let materials: MaterialLibrary;
let tracker: ResourceTracker;
let textures: ReturnType<typeof createSceneTextures>;
let context: PartContext;
let line: Section;

function named(name: string): Object3D {
  const found = line.root.getObjectByName(name);
  if (!found) throw new Error(`No ${name}`);
  return found;
}

function labelShown(id: PartId): boolean {
  const anchor = context.labels.get(id);
  if (!anchor) throw new Error(`No label for ${id}`);
  return isShown(anchor);
}

beforeAll(() => {
  materials = new MaterialLibrary();
  tracker = new ResourceTracker();
  textures = createSceneTextures();
  context = { materials, tracker, textures, labels: new Map(), anchors: {} };
  line = buildLine(context);
});

afterAll(() => {
  tracker.dispose();
  textures.dispose();
  materials.dispose();
});

describe('line section', () => {
  it('slides the guideway toward -x as the train travels', () => {
    const stream = named('guidewayStream');
    line.setState(stateAt({ units: 200 }));
    const before = stream.position.x;
    const travelled = motionAt(200, 'kmh430', 'regen').distance;
    const step = BEAM_M / 4;
    const later = { ...stateAt({ units: 200 }) };
    later.motion = { ...later.motion, distance: travelled + step };
    line.setState(later);
    const after = stream.position.x;
    expect((before - after + BEAM_M) % BEAM_M).toBeCloseTo(step);
  });

  it('surrounds the train with Longyang Road at the start and hides the airport', () => {
    line.setState(stateAt({ units: 0 }));
    const longyang = named('station-longyangRoad');
    const position = longyang.getWorldPosition(new Vector3());
    expect(isShown(longyang)).toBe(true);
    expect(Math.abs(position.x)).toBeLessThan(STATIONS.platformLength / 2);
    expect(isShown(named('station-airport'))).toBe(false);
    expect(labelShown('stations')).toBe(true);
  });

  it('drifts the wave only while playing with the wave shown', () => {
    line.setState(stateAt({ playing: true }));
    expect(line.animate?.(FRAME, stateAt({ playing: true }))).toBe(true);
    line.setState(stateAt({ playing: false }));
    expect(line.animate?.(FRAME, stateAt({ playing: false }))).toBe(false);
    line.setState(stateAt({ playing: true, wave: false }));
    expect(line.animate?.(FRAME, stateAt({ playing: true, wave: false }))).toBe(false);
    expect(labelShown('travellingWave')).toBe(false);
  });

  it('streams the power arrows for drive and regen only while playing', () => {
    (['drive', 'regen'] as const).forEach((flow) => {
      const playing = stateAt({ flow, wave: false, playing: true });
      line.setState(playing);
      expect(line.animate?.(FRAME, playing)).toBe(true);
      expect(labelShown('powerFlow')).toBe(true);
      const paused = stateAt({ flow, wave: false });
      line.setState(paused);
      expect(line.animate?.(FRAME, paused)).toBe(false);
    });
    const battery = stateAt({ flow: 'battery', wave: false, playing: true });
    line.setState(battery);
    expect(line.animate?.(FRAME, battery)).toBe(false);
    expect(labelShown('powerFlow')).toBe(false);
  });

  it('shows the cut cap only with the cutaway on', () => {
    const cap = named('guidewayCut');
    const base = stateAt({});
    line.setState({ ...base, view: { ...base.view, cutaway: true } });
    expect(cap.visible).toBe(true);
    line.setState(base);
    expect(cap.visible).toBe(false);
  });
});
