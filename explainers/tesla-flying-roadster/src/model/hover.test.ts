import { describe, expect, it } from 'vitest';
import { hoverFlow, hoverSeconds, jetPowerMw, totalImpulseKns, weightN } from './hover';

describe('hover', () => {
  it('needs 16.7 kN and about 24 kg of air a second to hold the car up', () => {
    expect(weightN()).toBeCloseTo(16671, 0);
    expect(hoverFlow('air')).toBeCloseTo(23.9, 1);
  });

  it('hovers 13.2 s at most on 600 L of air', () => {
    expect(hoverSeconds('air', 600)).toBeCloseTo(13.2, 1);
  });

  it('puts 5.8 MW into the air jet', () => {
    expect(jetPowerMw('air')).toBeCloseTo(5.8, 1);
  });

  it('gives helium less than half the total push of air in the same tank', () => {
    expect(totalImpulseKns('air', 600)).toBeCloseTo(220, 0);
    expect(totalImpulseKns('helium', 600)).toBeCloseTo(93.5, 0);
    expect(totalImpulseKns('helium', 600)).toBeLessThan(totalImpulseKns('air', 600) / 2);
  });
});
