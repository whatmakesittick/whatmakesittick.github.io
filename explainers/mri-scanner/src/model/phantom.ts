import type { FieldId, TissueId, WeightingId } from '../ids';
import { MODEL_SIZE } from './constants';
import { tissueSignals } from './signal';

interface Ellipse {
  centre: readonly [x: number, y: number];
  radii: readonly [x: number, y: number];
}

interface Layer {
  shape: Ellipse;
  tissue: TissueId | null;
}

const HALF_SIZE = MODEL_SIZE / 2;
const PIXEL_CENTRE = 0.5;
const CENTRE = [0, 0] as const;

const LAYERS: readonly Layer[] = [
  { shape: { centre: CENTRE, radii: [0.72, 0.9] }, tissue: 'fat' },
  { shape: { centre: CENTRE, radii: [0.66, 0.84] }, tissue: null },
  { shape: { centre: CENTRE, radii: [0.6, 0.78] }, tissue: 'fluid' },
  { shape: { centre: CENTRE, radii: [0.55, 0.73] }, tissue: 'greyMatter' },
  { shape: { centre: CENTRE, radii: [0.45, 0.62] }, tissue: 'whiteMatter' },
  { shape: { centre: [-0.11, -0.04], radii: [0.07, 0.22] }, tissue: 'fluid' },
  { shape: { centre: [0.11, -0.04], radii: [0.07, 0.22] }, tissue: 'fluid' },
];

function toUnit(pixel: number): number {
  return (pixel + PIXEL_CENTRE) / HALF_SIZE - 1;
}

function contains({ centre, radii }: Ellipse, u: number, v: number): boolean {
  const across = (u - centre[0]) / radii[0];
  const along = (v - centre[1]) / radii[1];
  return across * across + along * along <= 1;
}

export function phantomTissue(x: number, y: number): TissueId | null {
  const u = toUnit(x);
  const v = toUnit(y);
  return LAYERS.reduce<TissueId | null>(
    (tissue, layer) => (contains(layer.shape, u, v) ? layer.tissue : tissue),
    null,
  );
}

let tissueMap: readonly (TissueId | null)[] | null = null;

function phantomMap(): readonly (TissueId | null)[] {
  tissueMap ??= Array.from({ length: MODEL_SIZE * MODEL_SIZE }, (_, index) =>
    phantomTissue(index % MODEL_SIZE, Math.floor(index / MODEL_SIZE)),
  );
  return tissueMap;
}

export function phantomImage(field: FieldId, weighting: WeightingId): Float32Array {
  const signals = tissueSignals(field, weighting);
  return Float32Array.from(phantomMap(), (tissue) => (tissue === null ? 0 : signals[tissue]));
}
