import { between, seededRandom, weighted } from '../random';
import type { Random, Range } from '../random';
import { landBlocks } from './blocks';
import type { Block } from './blocks';
import { ALONG_X_SHARE, DITCH_GAP, GREENHOUSE, KIND_RUN, zoneAt } from './fieldKinds';
import type { CropKind, FieldKind, Zone } from './fieldKinds';
import type { Axis } from './linears';

export interface Field {
  readonly x: Range;
  readonly z: Range;
  readonly kind: FieldKind;
  readonly tone: number;
  readonly beds: Axis;
}

const FIELD_SEED = 20_190_101;
const SPLIT_JITTER = 0.18;

function size([from, to]: Range): number {
  return to - from;
}

function middle([from, to]: Range): number {
  return (from + to) / 2;
}

export function splitRange(range: Range, maxSize: number, gap: number, random: Random): Range[] {
  const count = Math.ceil(size(range) / maxSize);
  if (count <= 1) return [range];
  const piece = (size(range) - gap * (count - 1)) / count;
  const pieces: Range[] = [];
  let start = range[0];
  for (let index = 0; index < count; index += 1) {
    const last = index === count - 1;
    const length = last ? range[1] - start : piece * (1 + (random() * 2 - 1) * SPLIT_JITTER);
    pieces.push([start, start + length]);
    start += length + gap;
  }
  return pieces;
}

export function stripRanges(range: Range, width: Range, random: Random): Range[] {
  const strips: Range[] = [];
  let start = range[0];
  while (range[1] - start > width[1]) {
    const next = start + between(random, width);
    strips.push([start, next]);
    start = next;
  }
  const last = strips[strips.length - 1];
  if (last && range[1] - start < width[0]) strips[strips.length - 1] = [last[0], range[1]];
  else strips.push([start, range[1]]);
  return strips;
}

function kindPicker(zone: Zone, random: Random): () => CropKind {
  let kind = weighted(random, zone.weights);
  let left = Math.round(between(random, KIND_RUN));
  return () => {
    if (left <= 0) {
      kind = weighted(random, zone.weights);
      left = Math.round(between(random, KIND_RUN));
    }
    left -= 1;
    return kind;
  };
}

function cropFields(block: Block, zone: Zone, random: Random): Field[] {
  const alongX = random() < ALONG_X_SHARE;
  const nextKind = kindPicker(zone, random);
  const field = (x: Range, z: Range, beds: Axis): Field => ({
    x,
    z,
    kind: nextKind(),
    tone: random(),
    beds,
  });
  if (alongX)
    return splitRange(block.x, zone.length, DITCH_GAP, random).flatMap((x) =>
      stripRanges(block.z, zone.strip, random).map((z) => field(x, z, 'x')),
    );
  return splitRange(block.z, zone.depth, DITCH_GAP, random).flatMap((z) =>
    stripRanges(block.x, zone.strip, random).map((x) => field(x, z, 'z')),
  );
}

function greenhouseFields(block: Block, random: Random): Field[] {
  const { width, gap, maxLength, margin } = GREENHOUSE;
  const inner = (range: Range): Range => [range[0] + margin, range[1] - margin];
  const ground: Field = { x: block.x, z: block.z, kind: 'soil', tone: random(), beds: 'z' };
  const rows = splitRange(inner(block.z), maxLength, gap * 2, random);
  const tunnels = rows.flatMap((z) => {
    const [from, to] = inner(block.x);
    const count = Math.floor((to - from + gap) / (width + gap));
    return Array.from({ length: count }, (_, index): Field => {
      const start = from + index * (width + gap);
      return { x: [start, start + width], z, kind: 'greenhouse', tone: random(), beds: 'z' };
    });
  });
  return [ground, ...tunnels];
}

function blockFields(block: Block, random: Random): Field[] {
  const zone = zoneAt(middle(block.z));
  const roomy = size(block.x) > GREENHOUSE.maxLength && size(block.z) > GREENHOUSE.width * 3;
  if (roomy && random() < zone.greenhouseChance) return greenhouseFields(block, random);
  return cropFields(block, zone, random);
}

export function tileFields(blocks: readonly Block[] = landBlocks(), seed = FIELD_SEED): Field[] {
  const random = seededRandom(seed);
  return blocks.flatMap((block) => blockFields(block, random));
}
