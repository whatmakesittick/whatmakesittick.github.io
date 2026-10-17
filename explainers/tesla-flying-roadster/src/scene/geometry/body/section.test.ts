import { describe, expect, it } from 'vitest';
import { BODY } from '../../parts/car/dimensions';
import { SEGMENTS, StationSection } from './section';
import { bodyStations } from './stations';

const SAMPLES = 8;
const TOLERANCE = 1e-6;
const ROOF_MATCH = 0.003;
const FULL_WIDTH_MATCH = 0.02;

const sections = bodyStations().map((x) => new StationSection(x));

function sectionPoints(section: StationSection): (readonly [number, number])[] {
  return SEGMENTS.flatMap((segment) =>
    Array.from({ length: SAMPLES + 1 }, (_, step) => section.point(segment, step / SAMPLES)),
  );
}

const points = sections.flatMap(sectionPoints);

describe('StationSection', () => {
  it('keeps every section point inside the car outline', () => {
    const widest = Math.max(...points.map(([z]) => Math.abs(z)));
    const lowest = Math.min(...points.map(([, y]) => y));
    const highest = Math.max(...points.map(([, y]) => y));
    expect(widest).toBeLessThanOrEqual(BODY.halfWidth + TOLERANCE);
    expect(lowest).toBeGreaterThanOrEqual(BODY.floorY - TOLERANCE);
    expect(highest).toBeLessThanOrEqual(BODY.roofY + TOLERANCE);
  });

  it('reaches the roof height and nearly the full width', () => {
    const top = Math.max(...points.map(([, y]) => y));
    const widest = Math.max(...points.map(([z]) => z));
    expect(top).toBeGreaterThan(BODY.roofY - ROOF_MATCH);
    expect(widest).toBeGreaterThan(BODY.halfWidth - FULL_WIDTH_MATCH);
  });

  it('starts and ends each half section on the centre line', () => {
    const offsets = sections.flatMap((section) => [
      section.point('floor', 0)[0],
      section.point('crown', 1)[0],
    ]);
    expect(Math.max(...offsets.map(Math.abs))).toBeLessThan(TOLERANCE);
  });

  it('joins neighbouring segments without gaps', () => {
    const gaps = sections.flatMap((section) =>
      SEGMENTS.slice(1).map((segment, index) => {
        const end = section.point(SEGMENTS[index], 1);
        const start = section.point(segment, 0);
        return Math.hypot(end[0] - start[0], end[1] - start[1]);
      }),
    );
    expect(Math.max(...gaps)).toBeLessThan(TOLERANCE);
  });
});
