import { describe, expect, it } from 'vitest';
import { COOLING_IDS } from '../ids';
import type { AssemblyState, CoolantReading, CoolingId, LoadId, RackReading } from '../ids';
import { MOMENTS, jouleAt } from '../model';
import { coolantAt } from '../model/cooling';
import { rackReading } from '../model/power';
import { createAssemblyState, writeAssemblyState } from './derived';
import type { AssemblySource } from './derived';
import { DEFAULT_VIEW } from './store';

interface ExpectedReading {
  cooling: CoolingId;
  load: LoadId;
  rack: RackReading;
  coolant: CoolantReading;
}

const READINGS: readonly ExpectedReading[] = [
  {
    cooling: 'liquid',
    load: 'full',
    rack: { rackKw: 120, hallMw: 23.04, fanShare: 0.6 },
    coolant: { medium: 'water', supplyC: 25, returnC: 45, flowShare: 1 },
  },
  {
    cooling: 'liquid',
    load: 'idle',
    rack: { rackKw: 36, hallMw: 6.912, fanShare: 0.3 },
    coolant: { medium: 'water', supplyC: 25, returnC: 31, flowShare: 1 },
  },
  {
    cooling: 'air',
    load: 'full',
    rack: { rackKw: 10, hallMw: 1.92, fanShare: 1 },
    coolant: { medium: 'air', supplyC: 24, returnC: 35.1, flowShare: 1 },
  },
  {
    cooling: 'air',
    load: 'idle',
    rack: { rackKw: 3, hallMw: 0.576, fanShare: 0.5 },
    coolant: { medium: 'air', supplyC: 24, returnC: 30.66, flowShare: 0.5 },
  },
];

function source(overrides: Partial<AssemblySource> = {}): AssemblySource {
  return {
    phase: 0,
    playing: true,
    cooling: 'liquid',
    load: 'full',
    outageToken: 0,
    view: { ...DEFAULT_VIEW },
    ...overrides,
  };
}

function expectClose(actual: object, expected: object): void {
  Object.entries(expected).forEach(([key, value]) => {
    const reading = (actual as Record<string, unknown>)[key];
    if (typeof value === 'number') expect(reading, key).toBeCloseTo(value, 9);
    else expect(reading, key).toBe(value);
  });
}

describe('assembly state', () => {
  it.each(READINGS)('reads the $cooling rack at $load load', (expected) => {
    const state = createAssemblyState(source({ cooling: expected.cooling, load: expected.load }));
    expect(state).toMatchObject({ cooling: expected.cooling, load: expected.load });
    expectClose(state.rack, expected.rack);
    expectClose(state.coolant, expected.coolant);
  });

  it('places the joule on the route of the chosen cooling', () => {
    [0, MOMENTS.atRack, MOMENTS.becomesHeat, 700, MOMENTS.onRoof].forEach((phase) =>
      COOLING_IDS.forEach((cooling) =>
        expect(createAssemblyState(source({ phase, cooling })).joule).toEqual(
          jouleAt(phase, cooling),
        ),
      ),
    );
    expect(createAssemblyState(source({ phase: MOMENTS.atRack })).joule.form).toBe('current');
    expect(createAssemblyState(source({ phase: MOMENTS.becomesHeat })).joule.form).toBe('heat');
  });

  it('fills the scalars, the drill token and the view from the store', () => {
    const view = { ...DEFAULT_VIEW, packets: true };
    const state = createAssemblyState(
      source({ phase: 300, playing: false, cooling: 'air', load: 'idle', outageToken: 3, view }),
    );
    expect(state).toMatchObject({ phase: 300, playing: false, cooling: 'air', load: 'idle' });
    expect(state.outage).toEqual({ token: 3 });
    expect(state.view).toEqual(view);
    expect(state.view).not.toBe(view);
  });

  it('writes the next frame into the same objects', () => {
    const target: AssemblyState = createAssemblyState(source());
    const { joule, rack, coolant, outage, view } = target;
    const result = writeAssemblyState(
      target,
      source({
        phase: MOMENTS.onRoof,
        cooling: 'air',
        load: 'idle',
        outageToken: 2,
        view: { ...DEFAULT_VIEW, cutaway: true },
      }),
    );
    expect(result).toBe(target);
    expect(target.joule).toBe(joule);
    expect(target.rack).toBe(rack);
    expect(target.coolant).toBe(coolant);
    expect(target.outage).toBe(outage);
    expect(target.view).toBe(view);
    expect(target).toMatchObject({ phase: MOMENTS.onRoof, cooling: 'air', load: 'idle' });
    expect(target.joule).toEqual(jouleAt(MOMENTS.onRoof, 'air'));
    expect(target.rack).toEqual(rackReading('air', 'idle'));
    expect(target.coolant).toEqual(coolantAt('air', 'idle'));
    expect(target.outage).toEqual({ token: 2 });
    expect(target.view.cutaway).toBe(true);
  });

  it('keeps the source view untouched', () => {
    const view = { ...DEFAULT_VIEW };
    const state = createAssemblyState(source({ view }));
    state.view.labels = false;
    expect(view.labels).toBe(true);
  });
});
