import { BufferGeometry, Float32BufferAttribute } from 'three';

const ITEM_SIZES = { position: 3, normal: 3, color: 3, uv: 2 } as const;

export type GeometryArrays = Partial<Record<keyof typeof ITEM_SIZES, number[]>>;

export function arrayGeometry(arrays: GeometryArrays, indices: number[]): BufferGeometry {
  const geometry = new BufferGeometry();
  Object.entries(arrays).forEach(([name, values]) =>
    geometry.setAttribute(
      name,
      new Float32BufferAttribute(values, ITEM_SIZES[name as keyof typeof ITEM_SIZES]),
    ),
  );
  geometry.setIndex(indices);
  return geometry;
}

export function upNormals(positions: readonly number[]): number[] {
  return positions.map((_, index) => (index % ITEM_SIZES.normal === 1 ? 1 : 0));
}
