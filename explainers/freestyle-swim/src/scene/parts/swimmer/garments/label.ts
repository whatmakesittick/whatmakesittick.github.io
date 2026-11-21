import { Vector3 } from 'three';
import type { Figure } from '@core/figure';
import { CAP, CHANNELS, STRAP, hemsOf } from './regions';
import type { GarmentFields, Hems } from './regions';
import type { RestFrame } from './restFrame';

const AXES = 3;
const TRIANGLE = 3;
const SUBDIVISIONS = 4;
const BACK_OF_HEAD = new Vector3(0, 0, -1);
const UNIT_CENTRE = 0.5;
const SLICE_STEP = 0.005;
const CENTRE_ACROSS = 0;
const CAP_CHANNEL = 1;
const STRAP_CHANNEL = 3;

export const LABEL_ATTRIBUTE = 'garmentLabel';
export const LABEL_CHANNELS = 2;

export const LABEL = {
  length: 0.085,
  height: 0.028,
  clearance: 0.008,
} as const;

export const LABEL_ASPECT = LABEL.height / LABEL.length;

const SEARCH_WINDOW = LABEL.height + LABEL.clearance;

export interface LabelLayout {
  readonly along: number;
  readonly across: number;
  readonly length: number;
  readonly height: number;
}

interface HeadAxes {
  readonly centre: Vector3;
  readonly up: Vector3;
}

interface Sample {
  readonly along: number;
  readonly across: number;
  readonly sideways: number;
  readonly capped: boolean;
  readonly strapped: boolean;
}

interface Span {
  readonly bottom: number;
  readonly top: number;
}

function alongUp(point: Vector3, head: HeadAxes): number {
  return point.clone().sub(head.centre).dot(head.up);
}

function acrossBack(point: Vector3, head: HeadAxes): number {
  return point.clone().sub(head.centre).dot(BACK_OF_HEAD);
}

function mixed(
  corners: readonly number[],
  weights: readonly number[],
  read: (corner: number) => number,
): number {
  return corners.reduce((sum, corner, at) => sum + read(corner) * weights[at], 0);
}

function sampleAt(
  figure: Figure,
  fields: GarmentFields,
  head: Hems['head'],
  corners: readonly number[],
  weights: readonly number[],
): Sample {
  const point = new Vector3();
  corners.forEach((corner, at) =>
    point.addScaledVector(
      new Vector3().fromArray(figure.restPositions, corner * AXES),
      weights[at],
    ),
  );
  const distance = (channel: number) =>
    mixed(corners, weights, (corner) => fields.distances[corner * CHANNELS + channel]);
  const strapAlong = mixed(corners, weights, (corner) => fields.extents[corner * CHANNELS]);
  const strapEdge = Math.min(STRAP.halfWidth - Math.abs(distance(STRAP_CHANNEL)), strapAlong);
  return {
    along: alongUp(point, head),
    across: acrossBack(point, head),
    sideways: Math.abs(point.x - head.centre.x),
    capped: distance(CAP_CHANNEL) > 0,
    strapped: strapEdge > 0,
  };
}

function inWindow(figure: Figure, vertex: number, head: Hems['head']): boolean {
  const y = figure.restPositions[vertex * AXES + 1];
  const z = figure.restPositions[vertex * AXES + 2];
  return y > head.centre.y && Math.abs(z - head.centre.z) < SEARCH_WINDOW;
}

function sideSamples(figure: Figure, fields: GarmentFields, head: Hems['head']): Sample[] {
  const samples: Sample[] = [];
  for (let t = 0; t < figure.triangleCount; t++) {
    const corners = [0, 1, 2].map((corner) => figure.indices[t * TRIANGLE + corner]);
    if (!corners.some((vertex) => inWindow(figure, vertex, head))) continue;
    for (let i = 0; i <= SUBDIVISIONS; i++) {
      for (let j = 0; j <= SUBDIVISIONS - i; j++) {
        const weights = [i, j, SUBDIVISIONS - i - j].map((n) => n / SUBDIVISIONS);
        samples.push(sampleAt(figure, fields, head, corners, weights));
      }
    }
  }
  return samples;
}

function lowestTop(samples: readonly Sample[], across: number): number {
  const stripeOffset = CAP.stripeHalfWidth + LABEL.clearance;
  const bare = samples.filter((sample) => sample.capped && sample.sideways >= stripeOffset);
  const steps = Math.ceil(LABEL.height / 2 / SLICE_STEP);
  const tops = Array.from({ length: 2 * steps + 1 }, (_, at) => {
    const slice = across + (at - steps) * SLICE_STEP;
    const inSlice = bare.filter((sample) => Math.abs(sample.across - slice) <= SLICE_STEP / 2);
    return Math.max(...inSlice.map((sample) => sample.along));
  });
  return Math.min(...tops);
}

function spanAt(samples: readonly Sample[], across: number): Span {
  const band = LABEL.height / 2 + LABEL.clearance;
  const inBand = samples.filter((sample) => Math.abs(sample.across - across) <= band);
  const blocked = inBand.filter((sample) => !sample.capped || sample.strapped);
  return {
    bottom: Math.max(...blocked.map((sample) => sample.along)) + LABEL.clearance,
    top: lowestTop(inBand, across),
  };
}

function lengthOf(span: Span): number {
  return Math.min(LABEL.length, span.top - span.bottom);
}

export function labelLayout(figure: Figure, fields: GarmentFields, frame: RestFrame): LabelLayout {
  const { head } = hemsOf(frame);
  const span = spanAt(sideSamples(figure, fields, head), CENTRE_ACROSS);
  const length = lengthOf(span);
  return {
    along: (span.bottom + span.top) / 2,
    across: CENTRE_ACROSS,
    length,
    height: length * LABEL_ASPECT,
  };
}

export function labelFields(figure: Figure, frame: RestFrame, layout: LabelLayout): Float32Array {
  const { head } = hemsOf(frame);
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
