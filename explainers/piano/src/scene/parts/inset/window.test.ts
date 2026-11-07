import { describe, expect, it } from 'vitest';
import type { Point } from '../../../ids';
import { BLOW_MM, HAMMER, INSET, PLAYED_KEY, insetCentre, jackAnchor } from '../../../model';
import { hammerAngle } from '../../pose';
import { DROP_SCREW, KNUCKLE, LET_OFF_BUTTON_RECT, SPRING } from '../action/dimensions';
import { turnAbout } from '../ghosts/shapes';
import type { Planar } from '../ghosts/shapes';
import { PANEL, WINDOW, clipBounds, drawnPoint, leaderFor } from './window';

const DIGITS = 9;
const CENTRE: Point = insetCentre(PLAYED_KEY.middle);

function inWindow([y, z]: Planar): boolean {
  return Math.abs(y - WINDOW.y) <= WINDOW.height / 2 && Math.abs(z - WINDOW.z) <= WINDOW.width / 2;
}

describe('inset window', () => {
  it('maps the window onto the whole panel at the inset scale', () => {
    expect(drawnPoint(CENTRE, [WINDOW.y, WINDOW.z])).toEqual([CENTRE[1], CENTRE[2]]);
    const [top, right] = drawnPoint(CENTRE, [
      WINDOW.y + WINDOW.height / 2,
      WINDOW.z + WINDOW.width / 2,
    ]);
    expect(top).toBeCloseTo(CENTRE[1] + INSET.height / 2, DIGITS);
    expect(right).toBeCloseTo(CENTRE[2] + INSET.width / 2, DIGITS);
  });

  it('frames the knuckle, jack, let-off button, drop screw and spring through the stroke', () => {
    const knuckleTop: Planar = [KNUCKLE.y + KNUCKLE.radiusY, KNUCKLE.z];
    const pivot: Planar = [HAMMER.pivotY, HAMMER.pivotZ];
    expect(inWindow(knuckleTop)).toBe(true);
    expect(inWindow(turnAbout(knuckleTop, pivot, hammerAngle(BLOW_MM)))).toBe(true);
    expect(inWindow([LET_OFF_BUTTON_RECT.b[0], LET_OFF_BUTTON_RECT.a[0]])).toBe(true);
    expect(inWindow([DROP_SCREW.bottom, DROP_SCREW.z])).toBe(true);
    expect(inWindow([SPRING.top, SPRING.z - SPRING.radius])).toBe(true);
  });

  it('clips just inside the frame', () => {
    const [minY, maxY, minZ, maxZ] = clipBounds(CENTRE);
    expect(maxY - minY).toBeCloseTo(INSET.height - 2 * PANEL.rim, DIGITS);
    expect(maxZ - minZ).toBeCloseTo(INSET.width - 2 * PANEL.rim, DIGITS);
    expect((minZ + maxZ) / 2).toBeCloseTo(CENTRE[2], DIGITS);
  });

  it('leads from the bottom of the panel to a ring around the jack', () => {
    Object.values(PLAYED_KEY).forEach((key) => {
      const { start, end, ring } = leaderFor(key);
      const centre = insetCentre(key);
      const anchor = jackAnchor(key);
      expect(start[1]).toBeCloseTo(centre[1] - INSET.height / 2, DIGITS);
      expect(Math.abs(start[2] - centre[2])).toBeLessThan(INSET.width / 2);
      expect([ring[1], ring[2]]).toEqual([anchor[1], anchor[2]]);
      expect(ring[0]).toBeLessThan(anchor[0]);
      expect(Math.hypot(end[1] - ring[1], end[2] - ring[2])).toBeCloseTo(PANEL.ringRadius, DIGITS);
    });
  });
});
