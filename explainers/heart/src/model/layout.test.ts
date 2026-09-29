import { describe, expect, it } from 'vitest';
import { CHAMBER_IDS, VALVE_IDS } from '../ids';
import {
  APEX,
  AV_NODE,
  CHAMBERS,
  SINUS_NODE,
  VALVES,
  chamberBox,
  chamberOuterBox,
  downstreamChamber,
  isAtrium,
  isLeftHeart,
  upstreamChamber,
  valveRing,
} from './layout';
import { CUT_PLANE_Z, HEART_EXTENT, contains } from './scale';

const CUT_TOLERANCE_MM = 8;

describe('layout', () => {
  it('puts the left heart on the person’s left and the atria above the ventricles', () => {
    for (const chamber of CHAMBER_IDS) {
      const x = CHAMBERS[chamber].centre[0];
      expect(isLeftHeart(chamber) ? x > 0 : x < 0).toBe(true);
      const y = CHAMBERS[chamber].centre[1];
      expect(isAtrium(chamber) ? y > 0 : y < 0).toBe(true);
    }
  });

  it('gives the left ventricle the thickest wall', () => {
    expect(CHAMBERS.leftVentricle.wall).toBeGreaterThan(CHAMBERS.rightVentricle.wall * 2);
    expect(CHAMBERS.rightVentricle.wall).toBeGreaterThan(CHAMBERS.rightAtrium.wall);
  });

  it('keeps every chamber and valve near the cut plane', () => {
    for (const chamber of CHAMBER_IDS) {
      expect(Math.abs(CHAMBERS[chamber].centre[2] - CUT_PLANE_Z)).toBeLessThanOrEqual(
        CUT_TOLERANCE_MM,
      );
    }
    for (const valve of VALVE_IDS) {
      expect(Math.abs(VALVES[valve].centre[2] - CUT_PLANE_Z)).toBeLessThanOrEqual(CUT_TOLERANCE_MM);
    }
  });

  it('seats each inflow valve between its atrium and its ventricle', () => {
    for (const valve of ['tricuspid', 'mitral'] as const) {
      const above = CHAMBERS[upstreamChamber(valve)].centre;
      const downstream = downstreamChamber(valve);
      expect(downstream).not.toBeNull();
      const below = CHAMBERS[downstream ?? 'leftVentricle'].centre;
      const [x, y] = VALVES[valve].centre;
      expect(y).toBeLessThan(above[1]);
      expect(y).toBeGreaterThan(below[1]);
      expect(Math.abs(x - above[0])).toBeLessThan(12);
      expect(Math.abs(x - below[0])).toBeLessThan(12);
    }
  });

  it('sends the outflow valves upward out of their ventricles', () => {
    for (const valve of ['pulmonary', 'aortic'] as const) {
      expect(downstreamChamber(valve)).toBeNull();
      expect(VALVES[valve].centre[1]).toBeGreaterThan(CHAMBERS[upstreamChamber(valve)].centre[1]);
      expect(VALVES[valve].normal[1]).toBeGreaterThan(0.9);
    }
    expect(VALVES.pulmonary.centre[2]).toBeGreaterThan(VALVES.aortic.centre[2]);
  });

  it('points the apex down and to the person’s left, inside the heart extent', () => {
    expect(APEX[0]).toBeGreaterThan(0);
    for (const chamber of CHAMBER_IDS) {
      expect(APEX[1]).toBeLessThan(chamberBox(chamber).y[0]);
    }
    expect(contains(HEART_EXTENT, APEX)).toBe(true);
  });

  it('keeps the nodes in the right atrium and by the septum', () => {
    expect(contains(chamberOuterBox('rightAtrium'), SINUS_NODE.centre)).toBe(true);
    expect(contains(chamberOuterBox('rightAtrium'), AV_NODE)).toBe(true);
    expect(Math.abs(AV_NODE[0])).toBeLessThan(10);
  });

  it('derives boxes and rings from the layout', () => {
    expect(chamberBox('leftVentricle')).toEqual({ x: [-1, 41], y: [-72, 8], z: [-21, 21] });
    expect(chamberOuterBox('leftVentricle').x).toEqual([-10, 50]);
    expect(valveRing('mitral')).toEqual({ centre: [21, 2, -1], radius: 14 });
  });
});
