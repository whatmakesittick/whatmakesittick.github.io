import { describe, expect, it } from 'vitest';
import {
  HOVER_POWER_REF,
  MASS_G,
  PACK,
  SENSITIVITY_DBM,
  THRUST_PER_MOTOR_G,
  TOP_SPEED_KMH,
  VIDEO_FIGURES,
} from './figures';

describe('figures', () => {
  it('takes the masses and the thrust from the facts sheet', () => {
    expect(MASS_G).toEqual({ dry: 650, battery: 450, defaultPayload: 300, maxPayload: 1500 });
    expect(THRUST_PER_MOTOR_G).toEqual({ flight: 2000, bench: 2200 });
  });

  it('describes the 6S Li-ion pack', () => {
    expect(PACK.cells).toBe(6);
    expect(PACK.cells * PACK.cellNominalV).toBeCloseTo(21.6, 9);
    expect(PACK.cells * PACK.cellFullV).toBeCloseTo(25.2, 9);
    expect(PACK.cells * PACK.cellEmptyV).toBe(18);
    expect(PACK.capacityMah).toBe(4200);
    expect(PACK.energyWh).toBe(91);
    expect(PACK.massG).toBe(450);
  });

  it('references the hover power at the all-up weight without payload', () => {
    expect(HOVER_POWER_REF.allUpG).toBe(MASS_G.dry + MASS_G.battery);
  });

  it('lists the receiver sensitivity per packet rate and the video systems', () => {
    expect(SENSITIVITY_DBM).toEqual({ 50: -115, 150: -112, 250: -108, 500: -105 });
    expect(VIDEO_FIGURES.analogue).toEqual({ latencyMinMs: 20, latencyMaxMs: 30, channels: 40 });
    expect(VIDEO_FIGURES.digital).toEqual({
      latencyMs: 20,
      rangeKm: 10,
      lines: 1080,
      framesPerSecond: 100,
    });
  });

  it('quotes the three top speeds', () => {
    expect(TOP_SPEED_KMH).toEqual({ longRange: 140, racer: 263, record: 657.59 });
  });
});
