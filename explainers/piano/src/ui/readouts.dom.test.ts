import { beforeAll, describe, expect, it } from 'vitest';
import { KNOT_UNITS, MOMENTS } from '../model';
import { createPianoStore } from '../state';
import type { PianoStoreState } from '../state';
import { PIANO_READOUTS } from './readouts';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units } = TEST_LOCALE;
const ROW_IDS = ['time', 'key', 'hammer', 'speed', 'level'];
const MID_CYCLE = 500;
const IN_CONTACT = 430;
const JUST_BEFORE_STRIKE = MOMENTS.strike - 1;
const HOLDING = 700;

function row(id: string) {
  const found = PIANO_READOUTS.find((readout) => readout.id === id);
  if (!found) throw new Error(`No ${id} readout`);
  return found;
}

function text(id: string, state: PianoStoreState): string {
  return row(id).value(state);
}

function share(id: string, state: PianoStoreState): number | undefined {
  return row(id).meter?.share(state);
}

function texts(state: PianoStoreState): string[] {
  return ROW_IDS.map((id) => text(id, state));
}

function stateAt(phase: number, overrides: Partial<PianoStoreState> = {}) {
  return createPianoStore({ phase, playing: false, ...overrides }).getState();
}

describe('gauge readouts', () => {
  beforeAll(() => initTestLocale());

  it('shows the time, the key, the hammer, its speed and the level, each with a meter', () => {
    expect(PIANO_READOUTS.map((readout) => readout.id)).toEqual(ROW_IDS);
    PIANO_READOUTS.forEach((readout) => {
      expect(readout.labelKey).toBe(`readouts.${readout.id}`);
      expect(readout.numeric).toBe(true);
      expect(readout.meter).toBeDefined();
    });
  });

  it('starts with the key at rest, the hammer down and the string silent', () => {
    const start = stateAt(0);
    expect(text('time', start)).toBe(fill(units.millis, { value: '0.0' }));
    expect(text('key', start)).toBe(fill(units.mm, { value: '0.0' }));
    expect(text('hammer', start)).toBe(fill(units.mm, { value: '47.0' }));
    expect(text('speed', start)).toBe(fill(units.metresPerSecond, { value: '0.0' }));
    expect(text('level', start)).toBe(units.silent);
    ROW_IDS.forEach((id) => expect(share(id, start), id).toBe(0));
  });

  it('changes every row when the scrubber moves to mid cycle at a medium touch', () => {
    const store = createPianoStore({ phase: 0, playing: false, touch: 'medium' });
    const start = texts(store.getState());
    store.getState().setPhase(MID_CYCLE);
    const mid = store.getState();
    texts(mid).forEach((value, index) => expect(value, ROW_IDS[index]).not.toBe(start[index]));
    expect(text('time', mid)).toBe(fill(units.millis, { value: '76.3' }));
    expect(text('key', mid)).toBe(fill(units.mm, { value: '10.0' }));
    expect(text('hammer', mid)).toBe(fill(units.mm, { value: '6.0' }));
    expect(text('speed', mid)).toBe(fill(units.metresPerSecond, { value: '0.8' }));
    expect(text('level', mid)).toBe(fill(units.db, { value: '-10' }));
    expect(share('key', mid)).toBeCloseTo(1, 9);
  });

  it('stays silent until the strike, then reads the level of the blow', () => {
    expect(text('level', stateAt(JUST_BEFORE_STRIKE))).toBe(units.silent);
    expect(share('level', stateAt(JUST_BEFORE_STRIKE))).toBe(0);
    expect(text('level', stateAt(MOMENTS.strike))).toBe(fill(units.db, { value: '-10' }));
    expect(text('level', stateAt(MOMENTS.strike, { touch: 'soft' }))).toBe(
      fill(units.db, { value: '-14' }),
    );
    const hard = stateAt(MOMENTS.strike, { touch: 'hard' });
    expect(text('level', hard)).toBe(fill(units.db, { value: '0' }));
    expect(share('level', hard)).toBeCloseTo(1, 9);
    expect(text('level', stateAt(MOMENTS.damped))).toBe(units.silent);
  });

  it('reads on the string while the hammer touches it', () => {
    const contact = stateAt(IN_CONTACT);
    expect(text('hammer', contact)).toBe(units.onString);
    expect(share('hammer', contact)).toBeCloseTo(1, 9);
    expect(text('hammer', stateAt(KNOT_UNITS.contactEnd))).toBe(fill(units.mm, { value: '0.0' }));
  });

  it('reads the let-off gap and the full hammer speed at let-off', () => {
    const letOff = stateAt(MOMENTS.letOff);
    expect(text('hammer', letOff)).toBe(fill(units.mm, { value: '1.5' }));
    expect(text('speed', letOff)).toBe(fill(units.metresPerSecond, { value: '1.7' }));
    expect(text('speed', stateAt(MOMENTS.letOff, { touch: 'hard' }))).toBe(
      fill(units.metresPerSecond, { value: '5.0' }),
    );
    expect(share('speed', stateAt(MOMENTS.letOff, { touch: 'hard' }))).toBeCloseTo(1, 9);
  });

  it('switches the clock to seconds while the note rings', () => {
    const holding = stateAt(HOLDING);
    expect(text('time', holding)).toBe(fill(units.seconds, { value: '1.21' }));
    expect(text('hammer', holding)).toBe(fill(units.mm, { value: '15.0' }));
    expect(text('speed', holding)).toBe(fill(units.metresPerSecond, { value: '0.0' }));
  });

  it('keeps the note ringing across the loop with the sustain pedal', () => {
    const start = stateAt(0, { pedal: 'sustain' });
    expect(text('level', start)).toBe(fill(units.db, { value: '-30' }));
    expect(share('level', start)).toBeCloseTo(0.5, 2);
  });
});
