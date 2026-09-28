import { describe, expect, it } from 'vitest';
import {
  BULKHEAD,
  HERO_PANEL_INDEX,
  HINGE,
  MODULE,
  PANEL_COUNT,
  PANEL_PITCH_CM,
  TERRACE,
  cm,
  m,
  mm,
  panelCentreX,
  panelTopHeight,
  panelTopZ,
  um,
} from './scale';

describe('units', () => {
  it('treats one world unit as one centimetre', () => {
    expect(cm(1)).toBe(1);
    expect(mm(10)).toBe(1);
    expect(m(1)).toBe(100);
    expect(um(4)).toBe(1);
  });
});

describe('array layout', () => {
  it('centres the row on x = 0 with the hero at the west end', () => {
    const centres = Array.from({ length: PANEL_COUNT }, (_, index) => panelCentreX(index));
    expect(centres[0]).toBeLessThan(0);
    expect(centres.reduce((sum, x) => sum + x, 0)).toBeCloseTo(0);
    expect(centres[1] - centres[0]).toBe(PANEL_PITCH_CM);
    expect(PANEL_PITCH_CM).toBeGreaterThan(MODULE.width);
  });

  it('keeps the row and its swing inside the terrace and clear of the bulkhead', () => {
    const halfRow = (PANEL_COUNT * PANEL_PITCH_CM) / 2;
    expect(halfRow).toBeLessThan(TERRACE.x[1]);
    expect(panelCentreX(HERO_PANEL_INDEX) - MODULE.width / 2).toBeGreaterThan(BULKHEAD.x[1]);
    expect(panelTopZ(0)).toBeGreaterThan(TERRACE.z[0]);
    expect(panelTopZ(90)).toBeCloseTo(HINGE.z);
    expect(HINGE.z).toBeLessThan(TERRACE.z[1]);
  });

  it('raises the top edge with the tilt', () => {
    expect(panelTopHeight(0)).toBe(HINGE.y);
    expect(panelTopHeight(90)).toBeCloseTo(HINGE.y + MODULE.height);
    expect(panelTopHeight(35)).toBeGreaterThan(panelTopHeight(20));
  });
});
