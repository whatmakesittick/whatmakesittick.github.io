import { describe, expect, it } from 'vitest';
import {
  SEABED_PRESSURE_BAR,
  fracturePressureBar,
  hydrostaticBar,
  mudPressureBar,
  mudState,
  mudWindow,
  mudWindowShare,
  overburdenBar,
  porePressureBar,
  seaPressureBar,
  whenInRock,
} from './pressure';
import { layerById } from './rocks';
import { RISER_LANDED_DEPTH_M, SEABED_DEPTH_M, TOTAL_DEPTH_M, sectionAt } from './wellPlan';

const RESERVOIR = layerById('reservoir');
const SEAL = layerById('seal');
const CONDUCTOR_SHOE = 1100;

describe('pressure in the sea', () => {
  it('climbs about 1 bar every 10 m of seawater', () => {
    expect(seaPressureBar(500)).toBeCloseTo(50, 0);
    expect(seaPressureBar(3000)).toBeCloseTo(302, 0);
    expect(SEABED_PRESSURE_BAR).toBeCloseTo(100.6, 1);
  });

  it('follows the field rule of density times 0.0981 times height', () => {
    expect(hydrostaticBar(1.5, 1000)).toBeCloseTo(147.15);
  });

  it('is the only pressure above the seabed', () => {
    expect(porePressureBar(SEABED_DEPTH_M)).toBeCloseTo(SEABED_PRESSURE_BAR);
    expect(overburdenBar(SEABED_DEPTH_M)).toBeCloseTo(SEABED_PRESSURE_BAR);
    expect(porePressureBar(0)).toBe(0);
  });

  it('measures rock only below the seabed', () => {
    expect(whenInRock(SEABED_DEPTH_M - 1, porePressureBar)).toBeNull();
    expect(whenInRock(3000, porePressureBar)).toBe(porePressureBar(3000));
  });
});

describe('pressure in the rock', () => {
  it('holds brine pressure above the seal and builds over-pressure through it', () => {
    expect(mudWindow(SEAL.top).pore).toBeCloseTo(1.05, 2);
    expect(mudWindow(SEAL.bottom).pore).toBeGreaterThan(1.2);
  });

  it('keeps pore pressure below fracture pressure below overburden everywhere', () => {
    for (let depth = SEABED_DEPTH_M + 1; depth <= TOTAL_DEPTH_M; depth += 25) {
      expect(porePressureBar(depth)).toBeLessThan(fracturePressureBar(depth));
      expect(fracturePressureBar(depth)).toBeLessThan(overburdenBar(depth));
    }
  });

  it('opens a window of about 1.24 to 1.57 g/cm³ at the reservoir with the plan inside', () => {
    const window = mudWindow(RESERVOIR.top);
    expect(window.pore).toBeCloseTo(1.24, 2);
    expect(window.fracture).toBeCloseTo(1.57, 2);
    const planned = sectionAt(RESERVOIR.top + 1).plannedMudWeight;
    expect(planned).toBeGreaterThan(mudWindow(RESERVOIR.bottom).pore);
    expect(planned).toBeLessThan(window.fracture);
  });

  it('leaves only a narrow window near the seabed', () => {
    const window = mudWindow(CONDUCTOR_SHOE);
    expect(window.fracture - window.pore).toBeLessThan(0.05);
  });
});

describe('mud pressure at the bit', () => {
  it('stacks mud on the seabed pressure while the well has no riser', () => {
    const depth = RISER_LANDED_DEPTH_M - 25;
    expect(mudPressureBar(depth, 1.2)).toBeCloseTo(
      SEABED_PRESSURE_BAR + hydrostaticBar(1.2, depth - SEABED_DEPTH_M),
    );
  });

  it('runs mud from the drill floor once the riser is landed', () => {
    expect(mudPressureBar(3000, 1.2)).toBeCloseTo(hydrostaticBar(1.2, 3000));
  });

  it('drills the top hole safely with seawater', () => {
    expect(mudState(CONDUCTOR_SHOE, 1.03)).toBe('safe');
    expect(mudState(CONDUCTOR_SHOE, 1.0)).toBe('light');
  });

  it('keeps the planned mud inside the window at every depth in the rock', () => {
    for (let depth = SEABED_DEPTH_M + 1; depth <= TOTAL_DEPTH_M; depth += 1) {
      expect(mudState(depth, sectionAt(depth).plannedMudWeight), `${depth} m`).toBe('safe');
    }
  });

  it('warns of a kick when the mud is too light and of losses when too heavy', () => {
    const depth = RESERVOIR.top + 100;
    expect(mudState(depth, 1.2)).toBe('light');
    expect(mudState(depth, 1.7)).toBe('heavy');
    expect(mudState(SEABED_DEPTH_M - 100, 2.2)).toBe('safe');
  });

  it('places the mud inside the window from pore to fracture pressure', () => {
    const depth = RESERVOIR.top + 100;
    const window = mudWindow(depth);
    expect(mudWindowShare(depth, window.pore)).toBeCloseTo(0);
    expect(mudWindowShare(depth, window.fracture)).toBeCloseTo(1);
    expect(mudWindowShare(depth, 2.2)).toBe(1);
    expect(mudWindowShare(SEABED_DEPTH_M - 1, 1.4)).toBe(0);
  });
});
