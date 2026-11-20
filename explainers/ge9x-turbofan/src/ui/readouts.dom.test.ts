import { beforeAll, describe, expect, it } from 'vitest';
import { createEngineStore } from '../state';
import { ENGINE_READOUTS } from './readouts';
import { describeAirPosition } from '../timeline';
import { TEST_LOCALE, fill, initTestLocale } from './testing';

const { units, readouts } = TEST_LOCALE;

function read(id: string, changes: Parameters<typeof createEngineStore>[0] = {}) {
  const readout = ENGINE_READOUTS.find((entry) => entry.id === id);
  if (!readout) throw new Error(`No ${id} readout`);
  const state = createEngineStore(changes).getState();
  return { text: readout.value(state), share: readout.meter?.share(state) };
}

describe('gauge readouts', () => {
  beforeAll(() => initTestLocale());

  it('shows fan, core and thrust as shares of the takeoff setting', () => {
    const takeoff = { thrust: 1 };
    expect(read('fan', takeoff).text).toBe(fill(units.percent, { value: '100' }));
    expect(read('core', takeoff).text).toBe(fill(units.percent, { value: '100' }));
    expect(read('thrust', takeoff).text).toBe(fill(units.percent, { value: '100' }));
    expect(read('fan', { thrust: 0 }).text).toBe(fill(units.percent, { value: '30' }));
    expect(read('core', { thrust: 0 }).text).toBe(fill(units.percent, { value: '55' }));
  });

  it('shows where the marked air is, as the scrubber says it', () => {
    const phase = 500;
    const { text, share } = read('position', { phase });
    expect(text).toBe(describeAirPosition(phase));
    expect(text).not.toBe(read('position', { phase: 100 }).text);
    expect(share).toBeUndefined();
  });

  it('shows the reverse thrust on its own text and keeps the meter positive', () => {
    const reversing = { thrust: 0.6, view: { labels: true, person: true, reverser: true } };
    const { text, share } = read('thrust', reversing);
    expect(text).toBe(fill(readouts.reverse, { percent: '14' }));
    expect(share).toBeGreaterThan(0);
  });
});
