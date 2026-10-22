import { describe, expect, it } from 'vitest';
import { WAVE_DRAWN_WAVELENGTH_M } from '../../../model';
import { createWaveUniforms, driftBands, setSection } from './waveUniforms';

describe('wave uniforms', () => {
  it('drifts the bands toward +x and wraps within one wavelength', () => {
    const uniforms = createWaveUniforms();
    driftBands(uniforms, 0.5);
    expect(uniforms.uBandShift.value).toBeCloseTo(0.5);
    driftBands(uniforms, WAVE_DRAWN_WAVELENGTH_M);
    expect(uniforms.uBandShift.value).toBeCloseTo(0.5);
  });

  it('drifts back toward -x when the wave is reversed', () => {
    const uniforms = createWaveUniforms();
    driftBands(uniforms, -0.5);
    expect(uniforms.uBandShift.value).toBeCloseTo(WAVE_DRAWN_WAVELENGTH_M - 0.5);
  });

  it('lights the strip between the section ends in scene metres', () => {
    const uniforms = createWaveUniforms();
    setSection(uniforms, [-120, 1080]);
    expect(uniforms.uSection.value.x).toBe(-120);
    expect(uniforms.uSection.value.y).toBe(1080);
  });
});
