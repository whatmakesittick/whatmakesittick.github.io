import { describe, expect, it } from 'vitest';
import { OUTAGE_DRILL } from '../constants';
import { OutageClock, RESTING_OUTAGE, outageSampleAt } from './outage';

const FRAME = 1 / 60;

function run(clock: OutageClock, seconds: number) {
  let sample = clock.step(0);
  for (let time = 0; time < seconds; time += FRAME) sample = clock.step(FRAME);
  return sample;
}

describe('outage drill', () => {
  it('rests on the grid outside the drill', () => {
    expect(outageSampleAt(-1)).toEqual(RESTING_OUTAGE);
    expect(outageSampleAt(OUTAGE_DRILL.seconds)).toEqual(RESTING_OUTAGE);
  });

  it('carries the load on batteries while the gensets crank, then on the gensets', () => {
    const cranking = outageSampleAt(OUTAGE_DRILL.crankSeconds / 2);
    expect(cranking.source).toBe('battery');
    expect(cranking.gridOn).toBe(false);
    expect(cranking.gensets).toBe(1);
    expect(cranking.batteryShare).toBeCloseTo(1 - cranking.generatorShare);
    const carrying = outageSampleAt(OUTAGE_DRILL.crankSeconds + 1);
    expect(carrying.source).toBe('generator');
    expect(carrying.generatorShare).toBe(1);
    expect(carrying.batteryShare).toBe(0);
    expect(carrying.gensets).toBe(0);
  });

  it('ramps the gensets in and out over the first seconds', () => {
    expect(outageSampleAt(0).gensets).toBe(0);
    expect(outageSampleAt(OUTAGE_DRILL.rampSeconds / 2).gensets).toBeCloseTo(0.5);
    expect(
      outageSampleAt(OUTAGE_DRILL.crankSeconds - OUTAGE_DRILL.rampSeconds / 2).gensets,
    ).toBeCloseTo(0.5);
  });

  it('brings the grid back and runs the gensets down to the end', () => {
    const back = outageSampleAt(OUTAGE_DRILL.gridReturnSeconds);
    expect(back.gridOn).toBe(true);
    expect(back.source).toBe('grid');
    expect(back.generatorShare).toBe(1);
    expect(outageSampleAt(OUTAGE_DRILL.seconds - FRAME).generatorShare).toBeLessThan(0.01);
  });

  it('starts only on a new token and stops after the drill', () => {
    const clock = new OutageClock({ token: 3 });
    expect(clock.step(FRAME)).toEqual(RESTING_OUTAGE);
    clock.observe({ token: 3 });
    expect(clock.step(FRAME).active).toBe(false);
    clock.observe({ token: 4 });
    expect(clock.step(FRAME).active).toBe(true);
    expect(run(clock, OUTAGE_DRILL.seconds).active).toBe(false);
    expect(clock.step(FRAME)).toEqual(RESTING_OUTAGE);
  });

  it('restarts the drill when the token changes again mid-drill', () => {
    const clock = new OutageClock({ token: 0 });
    clock.observe({ token: 1 });
    run(clock, OUTAGE_DRILL.gridReturnSeconds);
    clock.observe({ token: 2 });
    expect(clock.step(FRAME).elapsed).toBeCloseTo(FRAME);
  });
});
