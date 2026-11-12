import { describe, expect, it } from 'vitest';
import {
  fieldMm,
  maskTiltDeg,
  opticsOf,
  pitchNm,
  shrinkRatio,
  slitMm,
  smallestHalfPitchNm,
  strokeM,
} from './optics';

describe('optics', () => {
  it('derives the optics from the machine', () => {
    expect(opticsOf('nxe3600d')).toBe('na033');
    expect(opticsOf('nxe3800e')).toBe('na033');
    expect(opticsOf('exe5000')).toBe('na055');
  });

  it('shrinks 4 by 4, or 4 by 8 for High-NA', () => {
    expect(shrinkRatio('na033')).toEqual({ slit: 4, scan: 4 });
    expect(shrinkRatio('na055')).toEqual({ slit: 4, scan: 8 });
  });

  it('halves the field height for High-NA', () => {
    expect(fieldMm('na033')).toEqual({ w: 26, h: 33 });
    expect(fieldMm('na055')).toEqual({ w: 26, h: 16.5 });
    expect(slitMm('na033')).toEqual({ w: 26, h: 2 });
    expect(slitMm('na055')).toEqual({ w: 26, h: 1.6 });
  });

  it('reads the finest line and pitch', () => {
    expect(smallestHalfPitchNm('na033')).toBe(13);
    expect(smallestHalfPitchNm('na055')).toBe(8);
    expect(pitchNm('na033')).toBe(26);
    expect(pitchNm('na055')).toBe(16);
  });

  it('tilts the mask and strokes the stages', () => {
    expect(maskTiltDeg('na033')).toBe(6);
    expect(maskTiltDeg('na055')).toBe(5.4);
    expect(strokeM('na033').mask).toBeCloseTo(0.132, 9);
    expect(strokeM('na033').wafer).toBeCloseTo(0.033, 9);
    expect(strokeM('na055').wafer).toBeCloseTo(0.0165, 9);
  });
});
