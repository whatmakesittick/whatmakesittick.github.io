import { describe, expect, it } from 'vitest';
import { BETA_INDICES } from '../../ids';
import { MOLECULE_TIMING, STEP_DEG, betaInState } from '../../model/rotor';
import {
  adpLabelBeta,
  atpLabelBeta,
  poseSeatMolecules,
  seatMolecules,
  seatPoint,
} from './molecules';
import type { Point3 } from './points';

function atStep(share: number): number {
  return STEP_DEG + share * STEP_DEG;
}

function distance(a: Point3, b: Point3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

describe('seat molecules', () => {
  it('floats ADP and phosphate into the open seat and docks them by the bind share', () => {
    const rotor = atStep(0);
    const open = betaInState('open', rotor);
    const start = poseSeatMolecules(open, rotor, seatMolecules());
    expect(start.adp.scale).toBe(0);
    expect(distance(start.adp.position, seatPoint(open))).toBeGreaterThan(3);
    const docked = poseSeatMolecules(open, atStep(MOLECULE_TIMING.bindEnd), seatMolecules());
    expect(docked.adp.scale).toBe(1);
    expect(distance(docked.adp.position, seatPoint(open))).toBeCloseTo(0);
    expect(docked.atp.scale).toBe(0);
  });

  it('joins them into ATP in the loose seat with a short glow', () => {
    const rotor = atStep(0);
    const loose = betaInState('loose', rotor);
    const before = poseSeatMolecules(loose, atStep(MOLECULE_TIMING.fuseStart), seatMolecules());
    expect(before.adp.scale).toBe(1);
    expect(before.atp.scale).toBe(0);
    const after = poseSeatMolecules(loose, atStep(MOLECULE_TIMING.fuseEnd), seatMolecules());
    expect(after.adp.scale).toBe(0);
    expect(after.atp.scale).toBe(1);
    expect(after.flash).toBeCloseTo(1);
    expect(before.flash).toBe(0);
  });

  it('lets the ATP go from the tight seat into the matrix and fades it', () => {
    const rotor = atStep(0);
    const tight = betaInState('tight', rotor);
    const held = poseSeatMolecules(tight, atStep(0.05), seatMolecules());
    expect(distance(held.atp.position, seatPoint(tight))).toBeCloseTo(0);
    const leaving = poseSeatMolecules(tight, atStep(0.6), seatMolecules());
    expect(leaving.atp.position.y).toBeGreaterThan(seatPoint(tight).y);
    const gone = poseSeatMolecules(tight, atStep(MOLECULE_TIMING.releaseEnd), seatMolecules());
    expect(gone.atp.scale).toBe(0);
  });

  it('keeps every seat busy with exactly one kind of cargo on arrival', () => {
    BETA_INDICES.forEach((beta) => {
      const pose = poseSeatMolecules(beta, atStep(0.99), seatMolecules());
      const shown = [pose.adp, pose.atp].filter((glyph) => glyph.scale > 0).length;
      expect(shown).toBeLessThanOrEqual(1);
    });
  });

  it('labels the ATP that is leaving, then the one just made', () => {
    expect(atpLabelBeta(atStep(0.5))).toBe(betaInState('tight', atStep(0.5)));
    expect(atpLabelBeta(atStep(0.9))).toBe(betaInState('loose', atStep(0.9)));
    expect(adpLabelBeta(atStep(0.5))).toBe(betaInState('loose', atStep(0.5)));
    expect(adpLabelBeta(atStep(0.9))).toBe(betaInState('open', atStep(0.9)));
  });
});
