import { describe, expect, it } from 'vitest';
import { Box3, Vector3 } from 'three';
import { decodeFigure } from '@core/figure';
import { LABEL, LABEL_CHANNELS, labelFields, labelLayout } from './label';
import { labelTexture } from './labelTexture';
import { CAP, CHANNELS, RIGHT_X, STRAP, garmentFields, hemsOf } from './regions';
import { RestFrame } from '@core/figure/body/restFrame';

const { athleteData } = await import('../figure/athlete.data');
const figure = decodeFigure(athleteData);
const frame = new RestFrame(figure);
const fields = garmentFields(figure, frame);
const layout = labelLayout(figure, fields, frame);
const label = labelFields(figure, frame, layout);
const { head } = hemsOf(frame);

const AXES = 3;
const MM = 1000;
const UNIT = 1;
const LENGTH_TOLERANCE_MM = 6;
const CENTRE_TOLERANCE_MM = 3;
const SUBDIVISIONS = 12;
const TRIANGLE = 3;
const READING_ALIGNMENT = 0.9;
const BACK = new Vector3(0, 0, -1);

interface Sample {
  readonly point: Vector3;
  readonly cap: number;
  readonly stripe: number;
  readonly strap: number;
  readonly label: readonly [number, number];
  readonly right: boolean;
}

function vertex(index: number): Vector3 {
  return new Vector3().fromArray(figure.restPositions, index * AXES);
}

function blend(corners: number[], weights: number[], read: (index: number) => number): number {
  return corners.reduce((sum, corner, at) => sum + read(corner) * weights[at], 0);
}

function sampleAt(corners: number[], weights: number[]): Sample {
  const channel = (offset: number) =>
    blend(corners, weights, (index) => fields.distances[index * CHANNELS + offset]);
  const point = corners.reduce(
    (sum, corner, at) => sum.addScaledVector(vertex(corner), weights[at]),
    new Vector3(),
  );
  const cap = channel(1);
  const along = blend(corners, weights, (index) => fields.extents[index * CHANNELS]);
  const sharedAlong = blend(corners, weights, (index) => label[index * LABEL_CHANNELS]);
  const right = (point.x - head.centre.x) * RIGHT_X > 0;
  return {
    point,
    cap,
    stripe: Math.min(CAP.stripeHalfWidth - Math.abs(channel(2)), cap),
    strap: Math.min(STRAP.halfWidth - Math.abs(channel(3)), along),
    label: [
      right ? sharedAlong : UNIT - sharedAlong,
      blend(corners, weights, (index) => label[index * LABEL_CHANNELS + 1]),
    ],
    right,
  };
}

function headSamples(): Sample[] {
  const samples: Sample[] = [];
  for (let t = 0; t < figure.triangleCount; t++) {
    const corners = Array.from(figure.indices.slice(t * TRIANGLE, (t + 1) * TRIANGLE));
    if (corners.some((index) => vertex(index).y < head.centre.y)) continue;
    for (let i = 0; i <= SUBDIVISIONS; i++) {
      for (let j = 0; j <= SUBDIVISIONS - i; j++) {
        const k = SUBDIVISIONS - i - j;
        samples.push(
          sampleAt(
            corners,
            [i, j, k].map((n) => n / SUBDIVISIONS),
          ),
        );
      }
    }
  }
  return samples;
}

const samples = headSamples();
const inLabel = (sample: Sample) => sample.label.every((value) => value >= 0 && value <= UNIT);
const labelled = samples.filter(inLabel);

function sideSet(right: boolean): Sample[] {
  return labelled.filter((sample) => sample.right === right);
}

function middle(set: Sample[]): Vector3 {
  const box = new Box3();
  set.forEach((sample) => box.expandByPoint(sample.point));
  return box.getCenter(new Vector3());
}

function minDistanceMm(from: Sample[], to: Sample[]): number {
  const zone = new Box3();
  from.forEach((sample) => zone.expandByPoint(sample.point));
  zone.expandByScalar(LABEL.clearance * 2);
  const near = to.filter((sample) => zone.containsPoint(sample.point));
  let best = Infinity;
  from.forEach((a) => near.forEach((b) => (best = Math.min(best, a.point.distanceTo(b.point)))));
  return best * MM;
}

function correlation(values: number[], others: number[]): number {
  const mean = (list: number[]) => list.reduce((sum, value) => sum + value, 0) / list.length;
  const [meanA, meanB] = [mean(values), mean(others)];
  const cross = values.reduce((sum, value, at) => sum + (value - meanA) * (others[at] - meanB), 0);
  const spread = (list: number[], centre: number) =>
    Math.sqrt(list.reduce((sum, value) => sum + (value - centre) ** 2, 0));
  return cross / (spread(values, meanA) * spread(others, meanB));
}

function readingAxis(set: Sample[], channel: 0 | 1, axis: Vector3): Vector3 {
  const coordinate = set.map((sample) => sample.label[channel]);
  const along = set.map((sample) => sample.point.dot(axis));
  const strength = correlation(coordinate, along);
  expect(Math.abs(strength)).toBeGreaterThan(READING_ALIGNMENT);
  return axis.clone().multiplyScalar(Math.sign(strength));
}

describe.each([
  ['right', true],
  ['left', false],
])('%s side label', (_name, right) => {
  const set = sideSet(right);
  const clearanceMm = LABEL.clearance * MM;

  it('covers the intended area and lies fully inside the cap', () => {
    expect(set.length).toBeGreaterThan(50);
    expect(set.filter((sample) => sample.cap <= 0)).toEqual([]);
    const ys = set.map((sample) => sample.point.y);
    const extentMm = (Math.max(...ys) - Math.min(...ys)) * MM;
    expect(extentMm).toBeGreaterThan(layout.length * MM - LENGTH_TOLERANCE_MM);
    expect(layout.length).toBeLessThanOrEqual(LABEL.length);
    const offsetMm = Math.abs(middle(set).y - head.centre.y - layout.along) * MM;
    expect(offsetMm).toBeLessThan(CENTRE_TOLERANCE_MM);
  });

  it('keeps clear of the hem, the strap and the stripe', () => {
    const hemGap = Math.min(...set.map((sample) => sample.cap));
    expect(hemGap * MM).toBeGreaterThanOrEqual(clearanceMm);
    const uncapped = samples.filter((sample) => sample.cap <= 0 && sample.point.y > head.centre.y);
    expect(minDistanceMm(set, uncapped)).toBeGreaterThanOrEqual(clearanceMm);
    expect(
      minDistanceMm(
        set,
        samples.filter((sample) => sample.strap > 0),
      ),
    ).toBeGreaterThanOrEqual(clearanceMm);
    expect(
      minDistanceMm(
        set,
        samples.filter((sample) => sample.stripe > 0),
      ),
    ).toBeGreaterThanOrEqual(clearanceMm);
  });

  it('reads the right way round when the swimmer is prone', () => {
    const outward = new Vector3(right ? RIGHT_X : -RIGHT_X, 0, 0);
    const alongText = readingAxis(set, 0, head.up);
    const letterTop = readingAxis(set, 1, BACK);
    expect(alongText.dot(head.up)).toBe(right ? 1 : -1);
    expect(letterTop.dot(BACK)).toBe(1);
    expect(alongText.clone().cross(letterTop).dot(outward)).toBeGreaterThan(0);
  });
});

describe('label', () => {
  it('appears on both sides and nowhere else on the body', () => {
    expect(sideSet(true).length).toBeGreaterThan(0);
    expect(sideSet(false).length).toBeGreaterThan(0);
    expect(labelled.length).toBe(sideSet(true).length + sideSet(false).length);
    expect(labelled.filter((sample) => sample.cap <= 0)).toEqual([]);
    const elsewhere = Array.from({ length: figure.vertexCount }, (_, index) => index).filter(
      (index) => {
        const inside = [0, 1].every((c) => {
          const value = label[index * LABEL_CHANNELS + c];
          return value >= 0 && value <= UNIT;
        });
        return inside && fields.distances[index * CHANNELS + 1] <= 0;
      },
    );
    expect(elsewhere).toEqual([]);
  });

  it('is mirrored between the two sides', () => {
    const right = middle(sideSet(true));
    const left = middle(sideSet(false));
    expect(Math.abs(right.y - left.y) * MM).toBeLessThan(CENTRE_TOLERANCE_MM);
    expect(Math.abs(right.z - left.z) * MM).toBeLessThan(CENTRE_TOLERANCE_MM);
  });

  it('is absent without a 2D canvas', () => {
    expect(labelTexture()).toBeUndefined();
  });
});
