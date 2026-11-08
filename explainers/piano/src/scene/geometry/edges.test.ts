import {
  BoxGeometry,
  BufferGeometry,
  EdgesGeometry,
  Float32BufferAttribute,
  LatheGeometry,
  PlaneGeometry,
  Vector2,
} from 'three';
import { describe, expect, it } from 'vitest';
import { edgeGeometry, edgeSegments } from './edges';

const VALUES_PER_SEGMENT = 6;
const CREASE_DEGREES = 30;
const LATHE_PROFILE = [new Vector2(0.2, 0), new Vector2(0.5, 0.3), new Vector2(0.3, 1)];
const LATHE_SEGMENTS = 12;

function referenceEdges(geometry: BufferGeometry, thresholdDegrees: number): number[] {
  return Array.from(new EdgesGeometry(geometry, thresholdDegrees).getAttribute('position').array);
}

describe('edgeSegments', () => {
  it('outlines the twelve edges of a box and skips the face diagonals', () => {
    const segments = edgeSegments(new BoxGeometry(1, 2, 3), CREASE_DEGREES);
    expect(segments.length / VALUES_PER_SEGMENT).toBe(12);
  });

  it('keeps the open border of a flat sheet', () => {
    const segments = edgeSegments(new PlaneGeometry(1, 1, 2, 2), CREASE_DEGREES);
    expect(segments.length / VALUES_PER_SEGMENT).toBe(8);
  });

  it('skips a triangle whose corners meet', () => {
    const sliver = new BufferGeometry().setAttribute(
      'position',
      new Float32BufferAttribute([0, 0, 0, 0, 0, 0, 1, 0, 0], 3),
    );
    expect(edgeSegments(sliver, CREASE_DEGREES)).toEqual([]);
  });

  it.each([
    ['an indexed box', () => new BoxGeometry(1, 2, 3, 2, 1, 1)],
    ['a non-indexed box', () => new BoxGeometry(0.4, 0.1, 0.7).toNonIndexed()],
    ['a lathe', () => new LatheGeometry(LATHE_PROFILE, LATHE_SEGMENTS)],
  ])('draws the same lines as the three.js edge finder for %s', (_, make) => {
    const geometry = make();
    expect(edgeSegments(geometry, CREASE_DEGREES)).toEqual(
      referenceEdges(geometry, CREASE_DEGREES),
    );
  });
});

describe('edgeGeometry', () => {
  it('holds the segments as a position attribute', () => {
    const geometry = new BoxGeometry(1, 1, 1);
    const edges = edgeGeometry(geometry, CREASE_DEGREES);
    expect(Array.from(edges.getAttribute('position').array)).toEqual(
      edgeSegments(geometry, CREASE_DEGREES),
    );
  });
});
