import { describe, expect, it } from 'vitest';
import { pointAlong, samplePath, shareCounts } from './streamPath';

describe('stream path', () => {
  const path = samplePath(
    [
      [0, 0, 0],
      [0, -50, 0],
      [0, -100, 0],
    ],
    50,
  );

  it('measures the length and walks along it', () => {
    expect(path.length).toBeCloseTo(100, 0);
    expect(pointAlong(path, 0, [0, 0, 0])[1]).toBeCloseTo(0);
    expect(pointAlong(path, 0.5, [0, 0, 0])[1]).toBeCloseTo(-50, 0);
    expect(pointAlong(path, 1.25, [0, 0, 0])[1]).toBeCloseTo(-25, 0);
  });

  it('shares the points by length and keeps the total', () => {
    const counts = shareCounts([300, 100], 400);
    expect(counts.reduce((sum, count) => sum + count, 0)).toBe(400);
    expect(counts[0]).toBeGreaterThan(counts[1]);
  });
});
