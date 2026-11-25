import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import type { ProxySegment } from './proxies';
import { shadowBounds } from './runnerShadow';

const RADIUS_M = 0.05;
const FAR_M = 2;

function segmentAt(x: number): ProxySegment {
  return {
    from: new Vector3(x, 0.5, 0),
    to: new Vector3(x, 1.5, 0),
    radius: RADIUS_M,
    endRadius: RADIUS_M,
  };
}

describe('shadow bounds', () => {
  it('encloses a segment with a margin', () => {
    const bounds = shadowBounds([segmentAt(0)]);
    expect(bounds.uMin).toBeLessThan(bounds.uMax);
    expect(bounds.vMin).toBeLessThan(-RADIUS_M);
    expect(bounds.vMax).toBeGreaterThan(RADIUS_M);
  });

  it('grows when a segment is added far away', () => {
    const single = shadowBounds([segmentAt(0)]);
    const pair = shadowBounds([segmentAt(0), segmentAt(FAR_M)]);
    expect(pair.uMin).toBeLessThanOrEqual(single.uMin);
    expect(pair.uMax).toBeGreaterThanOrEqual(single.uMax);
    expect(pair.vMin).toBeLessThanOrEqual(single.vMin);
    expect(pair.vMax).toBeGreaterThanOrEqual(single.vMax);
    expect(pair).not.toEqual(single);
  });
});
