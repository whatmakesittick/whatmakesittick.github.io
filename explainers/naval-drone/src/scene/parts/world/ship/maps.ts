import { Color, RepeatWrapping, SRGBColorSpace } from 'three';
import type { Texture } from 'three';
import { SHIP } from '../../../../model/layout';
import type { Extent } from '../../../../model/layout';
import { THEME } from '../../../../theme';
import type { Uv } from '../../../geometry/surface';
import { canvasTexture, mottle, noiseTexture, seededRandom } from '../../surfaces';
import { STERN, deckEdgeY, topY } from './hull';

type Pen = CanvasRenderingContext2D;
type Region = 'side' | 'front' | 'aft' | 'roof';
type Paint = (pen: Pen, width: number, height: number) => void;

export const PAINT = {
  hull: THEME.ship,
  deck: '#5f676e',
  dark: '#2b3035',
  steel: '#8f979e',
  white: '#e3e6e7',
  soot: '#1d1f22',
} as const;

const TINTS = {
  antifouling: '#5b3833',
  bootTop: '#26292d',
  rust: '#7d4a2b',
  hole: '#121619',
  rim: '#a3abb2',
  roof: '#6a737b',
  door: '#6f7a84',
  window: '#17202a',
  louvre: '#3b4249',
} as const;

const HULL_MAP = {
  size: [4096, 512],
  span: [-4.6, 9.2] as Extent,
  boot: [-0.5, 0.6] as const,
  grime: 1.6,
  mottle: { cells: [160, 18] as const, strength: 0.14, seed: 71 },
  strakes: [-2.6, -1, 1.5, 3.1, 4.7],
  butt: 10.5,
  seam: 0.11,
  streaks: [150, 0.07, 17, 4, 130],
  ports: {
    y: 3.9,
    radius: 0.19,
    rim: 0.06,
    pitch: 1.8,
    runs: [
      [-31, -21],
      [-13, 9],
      [15, 33],
    ],
  },
  rust: 0.32,
  lines: [3, 4],
} as const;

export const HAWSE = { x: 46, y: 5.4, radius: [0.62, 0.5], streak: 4.5 } as const;

const DECK_MAP = {
  size: [2048, 256],
  half: 7.5,
  mottle: { cells: [120, 12] as const, strength: 0.18, seed: 33 },
  seams: [6, 0.22],
  along: [-4.9, -2.4, 2.4, 4.9],
} as const;

const WALL_MAP = {
  size: [2048, 1024],
  x: [-23, 28] as Extent,
  y: [5.5, 17.5] as Extent,
  z: [-8, 8] as Extent,
  regions: {
    side: [0, 0, 1, 0.5],
    front: [0, 0.5, 0.25, 1],
    aft: [0.25, 0.5, 0.5, 1],
    roof: [0.5, 0.5, 1, 1],
  },
  mottle: { cells: [200, 80] as const, strength: 0.12, seed: 91 },
  panel: 64,
  streaks: [220, 0.06, 23, 5, 80],
} as const;

const DOOR = { width: 0.8, height: 1.9, floors: [6.25, 8.9, 11.7] } as const;

const DOORS: readonly (readonly [Region, number, number])[] = [
  ['side', -15.5, 0],
  ['side', 1.8, 0],
  ['side', 19.8, 0],
  ['front', -3, 0],
  ['front', 3, 0],
  ['aft', -2.5, 0],
  ['aft', 2.5, 0],
  ['aft', 0, 1],
  ['aft', -2.2, 2],
  ['aft', 2.2, 2],
];

const WINDOWS: readonly (readonly [Region, number, Extent, readonly number[]])[] = [
  ['side', 0.4, [7.35, 7.75], [-11, -9.5, -8, 6.5, 8, 9.5, 11, 23]],
  ['side', 0.8, [10.05, 10.65], [6.5, 8, 9.5, 11, 15, 16.5, 18, 19.5, 21]],
  ['front', 0.9, [10.05, 10.75], [-3.2, -1.9, 1.9, 3.2]],
];

const LOUVRES: readonly (readonly [Region, Extent, Extent])[] = [
  ['side', [-6.5, -4.5], [7, 8.3]],
  ['side', [12, 13.5], [6.9, 8.2]],
  ['side', [-7.6, -2.4], [9.4, 10.8]],
  ['aft', [-0.9, 0.9], [6.9, 8.2]],
];

const SOOT: readonly (readonly [Region, Extent])[] = [
  ['side', [-10.5, 0]],
  ['front', [-3, 3]],
  ['aft', [-3, 3]],
];

const SOOT_FROM = 15.2;
const SLATS = 8;
const OUTLINE = 0.5;
const GRAIN = [64, 0.62, 0.82, 41] as const;
const GLASS = { size: [256, 128], colours: ['#33475a', '#0f171f'], frame: 12 } as const;
const RAIL_MAP = { size: 128, bars: [0, 0.45, 0.75], bar: 0.05, post: 0.04 } as const;
export const RAIL = { height: 1.05, tile: 1.25 } as const;

const share = (value: number, [from, to]: Extent) => (value - from) / (to - from);
const shade = (value: number) => `rgba(0, 0, 0, ${value})`;

function tint(target: string): string {
  const base = new Color(PAINT.hull);
  const to = new Color(target);
  return new Color(to.r / base.r, to.g / base.g, to.b / base.b).getStyle(SRGBColorSpace);
}

const rust = (value: number) =>
  tint(TINTS.rust).replace('rgb(', 'rgba(').replace(')', `, ${value})`);

function streak(pen: Pen, x: number, y: number, width: number, length: number, colour: string) {
  const gradient = pen.createLinearGradient(0, y, 0, y + length);
  gradient.addColorStop(0, colour);
  gradient.addColorStop(1, shade(0));
  pen.fillStyle = gradient;
  pen.fillRect(x - width / 2, y, width, length);
}

function oval(pen: Pen, x: number, y: number, rx: number, ry: number, colour: string) {
  pen.fillStyle = colour;
  pen.beginPath();
  pen.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  pen.fill();
}

function weather(
  pen: Pen,
  streaks: readonly number[],
  spot: (random: () => number) => [number, number],
) {
  const [count, alpha, seed, width, length] = streaks;
  const random = seededRandom(seed);
  for (let at = 0; at < count; at += 1) {
    const colour = random() > 1 / 3 ? shade(alpha) : rust(alpha);
    streak(pen, ...spot(random), 2 + random() * width, length * random(), colour);
  }
}

export const hullUv = (x: number, y: number): Uv => [
  (x - STERN) / SHIP.length,
  1 - share(y, HULL_MAP.span),
];
export const deckUv = (x: number, z: number): Uv => [
  (x - STERN) / SHIP.length,
  share(z, [-DECK_MAP.half, DECK_MAP.half]),
];

export function wallUv(region: Region, a: number, b: number): Uv {
  const [u0, v0, u1, v1] = WALL_MAP.regions[region];
  const across = share(a, region === 'front' || region === 'aft' ? WALL_MAP.z : WALL_MAP.x);
  const along = region === 'roof' ? share(b, WALL_MAP.z) : 1 - share(b, WALL_MAP.y);
  return [u0 + (u1 - u0) * across, v0 + (v1 - v0) * along];
}

const paintHull: Paint = (pen, width, height) => {
  const scaleX = width / SHIP.length;
  const scaleY = height / (HULL_MAP.span[1] - HULL_MAP.span[0]);
  const px = (x: number) => (x - STERN) * scaleX;
  const py = (y: number) => (1 - share(y, HULL_MAP.span)) * height;
  const [low, high] = HULL_MAP.boot;
  pen.fillStyle = tint(TINTS.antifouling);
  pen.fillRect(0, py(low), width, height);
  pen.fillStyle = tint(TINTS.bootTop);
  pen.fillRect(0, py(high), width, py(low) - py(high));
  streak(
    pen,
    width / 2,
    py(high),
    width,
    py(high + HULL_MAP.grime) - py(high),
    shade(HULL_MAP.seam * 2),
  );
  mottle(pen, width, height, HULL_MAP.mottle);
  pen.fillStyle = shade(HULL_MAP.seam);
  HULL_MAP.strakes.forEach((y, band) => {
    const above = py(HULL_MAP.strakes[band + 1] ?? HULL_MAP.span[1]);
    pen.fillRect(0, py(y), width, 2);
    for (let x = STERN + (band % 2) * (HULL_MAP.butt / 2); x < -STERN; x += HULL_MAP.butt) {
      pen.fillRect(px(x), above, 2, py(y) - above);
    }
  });
  weather(pen, HULL_MAP.streaks, (random) => {
    const x = STERN + random() * SHIP.length;
    return [px(x), py(deckEdgeY(x) - random() * 2)];
  });
  [deckEdgeY, topY].forEach((line, index) => {
    pen.strokeStyle = shade(HULL_MAP.seam * 3);
    pen.lineWidth = HULL_MAP.lines[index];
    pen.beginPath();
    for (let x = STERN; x <= -STERN; x += 1 / 2) pen.lineTo(px(x), py(line(x)));
    pen.stroke();
  });
  const { y, radius, rim, pitch, runs } = HULL_MAP.ports;
  runs.forEach(([from, to]) => {
    for (let x = from; x <= to; x += pitch) {
      oval(pen, px(x), py(y), (radius + rim) * scaleX, (radius + rim) * scaleY, tint(TINTS.rim));
      oval(pen, px(x), py(y), radius * scaleX, radius * scaleY, tint(TINTS.hole));
      streak(pen, px(x), py(y - radius), rim * scaleX, scaleY, rust(HULL_MAP.rust / 3));
    }
  });
  const [rx, ry] = HAWSE.radius;
  streak(pen, px(HAWSE.x), py(HAWSE.y), rx * scaleX, HAWSE.streak * scaleY, rust(HULL_MAP.rust));
  oval(pen, px(HAWSE.x), py(HAWSE.y), rx * scaleX, ry * scaleY, tint(TINTS.hole));
};

const paintDeck: Paint = (pen, width, height) => {
  const [pitch, alpha] = DECK_MAP.seams;
  mottle(pen, width, height, DECK_MAP.mottle);
  pen.fillStyle = shade(alpha);
  for (let x = pitch; x < SHIP.length; x += pitch)
    pen.fillRect((x / SHIP.length) * width, 0, 2, height);
  DECK_MAP.along.forEach((z) =>
    pen.fillRect(0, share(z, [-DECK_MAP.half, DECK_MAP.half]) * height, width, 2),
  );
};

const paintWalls: Paint = (pen, width, height) => {
  const area = (region: Region, a: Extent, b: Extent) => {
    const [x0, y0] = wallUv(region, a[0], b[1]);
    const [x1, y1] = wallUv(region, a[1], b[0]);
    return [x0 * width, y0 * height, (x1 - x0) * width, (y1 - y0) * height] as const;
  };
  const opening = (box: readonly number[], colour: string) => {
    pen.fillStyle = colour;
    pen.beginPath();
    pen.roundRect(box[0], box[1], box[2], box[3], Math.min(box[2], box[3]) / 4);
    pen.fill();
    pen.stroke();
  };
  pen.fillStyle = tint(TINTS.roof);
  pen.fillRect(width / 2, height / 2, width / 2, height / 2);
  mottle(pen, width, height, WALL_MAP.mottle);
  pen.fillStyle = shade(WALL_MAP.streaks[1]);
  for (let x = 0; x < width; x += WALL_MAP.panel) pen.fillRect(x, 0, 1, height / 2);
  weather(pen, WALL_MAP.streaks, (random) => [random() * width, (random() * height) / 2]);
  pen.fillStyle = tint(PAINT.soot);
  SOOT.forEach(([region, along]) =>
    pen.fillRect(...area(region, along, [SOOT_FROM, WALL_MAP.y[1]])),
  );
  LOUVRES.forEach(([region, a, b]) => {
    const [x, y, w, h] = area(region, a, b);
    pen.fillStyle = tint(TINTS.louvre);
    pen.fillRect(x, y, w, h);
    pen.fillStyle = shade(OUTLINE);
    for (let slat = 0; slat < SLATS; slat += 1)
      pen.fillRect(x, y + (slat * h) / SLATS, w, h / SLATS / 2);
  });
  pen.strokeStyle = shade(OUTLINE);
  pen.lineWidth = 2;
  DOORS.forEach(([region, a, floor]) => {
    const bottom = DOOR.floors[floor];
    opening(
      area(region, [a - DOOR.width / 2, a + DOOR.width / 2], [bottom, bottom + DOOR.height]),
      tint(TINTS.door),
    );
  });
  WINDOWS.forEach(([region, size, y, at]) =>
    at.forEach((a) => opening(area(region, [a - size / 2, a + size / 2], y), tint(TINTS.window))),
  );
};

function painted(size: readonly number[], paint: Paint, wrap = false): Texture {
  const [width, height = width] = size;
  const texture = canvasTexture(width, height, (pen) => {
    pen.fillStyle = '#ffffff';
    pen.fillRect(0, 0, width, height);
    paint(pen, width, height);
  });
  if (wrap) texture.wrapS = RepeatWrapping;
  return texture;
}

export const hullMap = () => painted(HULL_MAP.size, paintHull);
export const deckMap = () => painted(DECK_MAP.size, paintDeck);
export const wallMap = () => painted(WALL_MAP.size, paintWalls);

export const glassMap = () =>
  painted(
    GLASS.size,
    (pen, width, height) => {
      const gradient = pen.createLinearGradient(0, 0, 0, height);
      GLASS.colours.forEach((colour, at) => gradient.addColorStop(at, colour));
      pen.fillStyle = gradient;
      pen.fillRect(0, 0, width, height);
      pen.strokeStyle = PAINT.dark;
      pen.lineWidth = GLASS.frame;
      pen.strokeRect(0, 0, width, height);
    },
    true,
  );

export const railMap = () =>
  painted(
    [RAIL_MAP.size],
    (pen, size) => {
      pen.clearRect(0, 0, size, size);
      pen.fillStyle = '#ffffff';
      RAIL_MAP.bars.forEach((level) =>
        pen.fillRect(0, level * size, size, (RAIL_MAP.bar / RAIL.height) * size),
      );
      pen.fillRect(0, 0, (RAIL_MAP.post / RAIL.tile) * size, size);
    },
    true,
  );

export function grainMap(repeat: readonly [number, number]): Texture {
  const texture = noiseTexture(...GRAIN);
  texture.repeat.set(...repeat);
  return texture;
}
