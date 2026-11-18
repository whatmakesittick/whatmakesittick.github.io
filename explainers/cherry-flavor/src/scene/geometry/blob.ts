import { BufferAttribute, Color, IcosahedronGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { smoothstep } from '@core/math';
import { THEME } from '../../theme';

const RGB = 3;
const LUMPS = [
  { scale: 2.3, amount: 0.07, seed: 0.4 },
  { scale: 5.1, amount: 0.035, seed: 1.7 },
  { scale: 11, amount: 0.012, seed: 2.9 },
] as const;
const BITS = { scale: 5.2, from: 0.42, to: 0.52, seed: 5.3 } as const;
const STREAK = { scale: 3.1, amount: 0.06, seed: 8.1 } as const;
const BLUSH = 0.24;
const SYRUP = { scale: 2.2, from: 0.35, to: 0.75, amount: 0.45, seed: 3.6 } as const;
const BASE_FLATTEN = { below: -0.35, squash: 0.55 } as const;

function wave(point: Vector3, scale: number, seed: number): number {
  const x = point.x * scale + seed;
  const y = point.y * scale - seed * 1.3;
  const z = point.z * scale + seed * 0.7;
  return (
    (Math.sin(x + Math.sin(y * 1.3)) * Math.sin(y + Math.sin(z * 0.9)) + Math.sin(z + x * 0.6)) / 2
  );
}

export function scoopGeometry(detail: number): BufferGeometry {
  const base = new IcosahedronGeometry(1, detail);
  base.deleteAttribute('normal');
  base.deleteAttribute('uv');
  const geometry = mergeVertices(base);
  base.dispose();
  const position = geometry.getAttribute('position');
  const colours = new Float32Array(position.count * RGB);
  const point = new Vector3();
  const cream = new Color(THEME.iceCream);
  const bit = new Color(THEME.cherryBits);
  const light = new Color('#ffffff');
  const syrup = new Color(THEME.cherry);
  const colour = new Color();
  for (let index = 0; index < position.count; index += 1) {
    point.fromBufferAttribute(position, index).normalize();
    const lumps = LUMPS.reduce(
      (sum, lump) => sum + wave(point, lump.scale, lump.seed) * lump.amount,
      0,
    );
    const radius = 1 + lumps;
    const y =
      point.y < BASE_FLATTEN.below
        ? BASE_FLATTEN.below + (point.y - BASE_FLATTEN.below) * BASE_FLATTEN.squash
        : point.y;
    position.setXYZ(index, point.x * radius, y * radius, point.z * radius);
    const bits = smoothstep(wave(point, BITS.scale, BITS.seed), BITS.from, BITS.to);
    const streak = Math.max(0, wave(point, STREAK.scale, STREAK.seed)) * STREAK.amount;
    const swirl =
      smoothstep(wave(point, SYRUP.scale, SYRUP.seed), SYRUP.from, SYRUP.to) * SYRUP.amount;
    colour.copy(cream).lerp(syrup, BLUSH).lerp(light, streak).lerp(syrup, swirl).lerp(bit, bits);
    colour.toArray(colours, index * RGB);
  }
  geometry.setAttribute('color', new BufferAttribute(colours, RGB));
  geometry.computeVertexNormals();
  return geometry;
}
