import { describe, expect, it } from 'vitest';
import { MOMENT_IDS } from '../ids';
import { unitsAt } from './clock';
import { MOMENTS } from './moments';
import { EJECT_MS } from './motion';
import { EXIT_MS, PEAK_MS, PORT_MS } from './timing';

describe('moments', () => {
  it('puts every moment of the spec on the cycle clock', () => {
    expect(MOMENTS).toEqual({
      strike: 4,
      start: 4.2,
      peak: PEAK_MS,
      port: PORT_MS,
      exit: EXIT_MS,
      unlock: 10,
      eject: EJECT_MS,
      strip: 50,
      lock: 90,
    });
  });

  it('comes in order, each at least a unit apart on the scrubber', () => {
    MOMENT_IDS.slice(1).forEach((id, index) =>
      expect(unitsAt(MOMENTS[id]) - unitsAt(MOMENTS[MOMENT_IDS[index]]), id).toBeGreaterThan(1),
    );
  });
});
