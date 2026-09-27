import { describe, expect, it } from 'vitest';
import { flightState, legLift, legSink } from './air';
import { GLIDER_TYPES, GLIDERS } from './polar';
import { FLIGHT_CYCLE, STILL_AIR, legAt } from './story';

const AIRSPEED_TOLERANCE_KMH = 5;

describe('flightState for the 18 m racer', () => {
  it('glides to the ridge at about 130 km/h', () => {
    expect(Math.abs(flightState(720, 'racer18').airspeed - 130)).toBeLessThan(
      AIRSPEED_TOLERANCE_KMH,
    );
  });

  it('flies home at about 200 km/h, through the sinking wave and in still air', () => {
    [1830, 2300].forEach((time) =>
      expect(Math.abs(flightState(time, 'racer18').airspeed - 200)).toBeLessThan(
        AIRSPEED_TOLERANCE_KMH,
      ),
    );
  });

  it('circles at 90 km/h in air rising about 2.7 m/s', () => {
    expect(flightState(225, 'racer18')).toMatchObject({ airspeed: 90 });
    expect(flightState(225, 'racer18').lift).toBeCloseTo(2.7, 1);
  });

  it('climbs in air rising about 1.5 m/s at the ridge and 2.8 m/s in the wave', () => {
    expect(flightState(1110, 'racer18').lift).toBeCloseTo(1.5, 1);
    expect(flightState(1470, 'racer18').lift).toBeCloseTo(2.8, 1);
  });

  it('meets air falling 2.5 m/s on the sinking side of the wave, then still air', () => {
    expect(flightState(1830, 'racer18').lift).toBeCloseTo(-2.5, 6);
    expect(flightState(2300, 'racer18').lift).toBeCloseTo(0, 6);
  });
});

describe('flightState for every glider', () => {
  it.each(GLIDER_TYPES)('climbs by the air lift minus its own sink for the %s', (type) => {
    for (let time = 0; time < FLIGHT_CYCLE; time += 7) {
      const state = flightState(time, type);
      expect(state.climb).toBeCloseTo(state.lift - state.sink, 9);
      expect(state.sink).toBeGreaterThanOrEqual(GLIDERS[type].polar.minSink.sink);
    }
  });

  it('glides to the ridge at the trainer minimum sink, lifted by the slightest rise', () => {
    const state = flightState(720, 'trainer');
    const { minSink } = GLIDERS.trainer.polar;
    expect(state).toMatchObject({ airspeed: minSink.speed, sink: minSink.sink });
    expect(state.lift).toBeGreaterThan(0);
    expect(state.lift).toBeCloseTo(0, 2);
  });

  it('flies the same path more slowly in the trainer than in the racer', () => {
    expect(flightState(720, 'trainer').airspeed).toBeLessThan(flightState(720, 'racer18').airspeed);
    expect(flightState(2300, 'trainer').airspeed).toBeLessThan(
      flightState(2300, 'racer18').airspeed,
    );
  });
});

describe('legs', () => {
  it('derive the air from the climb and the polar on climbing legs', () => {
    const thermal = legAt(225);
    expect(legLift(thermal, 'racer18')).toBeCloseTo(thermal.climb + legSink(thermal, 'racer18'), 9);
    expect(legLift(thermal, 'trainer')).toBeGreaterThan(legLift(thermal, 'racer18'));
  });

  it('derive the sink from the air and the climb on gliding legs', () => {
    const home = legAt(2300);
    expect(legSink(home, 'trainer')).toBeCloseTo(-home.climb, 9);
    expect(legLift(home, 'trainer')).toBeCloseTo(STILL_AIR, 9);
  });

  it('never sink slower than the polar allows on gliding legs', () => {
    const glide = legAt(720);
    const { sink } = GLIDERS.trainer.polar.minSink;
    expect(STILL_AIR - glide.climb).toBeLessThan(sink);
    expect(legSink(glide, 'trainer')).toBe(sink);
    expect(legLift(glide, 'trainer')).toBeCloseTo(glide.climb + sink, 9);
  });
});
