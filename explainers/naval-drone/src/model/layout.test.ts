import { describe, expect, it } from 'vitest';
import { toDegrees } from '@core/math';
import {
  BACKUP_PANEL_X,
  BACKUP_SATELLITE_OFFSET,
  BOAT,
  BOAT_BOUNDS,
  BOW_CAMERA,
  DOME,
  FAIRING,
  FINAL_HEADING,
  HULL_STATIONS,
  JET,
  PANEL,
  SATELLITE_OFFSET,
  STARLINK_PANEL_XS,
  START,
  STEM,
  STUB,
  TRANSOM_X,
  VENT_BOX,
  chineHeight,
  skyPoint,
  stemXAt,
} from './layout';

const SPEC_CHINE_HEIGHTS = [-0.083, -0.08, -0.078, -0.08, 0.002, 0.111, 0.22, 0.33];

describe('boat layout', () => {
  it('takes the main dimensions from the facts sheet', () => {
    expect(BOAT.length).toBe(5.5);
    expect(BOAT.beam).toBe(1.5);
    expect(BOAT.freeboard).toBe(0.5);
    expect(BOAT.cruiseKnots).toBe(22);
    expect(BOAT.topKnots).toBe(42);
    expect(BOAT.halfLength * 2).toBe(BOAT.length);
    expect(TRANSOM_X).toBe(-BOAT.halfLength);
  });

  it('runs the stations from the transom to the bow inside the beam', () => {
    expect(HULL_STATIONS[0].x).toBe(TRANSOM_X);
    expect(HULL_STATIONS[0].keel).toBe(-BOAT.staticDraft);
    HULL_STATIONS.slice(1).forEach((station, index) => {
      expect(station.x).toBeGreaterThan(HULL_STATIONS[index].x);
      expect(station.deadrise).toBeGreaterThanOrEqual(HULL_STATIONS[index].deadrise);
    });
    HULL_STATIONS.forEach((station) => {
      expect(station.sheer[0]).toBeLessThanOrEqual(BOAT.beam / 2);
      expect(station.knuckle[0]).toBeLessThanOrEqual(station.sheer[0]);
      expect(station.chineHalfBreadth).toBeLessThan(station.knuckle[0]);
      expect(station.deck).toBeGreaterThan(station.sheer[1]);
    });
    expect(Math.max(...HULL_STATIONS.map((station) => station.sheer[0]))).toBe(BOAT.beam / 2);
  });

  it('keeps 20 degrees of deadrise aft and puts the chine where the spec says', () => {
    expect(toDegrees(HULL_STATIONS[0].deadrise)).toBeCloseTo(20, 9);
    HULL_STATIONS.forEach((station, index) => {
      expect(chineHeight(station)).toBeCloseTo(SPEC_CHINE_HEIGHTS[index], 2);
    });
    expect(chineHeight(HULL_STATIONS[0])).toBeLessThan(0);
  });

  it('rakes the stem so the static waterline is about 5.1 m long', () => {
    expect(STEM.top[0]).toBe(BOAT.halfLength);
    expect(stemXAt(0) - TRANSOM_X).toBeCloseTo(BOAT.waterlineLength, 1);
    expect(stemXAt(STEM.top[1])).toBeCloseTo(STEM.top[0], 9);
  });

  it('orders the deck items from the stern forward on the centreline', () => {
    const order = [
      VENT_BOX.x[0],
      BACKUP_PANEL_X,
      ...STARLINK_PANEL_XS,
      STUB.x,
      DOME.x,
      BOW_CAMERA.x[0],
    ];
    order.slice(1).forEach((x, index) => expect(x).toBeGreaterThan(order[index]));
    expect(DOME.x).toBeCloseTo(BOAT.halfLength - BOAT.length / 3, 1);
  });

  it('keeps the fairing at the freeboard and the panels on top of it', () => {
    expect(FAIRING.top).toBe(BOAT.freeboard);
    expect(PANEL.top).toBeCloseTo(FAIRING.top + PANEL.thickness + PANEL.raise, 9);
    expect(BACKUP_PANEL_X - PANEL.length / 2).toBeGreaterThan(VENT_BOX.x[1]);
    expect(STARLINK_PANEL_XS[1] + PANEL.length / 2).toBeLessThan(FAIRING.frontTopX);
  });

  it('puts the dome lens 0.7 m above the water', () => {
    expect(DOME.lens).toBe(0.7);
    expect(DOME.lens).toBeLessThan(DOME.top);
    expect(DOME.top).toBeCloseTo(DOME.base + DOME.height + DOME.radius, 9);
  });

  it('runs the jet on its axis just above the bottom of the transom', () => {
    expect(JET.axisY).toBeGreaterThan(-BOAT.staticDraft);
    expect(JET.axisY).toBeLessThan(0);
    expect(JET.steeringNozzle.pivotX).toBe(JET.nozzle.x[0]);
    expect(JET.nozzle.exitDiameter).toBe(0.09);
    expect(BOAT_BOUNDS.x[0]).toBeLessThanOrEqual(JET.steeringNozzle.x[0]);
  });

  it('draws the satellites ahead and above in the frame of the final heading', () => {
    expect(toDegrees(FINAL_HEADING)).toBeCloseTo(-20, 9);
    expect(START.heading).toBe(0);
    const main = skyPoint([0, 0, 0], SATELLITE_OFFSET);
    expect(main[1]).toBe(SATELLITE_OFFSET.up);
    expect(main[0] * Math.cos(FINAL_HEADING) + main[2] * Math.sin(FINAL_HEADING)).toBeCloseTo(
      SATELLITE_OFFSET.ahead,
      9,
    );
    const backup = skyPoint([10, 0, 5], BACKUP_SATELLITE_OFFSET);
    const sideX = -Math.sin(FINAL_HEADING);
    const sideZ = Math.cos(FINAL_HEADING);
    expect((backup[0] - 10) * sideX + (backup[2] - 5) * sideZ).toBeCloseTo(
      BACKUP_SATELLITE_OFFSET.side,
      9,
    );
  });
});
