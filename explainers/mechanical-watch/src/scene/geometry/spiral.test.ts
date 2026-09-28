import { describe, expect, it } from 'vitest';
import { chained, spiralPath, spiralSampleCount } from './spiral';

describe('spiral path', () => {
  const segments = chained({ radius: 1, angle: 0 }, [
    { toRadius: 3, sweep: Math.PI * 4, samples: 40 },
    { toRadius: 3, sweep: Math.PI / 2, samples: 5 },
  ]);

  it('chains segments end to start', () => {
    expect(segments[1].fromRadius).toBe(3);
    expect(segments[1].fromAngle).toBeCloseTo(Math.PI * 4);
  });

  it('samples every segment and closes on the last point', () => {
    expect(spiralSampleCount(segments)).toBe(46);
    const path = spiralPath(segments);
    expect(Math.hypot(path[0], path[1])).toBeCloseTo(1);
    const last = path.length - 2;
    expect(Math.hypot(path[last], path[last + 1])).toBeCloseTo(3);
    expect(Math.atan2(path[last + 1], path[last])).toBeCloseTo(Math.PI / 2);
  });

  it('grows the radius steadily along an Archimedean coil', () => {
    const path = spiralPath(segments);
    const radii = Array.from({ length: 41 }, (_, index) =>
      Math.hypot(path[index * 2], path[index * 2 + 1]),
    );
    radii.slice(1).forEach((value, index) => expect(value).toBeGreaterThan(radii[index]));
  });
});
