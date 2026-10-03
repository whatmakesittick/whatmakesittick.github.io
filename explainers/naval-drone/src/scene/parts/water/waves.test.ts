import { describe, expect, it } from 'vitest';
import { GRAVITY } from '../../../model/scale';
import { MOTION, WAVES } from '../../constants';
import { createWaterUniforms, seaHeightAt, waveVectors } from './waves';
import { responseFor, waveMotion } from './boatMotion';

const SIGMA_TO_SIGNIFICANT = 4;

describe('waves', () => {
  it('scales the components to the significant wave height', () => {
    const waveHeight = 0.875;
    const waves = waveVectors(waveHeight);
    expect(waves).toHaveLength(WAVES.components.length);
    const variance = waves.reduce((sum, wave) => sum + (wave.w * wave.w) / 2, 0);
    expect(SIGMA_TO_SIGNIFICANT * Math.sqrt(variance)).toBeCloseTo(waveHeight, 6);
    waves.forEach((wave) => {
      const k = Math.hypot(wave.x, wave.y);
      expect(wave.z).toBeCloseTo(Math.sqrt(GRAVITY * k), 9);
    });
  });

  it('moves the pattern back past a held boat as the drift grows', () => {
    const uniforms = createWaterUniforms();
    const before = seaHeightAt(3, 4, uniforms);
    uniforms.uSeaDrift.value.set(2, 0);
    expect(seaHeightAt(1, 4, uniforms)).toBeCloseTo(before, 9);
  });

  it('settles a boat on the waves and calms it as it planes', () => {
    expect(responseFor(0)).toBe(1);
    expect(responseFor(1)).toBeLessThan(0.5);
    const motion = waveMotion([0, 0, 0], 0, 1);
    expect(Math.abs(motion.pitch)).toBeLessThanOrEqual(MOTION.maxPitch);
    expect(Number.isFinite(motion.heave + motion.roll)).toBe(true);
  });
});
