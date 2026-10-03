import { describe, expect, it } from 'vitest';
import { toRadians } from '@core/math';
import {
  HELD_PHASE,
  boatAt,
  companionsAt,
  distanceToShip,
  jetAt,
  lagMetres,
  planingAt,
  poseAtDistance,
  seaAt,
  steerAt,
  throttleAt,
} from '../model';
import { assemblyFlags, followedKnots, runAt } from './derived';
import type { RunSource } from './derived';

const RUNNING: RunSource = {
  phase: 45,
  trialKnots: null,
  helm: 'straight',
  linkMode: 'satellite',
  videoDelayMs: 250,
  seaState: 'smooth',
  preset: 'overview',
};

function held(knots: number, helm: RunSource['helm'] = 'straight'): RunSource {
  return { ...RUNNING, phase: HELD_PHASE, trialKnots: knots, helm, preset: 'jet' };
}

describe('run readings', () => {
  it('follows the run under the scrubber while nobody holds the boat', () => {
    const reading = runAt(RUNNING);
    const boat = boatAt(45);
    expect(reading.boat).toEqual(boat);
    expect(reading.planing).toEqual(planingAt(boat.knots));
    expect(reading.jet).toEqual(jetAt(throttleAt(boat.knots), boat.knots, steerAt(45), false));
    expect(reading.jet.nozzleAngle).toBeCloseTo(-toRadians(8), 9);
    expect(reading.companions).toEqual(companionsAt(45));
    expect(reading.distanceToShip).toBeCloseTo(distanceToShip(45), 9);
    expect(reading.sea).toEqual(seaAt('smooth'));
  });

  it('brings the companions in for the sprint', () => {
    expect(runAt({ ...RUNNING, phase: 100 }).companions).toHaveLength(2);
  });

  it('holds the boat in place at the trial speed', () => {
    const reading = runAt(held(42));
    const place = boatAt(HELD_PHASE);
    expect(reading.boat).toEqual({ ...place, knots: 42, held: true });
    expect(reading.planing).toEqual(planingAt(42));
    expect(reading.jet).toEqual(jetAt(throttleAt(42), 42, 0, false));
    expect(reading.companions).toEqual([]);
  });

  it('swings the nozzle full over for each helm', () => {
    expect(runAt(held(22, 'left')).jet.nozzleAngle).toBeCloseTo(-toRadians(27), 9);
    expect(runAt(held(22, 'right')).jet.nozzleAngle).toBeCloseTo(toRadians(27), 9);
  });

  it('stops the boat with the bucket down in reverse but keeps the pump running', () => {
    const reading = runAt(held(22, 'reverse'));
    expect(reading.boat.knots).toBe(0);
    expect(reading.planing).toEqual(planingAt(0));
    expect(reading.jet).toMatchObject({ throttle: throttleAt(22), bucket: 1, thrust: 0 });
  });

  it('draws the delayed video ghost only in the link chapter while the link is up', () => {
    const link: RunSource = { ...RUNNING, phase: 100, preset: 'link', videoDelayMs: 500 };
    const boat = boatAt(100);
    expect(runAt(link).link).toEqual({
      mode: 'satellite',
      ghost: poseAtDistance(boat.distance - lagMetres(500, boat.knots)),
    });
    expect(runAt({ ...link, linkMode: 'backup' }).link.ghost).not.toBeNull();
    expect(runAt({ ...link, linkMode: 'lost' }).link).toEqual({ mode: 'lost', ghost: null });
    expect(runAt({ ...link, preset: 'overview' }).link.ghost).toBeNull();
  });

  it('reads the sea state the reader picks', () => {
    expect(runAt({ ...RUNNING, seaState: 'rough' }).sea).toEqual(seaAt('rough'));
  });

  it('remembers the last reading until a source changes', () => {
    const first = runAt({ ...RUNNING, phase: 70 });
    expect(runAt({ ...RUNNING, phase: 70 })).toBe(first);
    expect(runAt({ ...RUNNING, phase: 70, seaState: 'slight' })).not.toBe(first);
  });

  it('follows the run speed in the sliders until the reader holds the boat', () => {
    expect(followedKnots({ phase: 28, trialKnots: null })).toBe(11);
    expect(followedKnots({ phase: 28, trialKnots: 30 })).toBe(30);
  });

  it('opens the water section in the hull and jet chapters only, the bar only in the hull one', () => {
    expect(assemblyFlags({ preset: 'overview' })).toEqual({
      waterSection: false,
      wettedBar: false,
    });
    expect(assemblyFlags({ preset: 'link' }).waterSection).toBe(false);
    expect(assemblyFlags({ preset: 'hull' })).toEqual({
      waterSection: true,
      wettedBar: true,
    });
    expect(assemblyFlags({ preset: 'jet' })).toEqual({
      waterSection: true,
      wettedBar: false,
    });
  });
});
