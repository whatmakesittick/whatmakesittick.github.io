import { describe, expect, it } from 'vitest';
import type { RegionSpec } from '@core/scene/regions';
import { ANCHOR_IDS, REGION_IDS } from '../ids';
import type { Point } from '../ids';
import {
  CLEARANCE_MM,
  GAP_MM,
  GUIDE_GAP_MM,
  LINE_M,
  POLE_PITCH_M,
  SECTION_COUNT_TRAIN,
  SUBSTATION_COUNT,
} from './constants';
import {
  ANCHOR_POINTS,
  ARM_ANCHOR,
  CUT_X,
  GHOST_TRACK_Z,
  GIRDER,
  GUIDANCE_RAIL,
  GUIDEWAY_TOP,
  INSET,
  INSET_CENTRE,
  LIFT_TRAVEL_MM,
  LINE_UP_SPACING,
  MAGNETS,
  PIER,
  REGION_SPECS,
  REST_GAP_MM,
  SECTION_COUNT,
  SECTION_EXTENTS,
  SECTION_M,
  SKIDS,
  STATIONS,
  STATOR,
  STATOR_BOTTOM,
  STATOR_PACK_M,
  SUBSTATIONS,
  TRAIN,
  TRAIN_LENGTH,
  WAVE_DRAWN_WAVELENGTH_M,
} from './layout';
import { mm } from './scale';

const MM_PRECISION = 9;

function toMm(metres: number): number {
  return metres * 1000;
}

function contains(region: RegionSpec, [x, y, z]: Point): boolean {
  const inside = ([from, to]: readonly [number, number], value: number) =>
    value >= from && value <= to;
  return inside(region.x, x) && inside(region.y, y) && inside(region.z, z);
}

describe('layout', () => {
  it('builds a 153.2 m train of six sections centred on the origin', () => {
    expect(TRAIN.sectionLengths).toHaveLength(SECTION_COUNT_TRAIN);
    expect(TRAIN_LENGTH).toBeCloseTo(153.2, 9);
    expect(TRAIN.length).toBe(TRAIN_LENGTH);
    expect(TRAIN.noseX).toBeCloseTo(76.6, 9);
    expect(TRAIN.tailX).toBe(-TRAIN.noseX);
  });

  it('lays the sections end to end from the nose back to the tail', () => {
    expect(SECTION_EXTENTS[0][1]).toBe(TRAIN.noseX);
    expect(SECTION_EXTENTS[SECTION_EXTENTS.length - 1][0]).toBeCloseTo(TRAIN.tailX, 9);
    SECTION_EXTENTS.forEach(([from, to], index) => {
      expect(to - from).toBeCloseTo(TRAIN.sectionLengths[index], 9);
      if (index > 0) expect(SECTION_EXTENTS[index - 1][0]).toBeCloseTo(to, 9);
    });
  });

  it('measures 4.2 m from the arm bottom to the roof, floating 150 mm over the guideway', () => {
    expect(TRAIN.roof - TRAIN.armBottom).toBeCloseTo(TRAIN.height, 9);
    expect(TRAIN.height).toBe(4.2);
    expect(toMm(TRAIN.bodyBottom - GUIDEWAY_TOP)).toBeCloseTo(CLEARANCE_MM, MM_PRECISION);
    expect(TRAIN.armBottom).toBeLessThan(MAGNETS.support.top - MAGNETS.support.height);
  });

  it('stands the girder on 8 m piers with the stator packs under its top edges', () => {
    expect(PIER.height + GIRDER.height).toBeCloseTo(GUIDEWAY_TOP, 9);
    expect(GIRDER.bottom).toBeCloseTo(PIER.height, 9);
    expect(GUIDEWAY_TOP - GIRDER.cantileverDepth).toBeCloseTo(STATOR_BOTTOM, 9);
    expect(STATOR.top).toBeCloseTo(STATOR_BOTTOM + STATOR.height, 9);
    expect(GUIDANCE_RAIL.faceZ).toBeCloseTo(GIRDER.topWidth / 2, 9);
    expect(STATOR.sideZ + STATOR.width / 2).toBeLessThan(GUIDANCE_RAIL.faceZ);
  });

  it('holds the support magnets 10 mm under the stator and the guidance magnets 10 mm off the rail', () => {
    expect(toMm(STATOR_BOTTOM - MAGNETS.support.top)).toBeCloseTo(GAP_MM, MM_PRECISION);
    expect(MAGNETS.support.sideZ).toBe(STATOR.sideZ);
    expect(toMm(MAGNETS.guidance.faceZ - GUIDANCE_RAIL.faceZ)).toBeCloseTo(
      GUIDE_GAP_MM,
      MM_PRECISION,
    );
    expect(TRAIN.sectionLengths[1] / MAGNETS.moduleLength).toBeCloseTo(8, 9);
  });

  it('rests the skids on the slide strips 20 mm lower than the floating train', () => {
    expect(LIFT_TRAVEL_MM).toBe(REST_GAP_MM - GAP_MM);
    expect(LIFT_TRAVEL_MM).toBe(20);
    expect(TRAIN.bodyBottom - mm(LIFT_TRAVEL_MM) - SKIDS.height).toBeCloseTo(GUIDEWAY_TOP, 9);
    expect(SKIDS.stripZ).toBeLessThan(STATOR.sideZ);
  });

  it('splits the 30 km line into 25 motor sections with two substations on it', () => {
    expect(SECTION_M * SECTION_COUNT).toBe(LINE_M);
    expect(SUBSTATIONS).toHaveLength(SUBSTATION_COUNT);
    SUBSTATIONS.forEach((line) => {
      expect(line).toBeGreaterThan(0);
      expect(line).toBeLessThan(LINE_M);
    });
    expect(STATIONS.line).toEqual({ longyangRoad: 0, airport: LINE_M });
    expect(STATIONS.platformFloor).toBeGreaterThan(TRAIN.bodyBottom);
  });

  it('hangs the gap inset on the left beside the lead section, above the arm', () => {
    expect(INSET_CENTRE[2]).toBeLessThan(-TRAIN.width / 2);
    expect(ARM_ANCHOR[2]).toBe(-STATOR.sideZ);
    expect(INSET_CENTRE[0]).toBe(ARM_ANCHOR[0]);
    expect(INSET_CENTRE[1] - INSET.height / 2).toBeGreaterThan(ARM_ANCHOR[1]);
    const [leadFrom, leadTo] = SECTION_EXTENTS[0];
    expect(INSET_CENTRE[0] - INSET.width / 2).toBeGreaterThan(leadFrom);
    expect(INSET_CENTRE[0] + INSET.width / 2).toBeLessThan(leadTo);
    expect(CUT_X).toBeGreaterThan(leadFrom);
    expect(CUT_X).toBeLessThan(leadTo);
  });

  it('shows one stator pack, two field wavelengths, with the gap drawn 20 times larger', () => {
    expect(INSET.shownMetres).toBe(STATOR_PACK_M);
    expect(INSET.shownMetres).toBeCloseTo(2 * 2 * POLE_PITCH_M, 2);
    expect(mm(GAP_MM) * INSET.gapScale).toBeCloseTo(0.2, 9);
    expect(WAVE_DRAWN_WAVELENGTH_M).toBeCloseTo(2.064, 9);
  });

  it('places the line-up profiles either side of the train and the ghost track further left', () => {
    expect(LINE_UP_SPACING).toBeGreaterThan(TRAIN.width);
    expect(GHOST_TRACK_Z).toBeGreaterThan(LINE_UP_SPACING + TRAIN.width);
  });

  it('gives every anchor a point and every region a box that holds it', () => {
    expect(Object.keys(ANCHOR_POINTS)).toEqual([...ANCHOR_IDS]);
    expect(Object.keys(REGION_SPECS)).toEqual([...REGION_IDS]);
    Object.values(REGION_SPECS).forEach(({ x, y, z }) =>
      [x, y, z].forEach(([from, to]) => expect(from).toBeLessThan(to)),
    );
    expect(contains(REGION_SPECS.train, ANCHOR_POINTS.nose)).toBe(true);
    expect(contains(REGION_SPECS.train, ANCHOR_POINTS.tail)).toBe(true);
    expect(contains(REGION_SPECS.arm, ANCHOR_POINTS.arm)).toBe(true);
    expect(contains(REGION_SPECS.arm, ANCHOR_POINTS.inset)).toBe(true);
    expect(contains(REGION_SPECS.crossSection, ANCHOR_POINTS.cut)).toBe(true);
    expect(contains(REGION_SPECS.lineUp, ANCHOR_POINTS.lineUp)).toBe(true);
    expect(REGION_SPECS.front.x).toEqual(SECTION_EXTENTS[0]);
    expect(REGION_SPECS.rear.x[1] - REGION_SPECS.rear.x[0]).toBeCloseTo(27 + 24.8, 9);
  });
});
