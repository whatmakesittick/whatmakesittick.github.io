import { Vector3 } from 'three';
import type { Figure } from '@core/figure';

const AXES = 3;
const TRIANGLE = 3;
const SUBDIVISIONS = 4;
const BACK_OF_HEAD = new Vector3(0, 0, -1);
const UNIT_CENTRE = 0.5;
const SLICE_STEP = 0.005;
const CENTRE_ACROSS = 0;

export const LABEL_CHANNELS = 2;

export interface LabelDimensions {
  readonly length: number;
  readonly height: number;
  readonly clearance: number;
}

export interface LabelLayout {
  readonly along: number;
  readonly across: number;
  readonly length: number;
  readonly height: number;
}

export interface HeadAxes {
  readonly centre: Vector3;
  readonly up: Vector3;
}

export type CornerBlend = (read: (vertex: number) => number) => number;

export interface LabelCover {
  readonly capped: boolean;
  readonly strapped: boolean;
}

export interface LabelOptions {
  readonly head: HeadAxes;
  readonly dimensions: LabelDimensions;
  readonly stripeHalfWidth: number;
  readonly coverAt: (blend: CornerBlend) => LabelCover;
}

interface Sample extends LabelCover {
  readonly along: number;
  readonly across: number;
  readonly sideways: number;
}

interface Span {
  readonly bottom: number;
  readonly top: number;
}

export function labelAspect(dimensions: LabelDimensions): number {
  return dimensions.height / dimensions.length;
}

function alongUp(point: Vector3, head: HeadAxes): number {
  return point.clone().sub(head.centre).dot(head.up);
}

function acrossBack(point: Vector3, head: HeadAxes): number {
  return point.clone().sub(head.centre).dot(BACK_OF_HEAD);
}

function sampleAt(
  figure: Figure,
  options: LabelOptions,
  corners: readonly number[],
  weights: readonly number[],
): Sample {
  const { head } = options;
  const point = new Vector3();
  corners.forEach((corner, at) =>
    point.addScaledVector(
      new Vector3().fromArray(figure.restPositions, corner * AXES),
      weights[at],
    ),
  );
  const blend: CornerBlend = (read) =>
    corners.reduce((sum, corner, at) => sum + read(corner) * weights[at], 0);
  return {
    along: alongUp(point, head),
    across: acrossBack(point, head),
    sideways: Math.abs(point.x - head.centre.x),
    ...options.coverAt(blend),
  };
}

function inWindow(figure: Figure, vertex: number, options: LabelOptions): boolean {
  const { head, dimensions } = options;
  const y = figure.restPositions[vertex * AXES + 1];
  const z = figure.restPositions[vertex * AXES + 2];
  return (
    y > head.centre.y && Math.abs(z - head.centre.z) < dimensions.height + dimensions.clearance
  );
}

function sideSamples(figure: Figure, options: LabelOptions): Sample[] {
  const samples: Sample[] = [];
  for (let t = 0; t < figure.triangleCount; t++) {
    const corners = [0, 1, 2].map((corner) => figure.indices[t * TRIANGLE + corner]);
    if (!corners.some((vertex) => inWindow(figure, vertex, options))) continue;
    for (let i = 0; i <= SUBDIVISIONS; i++) {
      for (let j = 0; j <= SUBDIVISIONS - i; j++) {
        const weights = [i, j, SUBDIVISIONS - i - j].map((n) => n / SUBDIVISIONS);
        samples.push(sampleAt(figure, options, corners, weights));
      }
    }
  }
  return samples;
}

function lowestTop(samples: readonly Sample[], across: number, options: LabelOptions): number {
  const { dimensions } = options;
  const stripeOffset = options.stripeHalfWidth + dimensions.clearance;
  const bare = samples.filter((sample) => sample.capped && sample.sideways >= stripeOffset);
  const steps = Math.ceil(dimensions.height / 2 / SLICE_STEP);
  const tops = Array.from({ length: 2 * steps + 1 }, (_, at) => {
    const slice = across + (at - steps) * SLICE_STEP;
    const inSlice = bare.filter((sample) => Math.abs(sample.across - slice) <= SLICE_STEP / 2);
    return Math.max(...inSlice.map((sample) => sample.along));
  });
  return Math.min(...tops);
}

function spanAt(samples: readonly Sample[], across: number, options: LabelOptions): Span {
  const { dimensions } = options;
  const band = dimensions.height / 2 + dimensions.clearance;
  const inBand = samples.filter((sample) => Math.abs(sample.across - across) <= band);
  const blocked = inBand.filter((sample) => !sample.capped || sample.strapped);
  return {
    bottom: Math.max(...blocked.map((sample) => sample.along)) + dimensions.clearance,
    top: lowestTop(inBand, across, options),
  };
}

export function labelLayout(figure: Figure, options: LabelOptions): LabelLayout {
  const { dimensions } = options;
  const span = spanAt(sideSamples(figure, options), CENTRE_ACROSS, options);
  const length = Math.min(dimensions.length, span.top - span.bottom);
  return {
    along: (span.bottom + span.top) / 2,
    across: CENTRE_ACROSS,
    length,
    height: length * labelAspect(dimensions),
  };
}

export function labelFields(figure: Figure, head: HeadAxes, layout: LabelLayout): Float32Array {
  const fields = new Float32Array(figure.vertexCount * LABEL_CHANNELS);
  const point = new Vector3();
  for (let v = 0; v < figure.vertexCount; v++) {
    point.fromArray(figure.restPositions, v * AXES);
    const along = alongUp(point, head) - layout.along;
    const across = acrossBack(point, head) - layout.across;
    fields[v * LABEL_CHANNELS] = along / layout.length + UNIT_CENTRE;
    fields[v * LABEL_CHANNELS + 1] = across / layout.height + UNIT_CENTRE;
  }
  return fields;
}
