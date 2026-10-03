import {
  CanvasTexture,
  Color,
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  NoColorSpace,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import type { Texture } from 'three';
import { BOAT, HATCHES, TRANSOM_X } from '../../model/layout';
import { SURFACE_MAPS } from '../constants';
import { THEME } from '../../theme';

type Paint = (context: CanvasRenderingContext2D, width: number, height: number) => void;

const ANISOTROPY = 8;
const CHANNELS = 4;
const BYTE = 255;

export function seededRandom(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x100000000;
  };
}

export function canvasTexture(
  width: number,
  height: number,
  paint: Paint,
  repeat = false,
): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (context) paint(context, width, height);
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = ANISOTROPY;
  texture.flipY = false;
  if (repeat) {
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
  }
  return texture;
}

export function mottle(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  { cells, strength, seed }: { cells: readonly [number, number]; strength: number; seed: number },
): void {
  const random = seededRandom(seed);
  const [columns, rows] = cells;
  const small = document.createElement('canvas');
  small.width = columns;
  small.height = rows;
  const pen = small.getContext('2d');
  if (!pen) return;
  const image = pen.createImageData(columns, rows);
  for (let at = 0; at < columns * rows; at += 1) {
    const shade = Math.round(BYTE * (0.5 + (random() - 0.5) * strength));
    image.data.set([shade, shade, shade, BYTE], at * CHANNELS);
  }
  pen.putImageData(image, 0, 0);
  context.save();
  context.globalCompositeOperation = 'overlay';
  context.imageSmoothingEnabled = true;
  context.drawImage(small, 0, 0, width, height);
  context.restore();
}

function ratioStyle(from: string, to: string): string {
  const base = new Color(from);
  const target = new Color(to);
  return new Color(target.r / base.r, target.g / base.g, target.b / base.b).getStyle();
}

export function hullSideTexture(): Texture {
  const { size, span, mottle: look } = SURFACE_MAPS.side;
  return canvasTexture(size[0], size[1], (context, width, height) => {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    mottle(context, width, height, look);
    context.fillStyle = ratioStyle(THEME.hull, THEME.hullDark);
    context.fillRect(0, 0, width, (SURFACE_MAPS.edgeBand / span) * height);
  });
}

function deckPixel(x: number, z: number, width: number, height: number): [number, number] {
  return [((x - TRANSOM_X) / BOAT.length) * width, ((z + BOAT.beam / 2) / BOAT.beam) * height];
}

function hatchGroove(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  hatch: { x: readonly [number, number]; halfWidth: number },
): void {
  const { groove, lip, radius } = SURFACE_MAPS.deck;
  const [x0, z0] = deckPixel(hatch.x[0], -hatch.halfWidth, width, height);
  const [x1, z1] = deckPixel(hatch.x[1], hatch.halfWidth, width, height);
  const corner = (radius / BOAT.length) * width;
  const pixels = (metres: number) => (metres / BOAT.length) * width;
  const outline = (inset: number) => {
    context.beginPath();
    context.roundRect(x0 + inset, z0 + inset, x1 - x0 - 2 * inset, z1 - z0 - 2 * inset, corner);
  };
  context.strokeStyle = groove.colour;
  context.lineWidth = pixels(groove.width);
  outline(0);
  context.stroke();
  context.strokeStyle = lip.colour;
  context.lineWidth = pixels(lip.width);
  outline(pixels(groove.width));
  context.stroke();
}

export function deckTexture(): Texture {
  const { size, mottle: look, seams } = SURFACE_MAPS.deck;
  return canvasTexture(size[0], size[1], (context, width, height) => {
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, width, height);
    mottle(context, width, height, look);
    context.fillStyle = seams.colour;
    const seamWidth = Math.max(1, (seams.width / BOAT.length) * width);
    const [, seamTop] = deckPixel(0, -seams.reach, width, height);
    const [, seamBottom] = deckPixel(0, seams.reach, width, height);
    seams.across.forEach((x) => {
      const [px] = deckPixel(x, 0, width, height);
      context.fillRect(px, seamTop, seamWidth, seamBottom - seamTop);
    });
    seams.along.forEach(({ z, x }) => {
      const [from, row] = deckPixel(x[0], z, width, height);
      const [to] = deckPixel(x[1], z, width, height);
      context.fillRect(from, row, to - from, seamWidth);
    });
    hatchGroove(context, width, height, HATCHES.forward);
    hatchGroove(context, width, height, HATCHES.mid);
  });
}

export function cellTexture(): Texture {
  const { size, cells, line, base, sheen } = SURFACE_MAPS.panel;
  return canvasTexture(size[0], size[1], (context, width, height) => {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, base);
    gradient.addColorStop(1, sheen);
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    context.fillStyle = line;
    for (let column = 1; column < cells[0]; column += 1) {
      context.fillRect((column / cells[0]) * width, 0, 1, height);
    }
    for (let row = 1; row < cells[1]; row += 1) {
      context.fillRect(0, (row / cells[1]) * height, width, 1);
    }
  });
}

export function repeating(pixels: Uint8Array, size: number, mipmaps = true): DataTexture {
  const texture = new DataTexture(pixels, size, size, RGBAFormat);
  texture.wrapS = RepeatWrapping;
  texture.wrapT = RepeatWrapping;
  texture.magFilter = LinearFilter;
  texture.minFilter = mipmaps ? LinearMipmapLinearFilter : LinearFilter;
  texture.generateMipmaps = mipmaps;
  texture.anisotropy = ANISOTROPY;
  texture.colorSpace = NoColorSpace;
  texture.needsUpdate = true;
  return texture;
}

export function noiseTexture(size: number, low: number, high: number, seed: number): Texture {
  const random = seededRandom(seed);
  const pixels = new Uint8Array(size * size * CHANNELS);
  const coarse = Array.from({ length: (size / 4) ** 2 }, () => random());
  const coarseAt = (x: number, y: number) =>
    coarse[(Math.floor(y / 4) % (size / 4)) * (size / 4) + (Math.floor(x / 4) % (size / 4))];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const value = low + (high - low) * (0.6 * coarseAt(x, y) + 0.4 * random());
      const byte = Math.round(value * BYTE);
      pixels.set([byte, byte, byte, BYTE], (y * size + x) * CHANNELS);
    }
  }
  return repeating(pixels, size);
}
