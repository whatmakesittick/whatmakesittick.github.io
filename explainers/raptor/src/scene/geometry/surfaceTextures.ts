import {
  DataTexture,
  LinearFilter,
  LinearMipmapLinearFilter,
  RGBAFormat,
  RepeatWrapping,
  SRGBColorSpace,
} from 'three';
import { seededRandom } from './random';

const CHANNELS = 4;
const BYTE = 255;
const HALF_BYTE = 127.5;

export interface SurfaceTextures {
  brushed: DataTexture;
  channels: DataTexture;
  heat: DataTexture;
  panels: DataTexture;
  dispose(): void;
}

export interface BrushedSpec {
  size: number;
  repeat: readonly [number, number];
  streakStrength: number;
  seed: number;
}

export interface ChannelSpec {
  width: number;
  repeat: number;
  ribs: number;
  depth: number;
}

export interface PanelSpec {
  size: number;
  repeat: readonly [number, number];
  seam: number;
  grain: number;
  seed: number;
}

export interface HeatSpec {
  height: number;
  keys: readonly (readonly [share: number, level: number])[];
}

function texture(pixels: Uint8Array, width: number, height: number, repeat: boolean): DataTexture {
  const result = new DataTexture(pixels, width, height, RGBAFormat);
  result.wrapS = RepeatWrapping;
  result.wrapT = repeat ? RepeatWrapping : result.wrapT;
  result.magFilter = LinearFilter;
  result.minFilter = LinearMipmapLinearFilter;
  result.generateMipmaps = true;
  result.needsUpdate = true;
  return result;
}

function writeNormal(pixels: Uint8Array, index: number, x: number, y: number): void {
  const z = Math.sqrt(Math.max(0, 1 - x * x - y * y));
  const offset = index * CHANNELS;
  pixels[offset] = Math.round((x + 1) * HALF_BYTE);
  pixels[offset + 1] = Math.round((y + 1) * HALF_BYTE);
  pixels[offset + 2] = Math.round((z + 1) * HALF_BYTE);
  pixels[offset + 3] = BYTE;
}

export function brushedNormals(spec: BrushedSpec): Uint8Array {
  const random = seededRandom(spec.seed);
  const { size } = spec;
  const rows = Array.from({ length: size }, () => random() * 2 - 1);
  const smooth = rows.map(
    (value, row) =>
      (value + rows[(row + 1) % size] * 0.5 + rows[(row + size - 1) % size] * 0.5) / 2,
  );
  const pixels = new Uint8Array(size * size * CHANNELS);
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      const grain = (random() * 2 - 1) * 0.25;
      const slope = (smooth[row] + grain) * spec.streakStrength;
      writeNormal(pixels, row * size + column, 0, slope);
    }
  }
  return pixels;
}

export function ribSlope(share: number, ribs: number, depth: number): number {
  return -Math.sin(share * ribs * Math.PI * 2) * depth;
}

export function channelNormals(spec: ChannelSpec): Uint8Array {
  const pixels = new Uint8Array(spec.width * CHANNELS);
  for (let column = 0; column < spec.width; column += 1) {
    writeNormal(pixels, column, ribSlope(column / spec.width, spec.ribs, spec.depth), 0);
  }
  return pixels;
}

export function heatLevel(share: number, keys: HeatSpec['keys']): number {
  if (share <= keys[0][0]) return keys[0][1];
  for (let index = 1; index < keys.length; index += 1) {
    const [end, level] = keys[index];
    const [start, from] = keys[index - 1];
    if (share <= end) return from + ((level - from) * (share - start)) / (end - start);
  }
  return keys[keys.length - 1][1];
}

export function heatPixels(spec: HeatSpec): Uint8Array {
  const pixels = new Uint8Array(spec.height * CHANNELS);
  for (let row = 0; row < spec.height; row += 1) {
    const level = Math.round(heatLevel(row / (spec.height - 1), spec.keys) * BYTE);
    pixels.set([level, level, level, BYTE], row * CHANNELS);
  }
  return pixels;
}

export function panelPixels(spec: PanelSpec): Uint8Array {
  const random = seededRandom(spec.seed);
  const pixels = new Uint8Array(spec.size * spec.size * CHANNELS);
  const edge = (value: number) => value === 0 || value === spec.size - 1;
  for (let row = 0; row < spec.size; row += 1) {
    const tone = 1 - spec.grain * random();
    for (let column = 0; column < spec.size; column += 1) {
      const level = edge(row) || edge(column) ? spec.seam : tone;
      const value = Math.round(level * BYTE);
      pixels.set([value, value, value, BYTE], (row * spec.size + column) * CHANNELS);
    }
  }
  return pixels;
}

export function createSurfaceTextures(
  brushed: BrushedSpec,
  channels: ChannelSpec,
  heat: HeatSpec,
  panels: PanelSpec,
): SurfaceTextures {
  const brushedMap = texture(brushedNormals(brushed), brushed.size, brushed.size, true);
  brushedMap.repeat.set(...brushed.repeat);
  const channelMap = texture(channelNormals(channels), channels.width, 1, true);
  channelMap.repeat.set(channels.repeat, 1);
  const heatMap = texture(heatPixels(heat), 1, heat.height, false);
  const panelMap = texture(panelPixels(panels), panels.size, panels.size, true);
  panelMap.repeat.set(...panels.repeat);
  panelMap.colorSpace = SRGBColorSpace;
  return {
    brushed: brushedMap,
    channels: channelMap,
    heat: heatMap,
    panels: panelMap,
    dispose: () => [brushedMap, channelMap, heatMap, panelMap].forEach((map) => map.dispose()),
  };
}
