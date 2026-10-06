import { describe, expect, it } from 'vitest';
import { FIELD_IDS, WEIGHTING_IDS } from '../ids';
import {
  CYCLE_UNITS,
  FIELDS,
  MOMENTS,
  PHASE_RANGES,
  SPIN_COUNT,
  echoAmplitude,
  gradientLevel,
  magnetisation,
  pictureFor,
} from '../model';
import {
  CHOSEN_AXIS_LEVEL,
  PRECESSION_TURNS_PER_CYCLE,
  axisLevel,
  createAssemblyState,
  followedAxis,
  lineShare,
  pictureVersionOf,
  precessionAngle,
  timeGauge,
  writeAssemblyState,
} from './derived';
import type { AssemblySource } from './derived';
import { DEFAULT_VIEW } from './store';

const ENCODING = (PHASE_RANGES.encode[0] + PHASE_RANGES.encode[1]) / 2;
const RECOVERING = (PHASE_RANGES.recover[0] + PHASE_RANGES.recover[1]) / 2;

function sourceAt(changes: Partial<AssemblySource> = {}): AssemblySource {
  return {
    phase: MOMENTS.echoPeak,
    playing: true,
    field: 'field15',
    weighting: 't2',
    tipAngle: 90,
    tissue: 'whiteMatter',
    gradientAxis: null,
    linesFilled: 24,
    view: { ...DEFAULT_VIEW },
    ...changes,
  };
}

describe('readings', () => {
  it('follows the sequence gradient unless an axis is chosen', () => {
    expect(followedAxis(null, ENCODING)).toBe('y');
    expect(followedAxis(null, RECOVERING)).toBeNull();
    expect(followedAxis('x', RECOVERING)).toBe('x');
  });

  it('ramps a followed gradient and holds a chosen one fully on', () => {
    expect(axisLevel(null, ENCODING)).toBe(gradientLevel(ENCODING));
    expect(axisLevel('z', RECOVERING)).toBe(CHOSEN_AXIS_LEVEL);
  });

  it('turns the spins a whole number of times per loop so the wrap is seamless', () => {
    expect(Number.isInteger(PRECESSION_TURNS_PER_CYCLE)).toBe(true);
    expect(precessionAngle(0)).toBeCloseTo(0, 9);
    expect(Math.cos(precessionAngle(CYCLE_UNITS))).toBeCloseTo(1, 9);
  });

  it('gives each scan and line count its own picture version', () => {
    const versions = new Set<number>();
    for (const field of FIELD_IDS) {
      for (const weighting of WEIGHTING_IDS) {
        for (let lines = 0; lines <= 64; lines += 1) {
          versions.add(pictureVersionOf(field, weighting, lines));
        }
      }
    }
    expect(versions.size).toBe(FIELD_IDS.length * WEIGHTING_IDS.length * 65);
  });

  it('reads the time gauge in real milliseconds of the repetition', () => {
    expect(timeGauge(MOMENTS.echoPeak, 't2')).toMatchObject({ ms: 100, totalMs: 2500 });
    expect(timeGauge(MOMENTS.echoPeak, 't1')).toMatchObject({ ms: 15, totalMs: 500 });
    expect(timeGauge(CYCLE_UNITS / 2, 't1').share).toBeCloseTo(0.5, 9);
  });

  it('shares the lines out of the full picture', () => {
    expect(lineShare(16)).toBe(0.25);
    expect(lineShare(64)).toBe(1);
  });
});

describe('assembly state', () => {
  it('builds the sequence and spin readings from the model', () => {
    const state = createAssemblyState(sourceAt());
    expect(state.sequence).toMatchObject({
      phase: MOMENTS.echoPeak,
      step: 'echo',
      rf: null,
      gradient: 'x',
      echo: echoAmplitude(MOMENTS.echoPeak, 't2', 'whiteMatter', 'field15', 90),
    });
    expect(state.spins.net).toEqual(
      magnetisation(MOMENTS.echoPeak, 't2', 'whiteMatter', 'field15', 90),
    );
    expect(state.spins.arrows).toHaveLength(SPIN_COUNT);
    expect(state.fringe).toEqual(FIELDS.field15.fringe);
    expect(state.fringe).not.toBe(FIELDS.field15.fringe);
    expect(state.picture).toBe(pictureFor('field15', 't2', 24));
  });

  it('writes into the same target objects frame after frame', () => {
    const state = createAssemblyState(sourceAt());
    const { sequence, spins, fringe, view } = state;
    const written = writeAssemblyState(state, sourceAt({ phase: ENCODING, field: 'field30' }));
    expect(written).toBe(state);
    expect(written.sequence).toBe(sequence);
    expect(written.spins).toBe(spins);
    expect(written.fringe).toBe(fringe);
    expect(written.view).toBe(view);
    expect(written.sequence.gradient).toBe('y');
    expect(written.fringe).toEqual(FIELDS.field30.fringe);
  });

  it('changes the picture version only when the scan or its lines change', () => {
    const state = createAssemblyState(sourceAt());
    const first = state.pictureVersion;
    writeAssemblyState(state, sourceAt({ phase: RECOVERING, tissue: 'fat', tipAngle: 30 }));
    expect(state.pictureVersion).toBe(first);
    writeAssemblyState(state, sourceAt({ linesFilled: 25 }));
    expect(state.pictureVersion).not.toBe(first);
    expect(state.picture).toBe(pictureFor('field15', 't2', 25));
  });

  it('keeps two buffers consistent when they alternate', () => {
    const front = createAssemblyState(sourceAt());
    const back = createAssemblyState(sourceAt());
    writeAssemblyState(back, sourceAt({ weighting: 't1' }));
    writeAssemblyState(front, sourceAt({ weighting: 't1' }));
    expect(front.pictureVersion).toBe(back.pictureVersion);
    expect(front.picture).toBe(back.picture);
  });

  it('copies the view flags without sharing the store object', () => {
    const view = { ...DEFAULT_VIEW, voxel: true };
    const state = createAssemblyState(sourceAt({ view }));
    expect(state.view).toEqual(view);
    expect(state.view).not.toBe(view);
  });
});
