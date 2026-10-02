import { describe, expect, it } from 'vitest';
import { AIRCRAFT, AIRCRAFT_LAYOUT } from '../../model/layout';
import { WING } from '../constants';
import { airfoilLoop } from './airfoilSurface';
import { boundsOf } from './testing';
import {
  chordAt,
  chordLineY,
  finSurface,
  finTip,
  leadingEdgeX,
  ventralSurface,
  wingPanel,
  wingSurfaceY,
} from './wing';

const LOOP = airfoilLoop(12);

describe('wing plan', () => {
  it('tapers from the root chord to the tip chord across the span', () => {
    expect(chordAt(0)).toBeCloseTo(AIRCRAFT.rootChord);
    expect(chordAt(WING.halfSpan)).toBeCloseTo(AIRCRAFT.tipChord);
    expect(chordAt(-WING.halfSpan)).toBeCloseTo(AIRCRAFT.tipChord);
  });

  it('puts the root quarter chord where the layout says', () => {
    expect(leadingEdgeX(0) - AIRCRAFT.rootChord / 4).toBeCloseTo(
      AIRCRAFT_LAYOUT.wingQuarterChord[0],
    );
    expect(chordLineY(0)).toBeCloseTo(AIRCRAFT_LAYOUT.wingQuarterChord[1]);
  });

  it('lifts the tips with a slight dihedral', () => {
    const rise = chordLineY(WING.halfSpan) - chordLineY(0);
    expect(rise).toBeGreaterThan(0.2);
    expect(rise).toBeLessThan(0.6);
    expect(wingSurfaceY(3, 0.3, true)).toBeGreaterThan(wingSurfaceY(3, 0.3, false));
  });

  it('builds the right panel on the right and the left panel on the left', () => {
    const right = boundsOf(wingPanel(1, WING.innerSpan, WING.halfSpan, LOOP));
    const left = boundsOf(wingPanel(-1, WING.innerSpan, WING.halfSpan, LOOP));
    expect(right.max.z).toBeCloseTo(AIRCRAFT.span / 2);
    expect(right.min.z).toBeCloseTo(WING.innerSpan);
    expect(left.min.z).toBeCloseTo(-AIRCRAFT.span / 2);
    expect(left.max.z).toBeCloseTo(-WING.innerSpan);
  });
});

describe('tail', () => {
  it('raises the two upper fins in a V to the tail top', () => {
    const right = finTip(1);
    const left = finTip(-1);
    expect(right[1]).toBeCloseTo(AIRCRAFT_LAYOUT.tailTop[1]);
    expect(right[2]).toBeGreaterThan(1);
    expect(left[2]).toBeLessThan(-1);
    expect(boundsOf(finSurface(1, LOOP)).max.y).toBeCloseTo(AIRCRAFT_LAYOUT.tailTop[1], 1);
  });

  it('hangs the ventral fin below the tail and ahead of the propeller', () => {
    const fin = boundsOf(ventralSurface(LOOP));
    expect(fin.max.y).toBeLessThan(0);
    expect(fin.min.y).toBeLessThan(-1);
    expect(fin.min.x).toBeGreaterThan(AIRCRAFT_LAYOUT.propeller[0]);
  });
});
