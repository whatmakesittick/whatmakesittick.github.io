import { describe, expect, it } from 'vitest';
import { WIND_PRESETS, dayWind, farmLayout, windFromDeg } from '../model';
import {
  createAssemblyState,
  farmSitesOf,
  liveReading,
  liveWind,
  sceneOf,
  writeAssemblyState,
} from './derived';
import type { AssemblySource } from './derived';
import { DEFAULT_VIEW } from './store';

const NIGHT = 120;
const NOON = 720;
const STORM_CORE_MINUTE = 1050;

function source(overrides: Partial<AssemblySource> = {}): AssemblySource {
  return {
    phase: NOON,
    playing: true,
    preset: 'farm',
    siteWind: 'typical',
    windOverride: null,
    spacing: 7,
    view: { ...DEFAULT_VIEW },
    ...overrides,
  };
}

describe('live wind', () => {
  it('follows the day wind of the site until a wind is set', () => {
    expect(liveWind(source())).toBeCloseTo(dayWind(NOON, 'typical'));
    expect(liveWind(source({ siteWind: 'windy' }))).toBeCloseTo(dayWind(NOON, 'windy'));
    expect(liveWind(source({ windOverride: 8 }))).toBe(8);
  });

  it('reuses the reading while its inputs stay the same', () => {
    expect(liveReading(source())).toBe(liveReading(source({ playing: false })));
    expect(liveReading(source())).not.toBe(liveReading(source({ spacing: 5 })));
  });

  it('parks the turbines above cut-out whatever the clock says', () => {
    const reading = liveReading(source({ windOverride: WIND_PRESETS.cutOut }));
    expect(reading.operating.state).toBe('parked');
    expect(reading.heroKw).toBe(0);
    expect(reading.farmKw).toBe(0);
    expect(reading.thrust).toBe(0);
  });
});

describe('assembly state', () => {
  it('shows the scene of the chapter', () => {
    expect(sceneOf('farm')).toBe('farm');
    expect(sceneOf('nacelle')).toBe('turbine');
    expect(createAssemblyState(source({ preset: 'curve' })).scene).toBe('turbine');
  });

  it('runs at full power at noon with the rotors facing the wind', () => {
    const state = createAssemblyState(source());
    expect(state.rotor.state).toBe('full');
    expect(state.rotor.powerShare).toBeCloseTo(1);
    expect(state.rotor.yawDeg).toBeCloseTo(windFromDeg(NOON));
    expect(state.wind.induction).toBeGreaterThan(0);
    expect(state.farm.outputShare).toBeGreaterThan(0.9);
    expect(state.farm.outputShare).toBeLessThanOrEqual(1);
    expect(state.farm.sites).toEqual(farmLayout(7));
    expect(state.farm.sites).toBe(farmSitesOf(7));
    expect(state.farm.deficits).toHaveLength(state.farm.sites.length);
    expect(state.farm.plumeLengthD).toBeGreaterThan(0);
    expect(state.farm.plumeStrength).toBeGreaterThan(0);
  });

  it('waits below cut-in at night with no plumes and no output', () => {
    const state = createAssemblyState(source({ phase: NIGHT }));
    expect(state.rotor.state).toBe('idle');
    expect(state.rotor.powerShare).toBe(0);
    expect(state.farm.outputShare).toBe(0);
    expect(state.farm.plumeLengthD).toBe(0);
    expect(state.farm.plumeStrength).toBe(0);
  });

  it('parks and brakes the rotor in the storm', () => {
    const state = createAssemblyState(source({ phase: STORM_CORE_MINUTE }));
    expect(state.rotor.state).toBe('parked');
    expect(state.rotor.braked).toBe(true);
    expect(state.rotor.rpm).toBe(0);
    expect(state.wind.induction).toBe(0);
    expect(state.farm.outputShare).toBe(0);
  });

  it('rewrites the same objects so the bindings can double buffer', () => {
    const target = createAssemblyState(source());
    const { wind, rotor, farm, view } = target;
    const next = writeAssemblyState(
      target,
      source({ preset: 'tower', spacing: 9, view: { ...DEFAULT_VIEW, cutaway: true } }),
    );
    expect(next).toBe(target);
    expect([next.wind, next.rotor, next.farm, next.view]).toEqual([wind, rotor, farm, view]);
    expect(next.wind).toBe(wind);
    expect(next.scene).toBe('turbine');
    expect(next.farm.spacing).toBe(9);
    expect(next.view.cutaway).toBe(true);
  });
});
