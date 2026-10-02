import { describe, expect, it } from 'vitest';
import { batteryAt, flightAt, linkAt, motorsAt } from '../model';
import { sortieAt } from './derived';

describe('sortie readings', () => {
  it('reads the flight, the motors, the battery and the link under the scrubber', () => {
    const reading = sortieAt({ phase: 38, payload: 300 });
    expect(reading.flight).toEqual(flightAt(38));
    expect(reading.motors).toEqual(motorsAt(flightAt(38), 300));
    expect(reading.battery).toEqual(batteryAt(38, 300));
    expect(reading.link).toEqual(linkAt(flightAt(38).position));
  });

  it('reuses the reading until the time or the payload changes', () => {
    const first = sortieAt({ phase: 30, payload: 300 });
    expect(sortieAt({ phase: 30, payload: 300 })).toBe(first);
    expect(sortieAt({ phase: 30, payload: 800 })).not.toBe(first);
    expect(sortieAt({ phase: 30, payload: 800 }).battery.share).toBeLessThan(first.battery.share);
    expect(sortieAt({ phase: 31, payload: 300 })).not.toBe(first);
  });
});
