import { describe, expect, it } from 'vitest';
import type { Extent, RegionSpec } from '@core/scene/regions';
import { ANCHOR_IDS, REGION_IDS } from '../ids';
import type { Point } from '../ids';
import {
  COMPUTE_TRAYS,
  POWER_SHELVES,
  RACK_COUNT,
  RACKS_PER_ROW,
  ROW_COUNT,
  SWITCH_TRAYS,
} from './constants';
import {
  AIR_CEILING_Y,
  AIR_HANDLERS,
  AISLE,
  ANCHOR_POINTS,
  BATTERIES,
  BLOCK_START_X,
  BUILDING,
  BUSBAR,
  BUSWAY,
  CABLE_TRAY_Y,
  CDU,
  CDUS,
  CEILING_Y,
  CHILLER,
  CHIP_ANCHOR,
  COMPUTE_TRAY_PITCH,
  DESK,
  DRY_COOLER,
  DRY_COOLER_X,
  DRY_COOLERS,
  DRY_COOLERS_PER_ROW,
  ELECTRICAL_ROOM,
  FIBRE_ENTRY,
  GANTRY,
  GENERATOR_COUNT,
  GENSETS,
  GRID_LINE,
  HALL,
  HALL_RACKS,
  HOT_AISLE_Z,
  INSET,
  INSET_CENTRE,
  INSET_SCALE,
  LAPTOP,
  LEAF_RACKS,
  LOWER_COMPUTE_TRAYS,
  MANIFOLD,
  MV_ENTRY,
  PLUME_TOP,
  RACK,
  RACK_RUN_M,
  RACK_STACK,
  REGION_SPECS,
  RISER,
  ROOF_Y,
  ROOM_WALL_X,
  ROW_LENGTH_M,
  ROW_PIPE,
  ROW_Z,
  ROWS,
  SHELVES_PER_GROUP,
  SPINE_RACKS,
  SUBJECT_CDU,
  SUBJECT_RACK,
  SUBJECT_RACK_BOX,
  SUBJECT_ROW,
  SUBJECT_TRAY_INDEX,
  SUBJECT_TRAY_Y,
  SUBSTATION_YARD,
  SWITCHGEAR,
  TAP_BOX,
  TRANSFORMERS,
  UPS,
  WALL_PIPE_X,
  WALL_THICKNESS,
  boxSpan,
  boxTop,
  rackBase,
  standing,
} from './layout';
import type { BoxSpec } from './layout';

const DIGITS = 9;

function within([from, to]: Extent, value: number): boolean {
  return value >= from - 1e-9 && value <= to + 1e-9;
}

function nests(inner: Extent, outer: Extent): boolean {
  return within(outer, inner[0]) && within(outer, inner[1]);
}

function contains(region: RegionSpec, [x, y, z]: Point): boolean {
  return within(region.x, x) && within(region.y, y) && within(region.z, z);
}

function insideFootprint(box: BoxSpec, area: { x: Extent; z: Extent }): boolean {
  const span = boxSpan(box);
  return nests(span.x, area.x) && nests(span.z, area.z);
}

function gapBetween(index: number): number {
  return ROW_Z[index + 1] - ROW_Z[index] - RACK.depth;
}

const HALL_INSIDE = {
  x: [HALL.x[0] + WALL_THICKNESS, HALL.x[1] - WALL_THICKNESS],
  z: [HALL.z[0] + WALL_THICKNESS, HALL.z[1] - WALL_THICKNESS],
} as const satisfies { x: Extent; z: Extent };

describe('layout', () => {
  it('pairs the rows back to back across 0.9 m hot aisles with 1.2 m cold aisles between pairs', () => {
    ROW_Z.slice(0, -1).forEach((_, index) => {
      const backToBack = index % 2 === 0;
      expect(gapBetween(index)).toBeCloseTo(backToBack ? AISLE.hot : AISLE.cold, DIGITS);
    });
    expect(AISLE).toEqual({ cold: 1.2, hot: 0.9 });
    ROW_Z.forEach((z, index) => expect(z).toBeCloseTo(-ROW_Z[ROW_Z.length - 1 - index], DIGITS));
  });

  it('turns the rack fronts toward the cold aisles and the backs toward the hot aisles', () => {
    ROWS.filter(({ block }) => block === 0)
      .slice(0, -1)
      .forEach((row, index) => {
        const next = ROWS[row.index + 1];
        const backToBack = row.facing === -1 && next.facing === 1;
        const faceToFace = row.facing === 1 && next.facing === -1;
        expect(backToBack || faceToFace).toBe(true);
        expect(gapBetween(index)).toBeCloseTo(backToBack ? AISLE.hot : AISLE.cold, DIGITS);
      });
    expect(ROWS.slice(ROW_Z.length).map(({ facing }) => facing)).toEqual(
      ROWS.slice(0, ROW_Z.length).map(({ facing }) => facing),
    );
  });

  it('fills the hall with 16 rows of 12 racks, a CDU and a leaf rack at each row end', () => {
    expect(ROWS).toHaveLength(ROW_COUNT);
    expect(HALL_RACKS).toHaveLength(RACK_COUNT);
    expect(HALL_RACKS).toHaveLength(16 * 12);
    expect(BLOCK_START_X.length * ROW_Z.length).toBe(ROW_COUNT);
    expect(RACK_RUN_M).toBeCloseTo(7.2, DIGITS);
    expect(ROW_LENGTH_M).toBeCloseTo(8.55, DIGITS);
    ROWS.forEach((row) => {
      const racks = HALL_RACKS.filter((rack) => rack.row === row.index);
      expect(racks).toHaveLength(RACKS_PER_ROW);
      const cdu = boxSpan(CDUS[row.index]).x;
      const leaf = boxSpan(LEAF_RACKS[row.index]).x;
      expect(cdu[0]).toBeCloseTo(row.startX + RACK_RUN_M, DIGITS);
      expect(leaf[0]).toBeCloseTo(cdu[1], DIGITS);
      expect(leaf[1]).toBeCloseTo(row.startX + ROW_LENGTH_M, DIGITS);
    });
    expect(CDUS).toHaveLength(ROW_COUNT);
    expect(CDU.width).toBe(0.75);
  });

  it('makes the subject the first rack of block 0 in the row at z 1.134, front to the cold aisle', () => {
    SUBJECT_RACK.forEach((value, axis) =>
      expect(value).toBeCloseTo([-11.7, 0, 1.134][axis], DIGITS),
    );
    expect(SUBJECT_ROW).toMatchObject({ block: 0, z: 1.134, facing: -1 });
    expect(rackBase(SUBJECT_ROW, 0)).toEqual(SUBJECT_RACK);
    const blockZeroX = HALL_RACKS.filter(({ row }) => ROWS[row].block === 0).map(
      ({ base }) => base[0],
    );
    expect(Math.min(...blockZeroX)).toBe(SUBJECT_RACK[0]);
    const front = SUBJECT_RACK[2] + SUBJECT_ROW.facing * (RACK.depth / 2);
    expect(front - AISLE.cold / 2).toBeCloseTo(0, DIGITS);
    expect(SUBJECT_CDU.base[0]).toBeCloseTo(-4.425, DIGITS);
  });

  it('keeps the hall gear inside the hall walls and under the ceiling', () => {
    const hallBoxes = [
      ...HALL_RACKS.map(({ base }) => standing(base, RACK)),
      ...CDUS,
      ...LEAF_RACKS,
      ...SPINE_RACKS,
      ...AIR_HANDLERS,
      DESK,
      LAPTOP,
    ];
    hallBoxes.forEach((box) => {
      expect(insideFootprint(box, HALL_INSIDE)).toBe(true);
      expect(boxTop(box)[1]).toBeLessThan(CEILING_Y);
    });
    [UPS, BATTERIES, SWITCHGEAR].forEach((box) => {
      expect(insideFootprint(box, ELECTRICAL_ROOM)).toBe(true);
      expect(boxSpan(box).x[1]).toBeLessThan(ROOM_WALL_X);
    });
    expect(ELECTRICAL_ROOM.x[1]).toBe(HALL.x[0]);
    expect(CEILING_Y).toBeLessThan(ROOF_Y);
  });

  it('puts the campus around the building: line and substation west, generators north, plant on the roof', () => {
    expect(GRID_LINE.toX).toBe(GANTRY.base[0]);
    expect(boxSpan(GANTRY).x[1]).toBeLessThan(boxSpan(SUBSTATION_YARD).x[0]);
    expect(boxTop(GANTRY)[1]).toBeGreaterThan(GRID_LINE.y);
    TRANSFORMERS.forEach((box) =>
      expect(insideFootprint(box, boxSpan(SUBSTATION_YARD))).toBe(true),
    );
    expect(boxSpan(SUBSTATION_YARD).x[1]).toBeLessThan(BUILDING.x[0]);
    expect(GENSETS).toHaveLength(GENERATOR_COUNT);
    GENSETS.forEach((box) => expect(boxSpan(box).z[1]).toBeLessThan(BUILDING.z[0]));
    [CHILLER, ...DRY_COOLERS].forEach((box) => {
      expect(insideFootprint(box, BUILDING)).toBe(true);
      expect(box.base[1]).toBe(ROOF_Y);
    });
    expect(MV_ENTRY[0]).toBe(BUILDING.x[0]);
    expect(FIBRE_ENTRY[2]).toBe(BUILDING.z[1]);
  });

  it('stacks the shelves and trays from the floor up, with the joule tray in the upper busbar zone', () => {
    const bands = Object.values(RACK_STACK);
    bands.slice(1).forEach((band, index) => expect(band[0]).toBe(bands[index][1]));
    expect(RACK_STACK.upperShelves[1]).toBeLessThan(RACK.height);
    expect(SHELVES_PER_GROUP * 2).toBe(POWER_SHELVES);
    const span = ([from, to]: Extent) => to - from;
    expect(span(RACK_STACK.lowerCompute)).toBeCloseTo(
      LOWER_COMPUTE_TRAYS * COMPUTE_TRAY_PITCH,
      DIGITS,
    );
    const upperTrays = COMPUTE_TRAYS - LOWER_COMPUTE_TRAYS;
    expect(span(RACK_STACK.upperCompute)).toBeCloseTo(upperTrays * COMPUTE_TRAY_PITCH, DIGITS);
    expect(span(RACK_STACK.switchTrays) / SWITCH_TRAYS).toBeGreaterThan(0);
    expect(RACK_STACK.upperCompute[0] + SUBJECT_TRAY_INDEX * COMPUTE_TRAY_PITCH).toBeCloseTo(
      SUBJECT_TRAY_Y,
      DIGITS,
    );
    expect(within(BUSBAR.upper, SUBJECT_TRAY_Y)).toBe(true);
    expect(nests(RACK_STACK.upperCompute, BUSBAR.upper)).toBe(true);
    expect(nests(RACK_STACK.upperShelves, BUSBAR.upper)).toBe(true);
    expect(nests(RACK_STACK.lowerShelves, BUSBAR.lower)).toBe(true);
    expect(BUSBAR.lower[1]).toBeLessThan(BUSBAR.upper[0]);
  });

  it('seats the chip on the joule tray in the front half of the subject rack', () => {
    const rack = boxSpan(SUBJECT_RACK_BOX);
    expect(contains(rack, CHIP_ANCHOR)).toBe(true);
    expect(CHIP_ANCHOR[0]).toBe(SUBJECT_RACK[0]);
    expect(CHIP_ANCHOR[1] - SUBJECT_TRAY_Y).toBeGreaterThan(0);
    expect(CHIP_ANCHOR[1] - SUBJECT_TRAY_Y).toBeLessThan(COMPUTE_TRAY_PITCH);
    expect(CHIP_ANCHOR[2]).toBeLessThan(SUBJECT_RACK[2]);
    expect(within(rack.z, BUSBAR.z)).toBe(true);
    expect(BUSBAR.z).toBeGreaterThan(SUBJECT_RACK[2]);
    [MANIFOLD.supplyX, MANIFOLD.returnX].forEach((x) => expect(within(rack.x, x)).toBe(true));
    expect(within(rack.z, MANIFOLD.z)).toBe(true);
  });

  it('draws the chip inset ten times larger, west of the rack, between the rack top and the busway', () => {
    expect(INSET.shownWidth * INSET_SCALE).toBeCloseTo(INSET.width, DIGITS);
    expect(INSET_CENTRE[0]).toBeLessThan(boxSpan(SUBJECT_RACK_BOX).x[0]);
    expect(INSET_CENTRE[1] - INSET.height / 2).toBeGreaterThan(RACK.height);
    expect(INSET_CENTRE[1] + INSET.height / 2).toBeLessThan(BUSWAY.mainY);
    expect(boxSpan(DESK).x[1]).toBeLessThanOrEqual(INSET_CENTRE[0]);
  });

  it('runs the busway to a tap over the subject rack and the water up a riser over the CDU', () => {
    expect(BUSWAY.endX).toBeLessThan(boxSpan(SUBJECT_RACK_BOX).x[0]);
    expect(BUSWAY.endX).toBeGreaterThan(ROOM_WALL_X);
    expect(TAP_BOX[0]).toBe(SUBJECT_RACK[0]);
    expect(TAP_BOX[1]).toBeGreaterThan(RACK.height);
    expect(ROW_PIPE.y).toBeGreaterThan(RACK.height);
    expect(ROW_PIPE.y).toBeLessThan(CABLE_TRAY_Y);
    expect(CABLE_TRAY_Y).toBeLessThan(BUSWAY.rowY);
    expect(within(boxSpan(SUBJECT_CDU).x, RISER.x)).toBe(true);
    expect(within(boxSpan(SUBJECT_CDU).z, RISER.z)).toBe(true);
    expect(RISER.bottom).toBe(CDU.height);
    expect(RISER.top).toBe(ROOF_Y);
  });

  it('lines five dry coolers end to end in each row and lifts the plume above them', () => {
    expect(DRY_COOLERS).toHaveLength(2 * DRY_COOLERS_PER_ROW);
    expect(DRY_COOLERS_PER_ROW * DRY_COOLER.width).toBeCloseTo(
      DRY_COOLER_X[1] - DRY_COOLER_X[0],
      DIGITS,
    );
    expect(Math.min(...DRY_COOLERS.map((box) => boxSpan(box).x[0]))).toBeCloseTo(
      DRY_COOLER_X[0],
      DIGITS,
    );
    expect(Math.max(...DRY_COOLERS.map((box) => boxSpan(box).x[1]))).toBeCloseTo(
      DRY_COOLER_X[1],
      DIGITS,
    );
    expect(PLUME_TOP[1]).toBeGreaterThan(ROOF_Y + DRY_COOLER.height);
    expect(boxSpan(CHILLER).x[1]).toBeLessThan(DRY_COOLER_X[0]);
  });

  it('lines the air handlers along the east wall with the wall pipe behind them', () => {
    expect(AIR_HANDLERS).toHaveLength(6);
    AIR_HANDLERS.forEach((box) => {
      expect(boxSpan(box).x[1]).toBeLessThan(WALL_PIPE_X);
    });
    expect(WALL_PIPE_X).toBeLessThan(HALL_INSIDE.x[1]);
    expect(AIR_CEILING_Y).toBeLessThan(CEILING_Y);
    expect(AIR_CEILING_Y).toBeGreaterThan(BUSWAY.mainY);
    const back = SUBJECT_RACK[2] + RACK.depth / 2;
    expect(HOT_AISLE_Z - back).toBeCloseTo(AISLE.hot / 2, DIGITS);
  });

  it('gives every fixed anchor a point and every region a box that holds it', () => {
    expect(Object.keys(ANCHOR_POINTS)).toEqual(ANCHOR_IDS.filter((id) => id !== 'joule'));
    expect(Object.keys(REGION_SPECS)).toEqual([...REGION_IDS]);
    Object.values(REGION_SPECS).forEach(({ x, y, z }) =>
      [x, y, z].forEach(([from, to]) => expect(from).toBeLessThan(to)),
    );
    expect(contains(REGION_SPECS.rack, ANCHOR_POINTS.subjectRack)).toBe(true);
    expect(contains(REGION_SPECS.rack, ANCHOR_POINTS.inset)).toBe(true);
    expect(contains(REGION_SPECS.rack, ANCHOR_POINTS.chip)).toBe(true);
    expect(contains(REGION_SPECS.coolingPlant, ANCHOR_POINTS.cdu)).toBe(true);
    expect(contains(REGION_SPECS.coolingPlant, ANCHOR_POINTS.roof)).toBe(true);
    expect(contains(REGION_SPECS.coolingPlant, PLUME_TOP)).toBe(true);
    expect(contains(REGION_SPECS.lineUp, ANCHOR_POINTS.lineUp)).toBe(true);
    expect(contains(REGION_SPECS.networkRow, FIBRE_ENTRY)).toBe(true);
    Object.values(ANCHOR_POINTS).forEach((point) =>
      expect(contains(REGION_SPECS.campus, point)).toBe(true),
    );
    TRANSFORMERS.forEach((box) => expect(contains(REGION_SPECS.powerYard, boxTop(box))).toBe(true));
    expect(contains(REGION_SPECS.powerYard, boxTop(UPS))).toBe(true);
    expect(contains(REGION_SPECS.lineUp, boxTop(LAPTOP))).toBe(true);
  });
});
