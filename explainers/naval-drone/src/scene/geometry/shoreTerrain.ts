import { Color, SplineCurve, Vector2 } from 'three';
import { FULL_TURN, clamp, lerp, smoothstep } from '@core/math';
import { GROUND_STATION, SHORELINE_X, SLIPWAY } from '../../model/layout';
import { THEME } from '../../theme';
import { centredNoise, fractalNoise, signedNoise } from './shoreNoise';

export type Range = readonly [number, number];
export type Spot = readonly [x: number, z: number];

interface Rect {
  x: Range;
  z: Range;
}

export interface TrackSample {
  x: number;
  z: number;
  level: number;
}

export interface TrackHit {
  distance: number;
  level: number;
}

export const COAST = {
  calm: 60,
  blend: 240,
  swing: { amplitude: 200, scale: 900 },
  ripple: { amplitude: 30, scale: 220 },
  bay: { from: 250, to: 2500, depth: 420 },
} as const;

export const SEA_BED = { shelfSlope: 0.075, shelfReach: 80, deepSlope: 0.02 } as const;

export const LAND = {
  beachSlope: 1 / 15,
  beachWidth: 30,
  rise: 0.012,
  hills: { from: 140, to: 900, height: 38, scale: 520, edges: [0.28, 0.78] as Range },
} as const;

export const DUNES = {
  rise: [22, 36] as Range,
  fall: [110, 165] as Range,
  firstCrest: 42,
  spacing: 34,
  warp: { scale: 140, reach: 0.9 },
  hummock: [28, 70] as Range,
  sizeScale: 260,
  height: [2, 4] as Range,
  ridgeShare: 0.42,
  shapeEdges: [0.22, 0.8] as Range,
  lumps: { height: 0.35, scale: 9 },
} as const;

export const SLIPWAY_WORKS = {
  thickness: 0.35,
  apron: { x: [-28, SLIPWAY.x[0]] as Range, z: [-4, 4] as Range },
  reveal: 0.16,
  sink: 0.12,
  shoulder: 3,
  edgeGap: 0.02,
  innerInset: 0.4,
} as const;

export const STATION_SITE = {
  centre: [GROUND_STATION[0], GROUND_STATION[2]] as Spot,
  level: GROUND_STATION[1],
  flat: [17, 13] as Spot,
  corner: 5,
  blend: 16,
} as const;

export const TRACK = {
  points: [
    [-28.4, 0],
    [-36, -2.5],
    [-46, -11],
    [-55, -24],
    [-61, -38],
    [-64, -50.5],
  ] as readonly Spot[],
  halfWidth: 1.9,
  shoulder: 7,
  samples: 72,
  smoothing: 10,
  startBlend: 0.12,
  startDrop: 0.1,
} as const;

export const SHORE_COLOURS = {
  seabed: '#4f493d',
  wet: '#6c6151',
  beach: THEME.beach,
  dry: '#c6b99c',
  wrack: '#5f5646',
  crest: '#c9bb9b',
  grass: '#8a8858',
  heath: '#6f6e50',
  scrubby: '#53573b',
  coast: THEME.shore,
  coastLight: '#6a6850',
  coastDark: '#33362c',
  field: '#78744f',
  gravel: '#8e897e',
} as const;

const TINT = {
  wet: [-4, 1] as Range,
  beach: [2, 6.5] as Range,
  wrack: { at: 9, width: 1.2, scale: [5, 28] as Range, edges: [0.48, 0.72] as Range, share: 0.5 },
  dry: [10, 22] as Range,
  dryShare: 0.5,
  grass: [16, 34] as Range,
  grassScale: [14, 36] as Range,
  grassEdges: [0.32, 0.6] as Range,
  grassShare: 0.8,
  heath: [44, 85] as Range,
  heathShare: 0.75,
  scrub: [30, 60] as Range,
  scrubScale: 24,
  scrubEdges: [0.4, 0.62] as Range,
  scrubShare: 0.85,
  blowout: { from: 0.55, scale: 60, edges: [0.45, 0.6] as Range, share: 0.7 },
  coast: [80, 150] as Range,
  coastScale: 140,
  coastMix: 0.3,
  fields: { scale: 420, edges: [0.5, 0.66] as Range, share: 0.45 },
  grainScale: 7,
  grain: 0.08,
  gravelEdge: 0.75,
} as const;

const SEEDS = {
  swing: 3,
  ripple: 5,
  warp: 7,
  hummock: 11,
  size: 13,
  hills: 17,
  scrub: 19,
  coast: 23,
  grain: 29,
  grass: 31,
  wrack: 37,
  blowout: 41,
  lumps: 43,
  fields: 47,
} as const;
const NOISE_ROW = 0.5;
const RIDGE_MIDDLE = 0.5;
const DUNE_SIZE_OCTAVES = 2;

export function shorelineX(z: number): number {
  const reach = smoothstep(Math.abs(z), COAST.calm, COAST.calm + COAST.blend);
  const { swing, ripple, bay } = COAST;
  const sweep = swing.amplitude * centredNoise(z / swing.scale, NOISE_ROW, SEEDS.swing);
  const wobble = ripple.amplitude * centredNoise(z / ripple.scale, NOISE_ROW, SEEDS.ripple);
  const curve = Math.max(0, Math.abs(z) - bay.from) / (bay.to - bay.from);
  return SHORELINE_X + reach * (sweep + wobble) + bay.depth * curve * curve;
}

export function inlandDistance(x: number, z: number): number {
  return shorelineX(z) - x;
}

export function profileHeight(inland: number): number {
  if (inland <= 0) {
    const offshore = -inland;
    const shelf = Math.min(offshore, SEA_BED.shelfReach) * SEA_BED.shelfSlope;
    return -shelf - Math.max(0, offshore - SEA_BED.shelfReach) * SEA_BED.deepSlope;
  }
  const beach = Math.min(inland, LAND.beachWidth) * LAND.beachSlope;
  return beach + Math.max(0, inland - LAND.beachWidth) * LAND.rise;
}

function duneBand(inland: number): number {
  return smoothstep(inland, ...DUNES.rise) * (1 - smoothstep(inland, ...DUNES.fall));
}

function duneShape(x: number, z: number, inland: number): number {
  const { warp } = DUNES;
  const bend = centredNoise(x / warp.scale, z / warp.scale, SEEDS.warp) * warp.reach;
  const phase = (inland - DUNES.firstCrest) / DUNES.spacing + bend;
  const ridge = RIDGE_MIDDLE + RIDGE_MIDDLE * Math.cos(FULL_TURN * phase);
  const [across, along] = DUNES.hummock;
  const hummock = fractalNoise(x / across, z / along, SEEDS.hummock);
  return smoothstep(lerp(hummock, ridge, DUNES.ridgeShare), ...DUNES.shapeEdges);
}

export function duneHeight(x: number, z: number, inland: number): number {
  const band = duneBand(inland);
  if (band <= 0) return 0;
  const scale = DUNES.sizeScale;
  const size = fractalNoise(x / scale, z / scale, SEEDS.size, DUNE_SIZE_OCTAVES);
  return band * lerp(DUNES.height[0], DUNES.height[1], size) * duneShape(x, z, inland);
}

function lumpHeight(x: number, z: number, inland: number): number {
  const { height, scale } = DUNES.lumps;
  return duneBand(inland) * height * signedNoise(x / scale, z / scale, SEEDS.lumps);
}

function hillHeight(x: number, z: number, inland: number): number {
  const { hills } = LAND;
  const reach = smoothstep(inland, hills.from, hills.to);
  if (reach <= 0) return 0;
  const level = fractalNoise(x / hills.scale, z / hills.scale, SEEDS.hills);
  return reach * hills.height * smoothstep(level, ...hills.edges);
}

export function naturalHeight(x: number, z: number): number {
  const inland = inlandDistance(x, z);
  const dunes = duneHeight(x, z, inland) + lumpHeight(x, z, inland);
  return profileHeight(inland) + dunes + hillHeight(x, z, inland);
}

export function slabTop(x: number): number {
  const share = clamp((x - SLIPWAY.x[0]) / (SLIPWAY.x[1] - SLIPWAY.x[0]), 0, 1);
  return lerp(SLIPWAY.top, SLIPWAY.foot, share);
}

const SLIPWAY_RECTS: readonly Rect[] = [
  { x: SLIPWAY.x, z: SLIPWAY.z },
  { x: SLIPWAY_WORKS.apron.x, z: SLIPWAY_WORKS.apron.z },
];

function rectGap(x: number, z: number, rect: Rect): number {
  const dx = Math.max(rect.x[0] - x, 0, x - rect.x[1]);
  const dz = Math.max(rect.z[0] - z, 0, z - rect.z[1]);
  return Math.hypot(dx, dz);
}

export function slipwayGap(x: number, z: number): number {
  return Math.min(...SLIPWAY_RECTS.map((rect) => rectGap(x, z, rect)));
}

function slipwayCut(x: number, z: number, ground: number): number {
  const gap = slipwayGap(x, z);
  if (gap > SLIPWAY_WORKS.shoulder) return ground;
  const top = slabTop(clamp(x, SLIPWAY_WORKS.apron.x[0], SLIPWAY.x[1]));
  if (gap <= 0) return top - SLIPWAY_WORKS.thickness - SLIPWAY_WORKS.sink;
  return lerp(top - SLIPWAY_WORKS.reveal, ground, smoothstep(gap, 0, SLIPWAY_WORKS.shoulder));
}

export function stationGap(x: number, z: number): number {
  const { centre, flat, corner } = STATION_SITE;
  const qx = Math.max(Math.abs(x - centre[0]) - (flat[0] - corner), 0);
  const qz = Math.max(Math.abs(z - centre[1]) - (flat[1] - corner), 0);
  return Math.max(0, Math.hypot(qx, qz) - corner);
}

function stationGrade(x: number, z: number, ground: number): number {
  const share = smoothstep(stationGap(x, z), 0, STATION_SITE.blend);
  return lerp(STATION_SITE.level, ground, share);
}

function smoothed(values: readonly number[], reach: number): number[] {
  return values.map((_, index) => {
    const window = values.slice(Math.max(0, index - reach), index + reach + 1);
    return window.reduce((sum, value) => sum + value, 0) / window.length;
  });
}

function trackSamples(): readonly TrackSample[] {
  const curve = new SplineCurve(TRACK.points.map(([x, z]) => new Vector2(x, z)));
  const points = curve.getSpacedPoints(TRACK.samples);
  const ground = points.map((point) =>
    stationGrade(point.x, point.y, naturalHeight(point.x, point.y)),
  );
  const levels = smoothed(ground, TRACK.smoothing);
  const start = SLIPWAY.top - TRACK.startDrop;
  return points.map((point, index) => ({
    x: point.x,
    z: point.y,
    level: lerp(start, levels[index], smoothstep(index / TRACK.samples, 0, TRACK.startBlend)),
  }));
}

const TRACK_PATH = trackSamples();

export function trackLine(): readonly TrackSample[] {
  return TRACK_PATH;
}
const TRACK_REACH = TRACK.halfWidth + TRACK.shoulder;

function bounds(values: readonly number[]): Range {
  return [Math.min(...values) - TRACK_REACH, Math.max(...values) + TRACK_REACH];
}

const TRACK_BOX = {
  x: bounds(TRACK_PATH.map((sample) => sample.x)),
  z: bounds(TRACK_PATH.map((sample) => sample.z)),
} as const;

function segmentHit(x: number, z: number, from: TrackSample, to: TrackSample): TrackHit {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const along = clamp(((x - from.x) * dx + (z - from.z) * dz) / (dx * dx + dz * dz), 0, 1);
  return {
    distance: Math.hypot(x - from.x - along * dx, z - from.z - along * dz),
    level: lerp(from.level, to.level, along),
  };
}

function nearTrack(x: number, z: number): boolean {
  const insideX = x >= TRACK_BOX.x[0] && x <= TRACK_BOX.x[1];
  return insideX && z >= TRACK_BOX.z[0] && z <= TRACK_BOX.z[1];
}

export function trackHit(x: number, z: number): TrackHit | null {
  if (!nearTrack(x, z)) return null;
  let best: TrackHit | null = null;
  for (let index = 1; index < TRACK_PATH.length; index += 1) {
    const hit = segmentHit(x, z, TRACK_PATH[index - 1], TRACK_PATH[index]);
    if (!best || hit.distance < best.distance) best = hit;
  }
  return best && best.distance < TRACK_REACH ? best : null;
}

function trackGrade(x: number, z: number, ground: number): number {
  const hit = trackHit(x, z);
  if (!hit) return ground;
  return lerp(hit.level, ground, smoothstep(hit.distance, TRACK.halfWidth, TRACK_REACH));
}

export function shoreHeight(x: number, z: number): number {
  const natural = naturalHeight(x, z);
  return slipwayCut(x, z, trackGrade(x, z, stationGrade(x, z, natural)));
}

const COLOURS = Object.fromEntries(
  Object.entries(SHORE_COLOURS).map(([name, value]) => [name, new Color(value)]),
) as Record<keyof typeof SHORE_COLOURS, Color>;
const SHADE = new Color();

export function scrubPatch(x: number, z: number): number {
  const patch = fractalNoise(x / TINT.scrubScale, z / TINT.scrubScale, SEEDS.scrub);
  return smoothstep(patch, ...TINT.scrubEdges);
}

export function grassPatch(x: number, z: number): number {
  const [across, along] = TINT.grassScale;
  return smoothstep(fractalNoise(x / across, z / along, SEEDS.grass), ...TINT.grassEdges);
}

function wrackShare(x: number, z: number, inland: number): number {
  const { at, width, scale, edges, share } = TINT.wrack;
  const line = 1 - smoothstep(Math.abs(inland - at), 0, width);
  return line * smoothstep(fractalNoise(x / scale[0], z / scale[1], SEEDS.wrack), ...edges) * share;
}

function sandColour(x: number, z: number, inland: number, target: Color): Color {
  target.copy(COLOURS.seabed).lerp(COLOURS.wet, smoothstep(inland, ...TINT.wet));
  target.lerp(COLOURS.beach, smoothstep(inland, ...TINT.beach));
  target.lerp(COLOURS.dry, smoothstep(inland, ...TINT.dry) * TINT.dryShare);
  return target.lerp(COLOURS.wrack, wrackShare(x, z, inland));
}

function plantColour(x: number, z: number, inland: number, target: Color): Color {
  const grass = smoothstep(inland, ...TINT.grass) * grassPatch(x, z);
  target.lerp(COLOURS.grass, grass * TINT.grassShare);
  target.lerp(COLOURS.heath, smoothstep(inland, ...TINT.heath) * TINT.heathShare);
  const scrub = smoothstep(inland, ...TINT.scrub) * scrubPatch(x, z);
  return target.lerp(COLOURS.scrubby, scrub * TINT.scrubShare);
}

function blowoutColour(x: number, z: number, inland: number, target: Color): Color {
  const { from, scale, edges, share } = TINT.blowout;
  const relief = duneHeight(x, z, inland) / DUNES.height[1];
  const bare = smoothstep(fractalNoise(x / scale, z / scale, SEEDS.blowout), ...edges);
  return target.lerp(COLOURS.crest, smoothstep(relief, from, 1) * bare * share);
}

function coastColour(x: number, z: number, inland: number, target: Color): Color {
  const scale = TINT.coastScale;
  const variation = fractalNoise(x / scale, z / scale, SEEDS.coast);
  SHADE.copy(COLOURS.coastDark).lerp(COLOURS.coastLight, variation);
  SHADE.lerp(COLOURS.coast, TINT.coastMix);
  const { fields } = TINT;
  const field = smoothstep(
    fractalNoise(x / fields.scale, z / fields.scale, SEEDS.fields),
    ...fields.edges,
  );
  SHADE.lerp(COLOURS.field, field * fields.share);
  return target.lerp(SHADE, smoothstep(inland, ...TINT.coast));
}

function worksColour(x: number, z: number, target: Color): Color {
  const hit = trackHit(x, z);
  const edge = TRACK.halfWidth * TINT.gravelEdge;
  const track = hit ? 1 - smoothstep(hit.distance, edge, TRACK.halfWidth) : 0;
  const station = 1 - smoothstep(stationGap(x, z), 0, STATION_SITE.corner);
  return target.lerp(COLOURS.gravel, Math.max(track, station));
}

export function shoreColour(x: number, z: number, target: Color): Color {
  const inland = inlandDistance(x, z);
  sandColour(x, z, inland, target);
  plantColour(x, z, inland, target);
  blowoutColour(x, z, inland, target);
  coastColour(x, z, inland, target);
  worksColour(x, z, target);
  const grain = centredNoise(x / TINT.grainScale, z / TINT.grainScale, SEEDS.grain) * TINT.grain;
  return target.multiplyScalar(1 + grain);
}
