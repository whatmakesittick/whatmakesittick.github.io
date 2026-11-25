import { describe, expect, it } from 'vitest';
import { decodeFigure } from '@core/figure';
import type { Figure } from '@core/figure';
import { TEST_BODIES } from '../bodies.testkit';
import { partitionTriangles } from './partition';
import type { Partition } from './partition';

const AXES = 3;
const AREA_TOLERANCE = 1e-6;
const TIE_TOLERANCE = 1e-6;
const MIN_AREA = 1e-13;
const MAX_GROWTH = 0.15;
const PART_PATTERNS = [/^l_/, /^r_/, /c_(neck|head|jaw|eye|teeth|tongue)|_eye/] as const;
const PART_COUNT = PART_PATTERNS.length + 1;

const bodies = await Promise.all(
  TEST_BODIES.map(async (body) => [body.name, decodeFigure(await body.loadData())] as const),
);

function defineBodyTests(figure: Figure): void {
  function partOf(name: string): number {
    const index = PART_PATTERNS.findIndex((pattern) => pattern.test(name));
    return index < 0 ? PART_PATTERNS.length : index;
  }

  function bodyWeights(): Float32Array {
    const { start, joints, weights } = figure.skin;
    const sums = new Float32Array(figure.vertexCount * PART_COUNT);
    for (let v = 0; v < figure.vertexCount; v++) {
      for (let i = start[v]; i < start[v + 1]; i++) {
        sums[v * PART_COUNT + partOf(figure.jointNames[joints[i]])] += weights[i];
      }
    }
    return sums;
  }

  const weights = bodyWeights();
  const result = partitionTriangles(figure.indices, figure.vertexCount, weights, PART_COUNT);

  function blendedVector(
    source: Float32Array,
    itemSize: number,
    partition: Partition,
  ): Float32Array {
    const { added } = partition;
    const out = new Float32Array((figure.vertexCount + added.count) * itemSize);
    out.set(source);
    for (let k = 0; k < added.count; k++) {
      for (let c = 0; c < itemSize; c++) {
        let sum = 0;
        for (let i = 0; i < AXES; i++) {
          sum += added.weights[k * AXES + i] * source[added.sources[k * AXES + i] * itemSize + c];
        }
        out[(figure.vertexCount + k) * itemSize + c] = sum;
      }
    }
    return out;
  }

  const positions = blendedVector(figure.restPositions, AXES, result);
  const partWeights = blendedVector(weights, PART_COUNT, result);

  function cross(data: Float32Array, a: number, b: number, c: number): number[] {
    const u = [0, 1, 2].map((i) => data[b * AXES + i] - data[a * AXES + i]);
    const v = [0, 1, 2].map((i) => data[c * AXES + i] - data[a * AXES + i]);
    return [u[1] * v[2] - u[2] * v[1], u[2] * v[0] - u[0] * v[2], u[0] * v[1] - u[1] * v[0]];
  }

  function area(data: Float32Array, a: number, b: number, c: number): number {
    return Math.hypot(...cross(data, a, b, c)) / 2;
  }

  function totalArea(indices: ArrayLike<number>, data: Float32Array): number {
    let sum = 0;
    for (let t = 0; t < indices.length; t += AXES) {
      sum += area(data, indices[t], indices[t + 1], indices[t + 2]);
    }
    return sum;
  }

  function partOfRange(position: number): number {
    return (
      result.ranges.find((r) => position >= r.start && position < r.start + r.count)?.part ?? -1
    );
  }

  function outputTriangles(): { corners: number[]; part: number; at: number }[] {
    return Array.from({ length: result.indices.length / AXES }, (_, t) => ({
      corners: [
        result.indices[t * AXES],
        result.indices[t * AXES + 1],
        result.indices[t * AXES + 2],
      ],
      part: partOfRange(t * AXES),
      at: t,
    }));
  }

  describe('partitionTriangles', () => {
    it('keeps the total rest surface area', () => {
      const before = totalArea(figure.indices, figure.restPositions);
      const after = totalArea(result.indices, positions);
      expect(Math.abs(after - before) / before).toBeLessThan(AREA_TOLERANCE);
    });

    it('gives every output triangle the largest weight of its own part', () => {
      for (const { corners, part } of outputTriangles()) {
        const centroid = Array.from(
          { length: PART_COUNT },
          (_, p) => corners.reduce((sum, c) => sum + partWeights[c * PART_COUNT + p], 0) / AXES,
        );
        expect(centroid[part] + TIE_TOLERANCE).toBeGreaterThanOrEqual(Math.max(...centroid));
      }
    });

    it('keeps the orientation of the source triangles', () => {
      outputTriangles().forEach(({ corners, at }) => {
        const own = cross(positions, corners[0], corners[1], corners[2]);
        const t = result.sourceTriangles[at] * AXES;
        const source = cross(
          figure.restPositions,
          figure.indices[t],
          figure.indices[t + 1],
          figure.indices[t + 2],
        );
        const dot = own.reduce((sum, value, i) => sum + value * source[i], 0);
        expect(dot).toBeGreaterThan(0);
      });
    });

    it('shares cut vertices across edges and leaves no degenerate triangles', () => {
      const edgeCount = new Map<string, number>();
      for (const { corners } of outputTriangles()) {
        expect(area(positions, corners[0], corners[1], corners[2])).toBeGreaterThan(MIN_AREA);
        corners.forEach((corner, i) => {
          const next = corners[(i + 1) % AXES];
          const key = `${Math.min(corner, next)}-${Math.max(corner, next)}`;
          edgeCount.set(key, (edgeCount.get(key) ?? 0) + 1);
        });
      }
      const open = [...edgeCount.values()].filter((count) => count === 1).length;
      expect(open).toBe(openEdges(figure.indices));
      expect([...edgeCount.values()].every((count) => count <= 2)).toBe(true);
    });

    it('grows the triangle count by less than fifteen percent', () => {
      const growth = result.indices.length / figure.indices.length - 1;
      expect(growth).toBeLessThan(MAX_GROWTH);
      expect(figure.vertexCount + result.added.count).toBeLessThan(65536);
    });

    it('puts every output index in range and every range inside the list', () => {
      const limit = figure.vertexCount + result.added.count;
      expect(result.indices.every((index) => index < limit)).toBe(true);
      const covered = result.ranges.reduce((sum, range) => sum + range.count, 0);
      expect(covered).toBe(result.indices.length);
    });
  });
}

function openEdges(indices: ArrayLike<number>): number {
  const counts = new Map<string, number>();
  for (let t = 0; t < indices.length; t += AXES) {
    for (let i = 0; i < AXES; i++) {
      const a = indices[t + i];
      const b = indices[t + ((i + 1) % AXES)];
      const key = `${Math.min(a, b)}-${Math.max(a, b)}`;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }
  return [...counts.values()].filter((count) => count === 1).length;
}

describe.each(bodies)('partitionTriangles on the %s body', (_name, figure) => {
  defineBodyTests(figure);
});

describe('partitionTriangles on a strip', () => {
  const strip = [0, 1, 2, 2, 1, 3];
  const split = partitionTriangles(strip, 4, Float32Array.from([1, 0, 1, 0, 0, 1, 0, 1]), 2);

  it('cuts the shared edge once and the two outer edges once each', () => {
    expect(split.added.count).toBe(3);
    const halves = Array.from(split.added.weights).filter((weight) => weight === 0.5);
    expect(halves).toHaveLength(6);
  });

  it('sorts the output by part', () => {
    expect(split.ranges.map((range) => range.part)).toEqual([0, 1]);
    expect(split.indices.length).toBeGreaterThan(strip.length);
  });
});
