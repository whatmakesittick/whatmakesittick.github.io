import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
} from 'three';
import { clamp, lerp, smoothstep } from '@core/math';

const GRAVEL = {
  size: 128,
  cells: 20,
  tileMetres: 0.75,
  crackWidth: 0.12,
  crackShade: 0.36,
  stoneTone: [0.55, 1] as const,
  relief: 0.28,
  warmth: 0.025,
  light: [-0.6, -0.8] as const,
  anisotropy: 8,
} as const;

const RGBA = 4;
const CHANNEL_MAX = 255;
const NEIGHBOURS = [-1, 0, 1] as const;
const HASH = { x: 374761393, y: 668265263, salt: 362437, mix: 1274126177, shiftA: 13, shiftB: 16 };
const UINT32 = 2 ** 32;
const SALT = { x: 1, y: 2, tone: 3, warmth: 4 } as const;

interface Nearest {
  first: number;
  second: number;
  cellX: number;
  cellY: number;
  offsetX: number;
  offsetY: number;
}

function hash(x: number, y: number, salt: number): number {
  let mixed = Math.imul(x, HASH.x) + Math.imul(y, HASH.y) + Math.imul(salt, HASH.salt);
  mixed = Math.imul(mixed ^ (mixed >>> HASH.shiftA), HASH.mix);
  return ((mixed ^ (mixed >>> HASH.shiftB)) >>> 0) / UINT32;
}

function wrapCell(cell: number): number {
  return ((cell % GRAVEL.cells) + GRAVEL.cells) % GRAVEL.cells;
}

function nearestStone(x: number, y: number): Nearest {
  const found: Nearest = {
    first: Infinity,
    second: Infinity,
    cellX: 0,
    cellY: 0,
    offsetX: 0,
    offsetY: 0,
  };
  const [baseX, baseY] = [Math.floor(x), Math.floor(y)];
  NEIGHBOURS.forEach((dy) =>
    NEIGHBOURS.forEach((dx) => {
      const [cellX, cellY] = [wrapCell(baseX + dx), wrapCell(baseY + dy)];
      const offsetX = x - (baseX + dx + hash(cellX, cellY, SALT.x));
      const offsetY = y - (baseY + dy + hash(cellX, cellY, SALT.y));
      const distance = Math.hypot(offsetX, offsetY);
      if (distance < found.first) {
        Object.assign(found, {
          second: found.first,
          first: distance,
          cellX,
          cellY,
          offsetX,
          offsetY,
        });
      } else if (distance < found.second) {
        found.second = distance;
      }
    }),
  );
  return found;
}

function stoneShade(x: number, y: number): [number, number] {
  const stone = nearestStone(x, y);
  const tone = lerp(...GRAVEL.stoneTone, hash(stone.cellX, stone.cellY, SALT.tone));
  const crack = lerp(
    GRAVEL.crackShade,
    1,
    smoothstep(stone.second - stone.first, 0, GRAVEL.crackWidth),
  );
  const facing = stone.offsetX * GRAVEL.light[0] + stone.offsetY * GRAVEL.light[1];
  const warmth = (hash(stone.cellX, stone.cellY, SALT.warmth) * 2 - 1) * GRAVEL.warmth;
  return [clamp(tone * crack * (1 + GRAVEL.relief * facing), 0, 1), warmth];
}

function gravelPixels(): Uint8Array {
  const { size, cells } = GRAVEL;
  const data = new Uint8Array(size * size * RGBA);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const [value, warmth] = stoneShade((column * cells) / size, (row * cells) / size);
      const rgb = [value * (1 + warmth), value, value * (1 - warmth)];
      const at = (row * size + column) * RGBA;
      rgb.forEach((channel, index) => (data[at + index] = clamp(channel, 0, 1) * CHANNEL_MAX));
      data[at + RGBA - 1] = CHANNEL_MAX;
    }
  }
  return data;
}

export function gravelTexture(): DataTexture {
  const texture = new DataTexture(gravelPixels(), GRAVEL.size, GRAVEL.size, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  texture.anisotropy = GRAVEL.anisotropy;
  texture.repeat.set(1 / GRAVEL.tileMetres, 1 / GRAVEL.tileMetres);
  texture.needsUpdate = true;
  return texture;
}
