import { BufferGeometry, Float32BufferAttribute } from 'three';
import type { BufferAttribute, InterleavedBufferAttribute } from 'three';

type Attribute = BufferAttribute | InterleavedBufferAttribute;

export interface GroupedPart {
  readonly geometry: BufferGeometry;
  readonly material?: number;
}

const ATTRIBUTES = ['position', 'normal', 'uv', 'color'] as const;
type AttributeName = (typeof ATTRIBUTES)[number];

const SIZES: Record<AttributeName, number> = { position: 3, normal: 3, uv: 2, color: 3 };

interface Range {
  readonly start: number;
  readonly count: number;
  readonly material: number;
}

function rangesOf(geometry: BufferGeometry, material?: number): Range[] {
  const total = geometry.index ? geometry.index.count : geometry.getAttribute('position').count;
  if (material !== undefined || geometry.groups.length === 0) {
    return [{ start: 0, count: total, material: material ?? 0 }];
  }
  return geometry.groups.map((group) => ({
    start: group.start,
    count: Math.min(group.count, total - group.start),
    material: group.materialIndex ?? 0,
  }));
}

function sharedAttributes(parts: readonly GroupedPart[]): AttributeName[] {
  return ATTRIBUTES.filter((name) => parts.every((part) => part.geometry.getAttribute(name)));
}

function copyVertex(target: number[], attribute: Attribute, vertex: number, size: number): void {
  for (let axis = 0; axis < size; axis += 1) target.push(attribute.getComponent(vertex, axis));
}

export function mergeGrouped(parts: readonly GroupedPart[]): BufferGeometry {
  const names = sharedAttributes(parts);
  const buckets = new Map<number, Record<string, number[]>>();
  parts.forEach(({ geometry, material }) => {
    rangesOf(geometry, material).forEach((range) => {
      let bucket = buckets.get(range.material);
      if (!bucket) {
        bucket = Object.fromEntries(names.map((name) => [name, [] as number[]]));
        buckets.set(range.material, bucket);
      }
      for (let item = range.start; item < range.start + range.count; item += 1) {
        const vertex = geometry.index ? geometry.index.getX(item) : item;
        names.forEach((name) =>
          copyVertex(bucket[name], geometry.getAttribute(name), vertex, SIZES[name]),
        );
      }
    });
    geometry.dispose();
  });
  const merged = new BufferGeometry();
  const order = [...buckets.keys()].sort((a, b) => a - b);
  let offset = 0;
  names.forEach((name) => {
    const values = order.flatMap((material) => buckets.get(material)?.[name] ?? []);
    merged.setAttribute(name, new Float32BufferAttribute(values, SIZES[name]));
  });
  order.forEach((material) => {
    const count = (buckets.get(material)?.position.length ?? 0) / SIZES.position;
    merged.addGroup(offset, count, material);
    offset += count;
  });
  return merged;
}

export function merge(geometries: readonly BufferGeometry[]): BufferGeometry {
  const merged = mergeGrouped(geometries.map((geometry) => ({ geometry })));
  merged.clearGroups();
  return merged;
}
