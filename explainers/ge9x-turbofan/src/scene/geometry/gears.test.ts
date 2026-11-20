import { describe, expect, it } from 'vitest';
import { FULL_TURN } from '@core/math';
import {
  bevelGearGeometry,
  layoutTrain,
  pitchRadius,
  spurGearGeometry,
  toothOutline,
} from './gears';

const MODULE = 0.004;
const TEETH = [30, 42, 24, 36];
const OFFSETS = [0, -0.01, 0.01, -0.01];
const TRAIN = { teeth: TEETH, offsets: OFFSETS, module: MODULE, startX: 0, inputRatio: 1.3 };

describe('toothOutline', () => {
  it('stays between the root and the tip radius', () => {
    const radii = toothOutline(30, MODULE).map((point) => point.length());
    expect(Math.max(...radii)).toBeCloseTo(pitchRadius(30, MODULE) + MODULE, 6);
    expect(Math.min(...radii)).toBeCloseTo(pitchRadius(30, MODULE) - 1.25 * MODULE, 6);
  });
});

describe('spurGearGeometry', () => {
  it('is centred on its axis and as wide as the face', () => {
    const geometry = spurGearGeometry({
      teeth: 30,
      module: MODULE,
      faceWidth: 0.035,
      holes: 5,
      hubRadius: 0.012,
      hubProtrusion: 0.004,
    });
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    expect(box.min.z).toBeCloseTo(-0.0215, 4);
    expect(box.max.z).toBeCloseTo(0.0215, 4);
    expect(box.max.x).toBeCloseTo(pitchRadius(30, MODULE) + MODULE, 3);
  });
});

describe('bevelGearGeometry', () => {
  it('narrows along its length', () => {
    const geometry = bevelGearGeometry({
      teeth: 16,
      module: MODULE,
      length: 0.016,
      narrowScale: 0.5,
    });
    geometry.computeBoundingBox();
    expect(geometry.boundingBox!.max.z).toBeCloseTo(0.016, 6);
    expect(geometry.boundingBox!.max.x).toBeCloseTo(pitchRadius(16, MODULE) + MODULE, 3);
  });
});

describe('layoutTrain', () => {
  const gears = layoutTrain(TRAIN);

  it('keeps every neighbour at the sum of the pitch radii', () => {
    gears.slice(1).forEach((gear, index) => {
      const before = gears[index];
      const distance = Math.hypot(gear.x - before.x, gear.y - before.y);
      expect(distance).toBeCloseTo(before.pitchRadius + gear.pitchRadius, 9);
    });
  });

  it('turns neighbours in opposite directions at matching tooth speed', () => {
    gears.slice(1).forEach((gear, index) => {
      const before = gears[index];
      expect(Math.sign(gear.ratio)).toBe(-Math.sign(before.ratio));
      expect(Math.abs(gear.ratio) * gear.pitchRadius).toBeCloseTo(
        Math.abs(before.ratio) * before.pitchRadius,
        9,
      );
    });
  });

  it('puts a tooth of one gear into a gap of the next', () => {
    gears.slice(1).forEach((gear, index) => {
      const before = gears[index];
      const contact = Math.atan2(gear.y - before.y, gear.x - before.x);
      const seen = ((contact - before.phase) * before.teeth) / FULL_TURN;
      const other = ((contact + Math.PI - gear.phase) * gear.teeth) / FULL_TURN;
      const sum = (((seen + other) % 1) + 1) % 1;
      expect(sum).toBeCloseTo(0.5, 9);
    });
  });
});
