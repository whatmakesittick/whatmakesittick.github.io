import { describe, expect, it } from 'vitest';
import { MOMENTS } from './stations';
import { HEAT_IDLE, flameRing, heatAlong, heatLevel, stationTone } from './heat';

describe('heat', () => {
  it('runs from idle to full with the lever', () => {
    expect(heatLevel(0)).toBe(HEAT_IDLE);
    expect(heatLevel(1)).toBe(1);
    expect(flameRing(1)).toBe(1);
    expect(flameRing(0)).toBeLessThan(1);
  });

  it('is cold before the combustor and brightest in it', () => {
    expect(heatAlong(MOMENTS.intake, 1)).toBe(0);
    expect(heatAlong(MOMENTS.compressorExit + 30, 1)).toBe(1);
    expect(heatAlong(MOMENTS.turbinesExit - 1, 1)).toBeLessThan(
      heatAlong(MOMENTS.combustorExit, 1),
    );
  });

  it('colours the cold path cool until the nozzle', () => {
    expect(stationTone('burn', 'cold')).toBe('cool');
    expect(stationTone('blow', 'cold')).toBe('exhaust');
    expect(stationTone('burn', 'core')).toBe('fire');
  });
});
