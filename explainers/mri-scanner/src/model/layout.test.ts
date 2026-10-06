import { describe, expect, it } from 'vitest';
import {
  CONTROL_WINDOW,
  BODY_COIL,
  BORE,
  COLD_HEAD,
  HEAD_COIL,
  ISOCENTRE,
  LAYERS,
  MAGNET,
  MAIN_COILS,
  PATIENT,
  QUENCH_PIPE,
  REGIONS,
  ROOM,
  SCREEN,
  SHIELD_COILS,
  SHIMS,
  SLICE_THICKNESS,
  TABLE,
  VOXEL,
  VOXEL_ARROWS,
  gradientShell,
} from './layout';

describe('scanner layout', () => {
  it('builds a 1.7 m long magnet, 2.33 m tall, around a 70 cm bore at the isocentre', () => {
    expect(ISOCENTRE).toEqual([0, 1.05, 0]);
    expect(2 * MAGNET.halfLength).toBeCloseTo(1.7, 9);
    expect(MAGNET.top).toBe(2.33);
    expect(ISOCENTRE[1] - MAGNET.radius).toBe(0);
    expect(2 * BORE.radius).toBeCloseTo(0.7, 9);
  });

  it('nests every layer inside the one around it', () => {
    const order = [LAYERS.cover, LAYERS.vacuumVessel, LAYERS.radiationShield, LAYERS.heliumVessel];
    order.slice(1).forEach((shell, index) => {
      expect(shell.outer).toBeLessThan(order[index].outer);
      expect(shell.inner).toBeGreaterThanOrEqual(order[index].inner);
      expect(shell.halfLength).toBeLessThan(order[index].halfLength);
    });
    expect(LAYERS.gradientCoil.outer).toBe(LAYERS.vacuumVessel.inner);
    expect(BORE.radius).toBeLessThan(BODY_COIL.radius);
    expect(BODY_COIL.radius).toBeLessThan(LAYERS.gradientCoil.inner);
    expect(SHIMS.radius).toBeGreaterThan(LAYERS.gradientCoil.outer);
    expect(BODY_COIL.rungs).toBe(16);
  });

  it('keeps the coil windings inside the helium vessel', () => {
    const helium = LAYERS.heliumVessel;
    for (const coils of [MAIN_COILS, SHIELD_COILS]) {
      expect(coils.inner).toBeGreaterThan(helium.inner);
      expect(coils.outer).toBeLessThan(helium.outer);
      coils.z.forEach((z) => expect(Math.abs(z) + coils.width / 2).toBeLessThan(helium.halfLength));
    }
    expect(MAIN_COILS.z).toHaveLength(6);
    expect(SHIELD_COILS.z).toEqual([-0.5, 0.5]);
  });

  it('stacks the gradient shells x outside, y in the middle, z inside', () => {
    const [x, y, z] = (['x', 'y', 'z'] as const).map(gradientShell);
    expect(x.outer).toBeCloseTo(LAYERS.gradientCoil.outer, 9);
    expect(x.inner).toBeCloseTo(y.outer, 9);
    expect(y.inner).toBeCloseTo(z.outer, 9);
    expect(z.inner).toBeCloseTo(LAYERS.gradientCoil.inner, 9);
  });

  it('puts the cold head on top and the quench pipe up to the ceiling', () => {
    expect(COLD_HEAD.centre).toEqual([0, 2.05, -0.35]);
    expect(COLD_HEAD.top).toBe(MAGNET.top);
    expect(QUENCH_PIPE.to).toBe(ROOM.height);
  });

  it('lays the head at the isocentre inside the head coil, feet out of the bore', () => {
    expect(TABLE.top).toBe(0.92);
    expect(TABLE.z).toEqual([0.85, 3.1]);
    expect(PATIENT.head[1] - PATIENT.headRadius).toBeGreaterThan(TABLE.top);
    expect(PATIENT.feetZ).toBe(1.75);
    expect(HEAD_COIL).toMatchObject({ centre: ISOCENTRE, radius: 0.15, length: 0.3 });
    expect(HEAD_COIL.radius).toBeGreaterThan(PATIENT.headRadius);
    expect(SLICE_THICKNESS).toBeCloseTo(0.005, 9);
  });

  it('places the screen, the voxel inset and the regions inside the room', () => {
    [2.66, 1.55, -0.3].forEach((value, axis) => expect(SCREEN.centre[axis]).toBeCloseTo(value, 9));
    expect(SCREEN.centre[2] + SCREEN.width / 2).toBeLessThan(
      CONTROL_WINDOW.centreZ - CONTROL_WINDOW.width / 2,
    );
    expect(VOXEL.centre).toEqual([0, 1.75, 1.35]);
    expect(VOXEL_ARROWS).toBe(64);
    for (const region of Object.values(REGIONS)) {
      expect(region.x[0]).toBeGreaterThanOrEqual(ROOM.x[0]);
      expect(region.x[1]).toBeLessThanOrEqual(ROOM.x[1]);
      expect(region.z[0]).toBeGreaterThanOrEqual(ROOM.z[0]);
      expect(region.z[1]).toBeLessThanOrEqual(ROOM.z[1]);
      expect(region.y[1]).toBeLessThanOrEqual(ROOM.height);
    }
  });
});
