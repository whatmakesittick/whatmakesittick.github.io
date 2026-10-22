import { describe, expect, it } from 'vitest';
import {
  GAP_BAND_MM,
  GAP_MM,
  INSET,
  POLE_PITCH_M,
  REST_GAP_MM,
  STATOR_PACK_M,
} from '../../../model';
import {
  CONTENT,
  DRAW_SCALE,
  FIELD_WAVELENGTH_DRAWN,
  GAP_LIMIT_MM,
  MAGNET_DRAWING,
  STATOR_DRAWING,
  TOLERANCE_DRAWING,
  drawnGap,
  gapText,
  gustShift,
  magnetTop,
  slotCentres,
} from './layout';

const CLOSE = 6;
const FLOATING_DRAWN = 0.2;
const SLOTS_PER_PACK = 12;
const BIG_GUST_MM = 50;

describe('inset layout', () => {
  it('fits one stator pack across the panel', () => {
    expect(STATOR_DRAWING.packHalf * 2).toBeCloseTo(STATOR_PACK_M * INSET.alongScale, CLOSE);
    expect(STATOR_DRAWING.packHalf).toBeLessThan(CONTENT.right);
    expect(CONTENT.width).toBeLessThan(INSET.width);
  });

  it('shows two field wavelengths on one pack', () => {
    expect((STATOR_DRAWING.packHalf * 2) / FIELD_WAVELENGTH_DRAWN).toBeCloseTo(2, 1);
    expect(FIELD_WAVELENGTH_DRAWN).toBeCloseTo(2 * POLE_PITCH_M * DRAW_SCALE, CLOSE);
  });

  it('draws the 10 mm gap as 0.20 m', () => {
    expect(drawnGap(GAP_MM)).toBeCloseTo(FLOATING_DRAWN, CLOSE);
    expect(TOLERANCE_DRAWING.floating).toBeCloseTo(STATOR_DRAWING.bottom - FLOATING_DRAWN, CLOSE);
  });

  it('keeps the magnet inside the panel at rest and clamps beyond', () => {
    expect(GAP_LIMIT_MM).toBeGreaterThan(REST_GAP_MM);
    const lowest = magnetTop(GAP_LIMIT_MM * 2) - MAGNET_DRAWING.poleStrip - MAGNET_DRAWING.minBody;
    expect(lowest).toBeGreaterThanOrEqual(CONTENT.bottom - 1e-9);
    expect(drawnGap(-3)).toBe(0);
  });

  it('places the tolerance band between 8 and 12 mm under the stator', () => {
    expect(STATOR_DRAWING.bottom - TOLERANCE_DRAWING.top).toBeCloseTo(
      drawnGap(GAP_BAND_MM.min),
      CLOSE,
    );
    expect(STATOR_DRAWING.bottom - TOLERANCE_DRAWING.bottom).toBeCloseTo(
      drawnGap(GAP_BAND_MM.max),
      CLOSE,
    );
    expect(TOLERANCE_DRAWING.floating).toBeLessThan(TOLERANCE_DRAWING.top);
    expect(TOLERANCE_DRAWING.floating).toBeGreaterThan(TOLERANCE_DRAWING.bottom);
  });

  it('puts twelve whole slots in one pack, three per pole', () => {
    const slots = slotCentres(-STATOR_DRAWING.packHalf, STATOR_DRAWING.packHalf);
    expect(slots).toHaveLength(SLOTS_PER_PACK);
    expect(slots[1] - slots[0]).toBeCloseTo((POLE_PITCH_M / 3) * DRAW_SCALE, CLOSE);
    slots.forEach((centre) => {
      expect(Math.abs(centre) + STATOR_DRAWING.slotWidth / 2).toBeLessThan(STATOR_DRAWING.packHalf);
    });
  });

  it('fits the cable inside its slot', () => {
    expect(STATOR_DRAWING.cableRadius * 2).toBeLessThan(STATOR_DRAWING.slotWidth);
    expect(STATOR_DRAWING.cableRadius * 2).toBeLessThan(STATOR_DRAWING.slotDepth);
  });

  it('draws a gust at twenty times, clamped', () => {
    expect(gustShift(1)).toBeCloseTo(INSET.gapScale / 1000, CLOSE);
    expect(gustShift(BIG_GUST_MM)).toBe(-gustShift(-BIG_GUST_MM));
    expect(Math.abs(gustShift(BIG_GUST_MM))).toBeLessThan(STATOR_DRAWING.slotPitch);
  });

  it('writes the gap in whole millimetres', () => {
    expect(gapText(GAP_MM)).toBe('10 mm');
    expect(gapText(REST_GAP_MM)).toBe('30 mm');
    expect(gapText(10.6)).toBe('11 mm');
  });
});
