import { CylinderGeometry, Group, Matrix4, Mesh, RepeatWrapping } from 'three';
import { extrudePlan, roundedRectShape } from '@core/scene/geometry/extrude';
import type { BufferGeometry, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { SHIP } from '../../../model/layout';
import { THEME } from '../../../theme';
import { monotoneCubic, spread } from '../../geometry/curves';
import { tubeAlong } from '../../geometry/fitted';
import { flatPolygon } from '../../geometry/flat';
import type { Pair } from '../../geometry/hullLines';
import { boxAt, rod } from '../../geometry/solids';
import { gridSurface, mirrorZ, orientFrom } from '../../geometry/surface';
import type { Vec3 } from '../../geometry/surface';
import { instanced, mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { canvasTexture } from '../surfaces';
import { wetSurface } from '../water/wetSurface';

export interface ShipPart {
  object: Group;
  radar: Object3D;
  deckAnchor: Object3D;
  radarAnchor: Object3D;
}

type Lines = readonly (readonly [number, number])[];
type Block = readonly [
  x0: number,
  x1: number,
  y0: number,
  y1: number,
  halfWidth: number,
  corner: number,
  lean: number,
];

const STERN = -SHIP.length / 2;
const BOW = SHIP.length / 2;
const HOUSE_TOP = 9;

const KEEL: Lines = [
  [STERN, -1.2],
  [-30, -SHIP.draft],
  [32, -SHIP.draft],
  [46, 0],
  [BOW, 9.6],
];
const WATERLINE: Lines = [
  [STERN, 5.6],
  [-24, SHIP.beam / 2],
  [6, SHIP.beam / 2],
  [40, 2],
  [46, 0],
  [BOW, 0],
];
const DECK_EDGE: Lines = [
  [STERN, 6.4],
  [-24, 7.3],
  [16, 7.3],
  [44, 4.2],
  [BOW, 0],
];
const SHEER: Lines = [
  [STERN, 6.8],
  [-28, SHIP.deck],
  [8, SHIP.deck],
  [36, 7.2],
  [BOW, 9.6],
];

const HULL = { columns: 64, rows: 12, rowBias: 1.6, bilge: 4, tile: 22, span: 14, base: -5 };
const WALL_TILE = 8;
const BLOCKS: readonly Block[] = [
  [-20, 26, SHIP.deck, HOUSE_TOP, 6.2, 2.5, 0.25],
  [4, 24, HOUSE_TOP, 12, 5.4, 2, 0.3],
  [12, 23, 12, SHIP.bridgeTop, 6.6, 1.6, 0],
];
const BRIDGE_WINDOWS: Block = [11.9, 23.1, 13.1, 14.5, 6.65, 1.7, 0];
const FUNNEL = {
  x: -10,
  base: HOUSE_TOP,
  height: 8,
  radii: [1, 1.25],
  scale: [4, 2.2],
  rake: 0.12,
};
const FUNNEL_CAP = 0.6;
const STRAKE = { drop: 0.6, radius: 0.16, samples: 28, ends: [2, 4] } as const;
const MAST = { radius: 0.24, yard: [0.18, 24, 7] as const, lead: 1.4 };
const RADAR: Vec3 = [0.5, 0.22, 4.2];
const PEDESTAL = [0.18, 0.8] as const;
const CHAIN: readonly Vec3[] = [
  [46, 5.6, 4.4],
  [49, 1.4, 4.9],
  [51.5, -3, 5.2],
];
const LAMPS: readonly Vec3[] = [
  [26.05, 8.2, 0],
  [23.15, 14, 4],
  [23.15, 14, -4],
  [SHIP.mastX, SHIP.mastTop, 0],
];
const LAMP_SIZE = 0.22;
const PORTS = { count: 6, y: 4, radius: 2, boot: 0.6, map: [256, 128] as const } as const;
const WINDOWS = { xs: [0.2, 0.45, 0.8] as const, y: 0.42, size: [0.08, 0.12] as const, map: 64 };
const CHAIN_RADIUS = 0.13;
const CHAIN_SIDES = 6;
const REFLECTION = 0.8;
const FACING = 0.5;
const FUNNEL_SIDES = 20;

const PAINT = {
  hull: THEME.ship,
  deck: '#5d6268',
  dark: '#23272b',
  boot: '#2a2e33',
  port: '#1b1f24',
  white: '#ffffff',
};

function matte(color: string, roughness: number, metalness = 0.1): MaterialFinish {
  return { color, roughness, metalness, envMapIntensity: REFLECTION };
}

const DARK = matte(PAINT.dark, 0.5, 0.3);
const DECKING = matte(PAINT.deck, 0.9);
const LAMP: MaterialFinish = { color: '#fff1d6', emissive: '#ffcf8a', emissiveIntensity: 0.6 };

function curve(lines: Lines): (x: number) => number {
  return monotoneCubic(
    lines.map(([x]) => x),
    lines.map(([, value]) => value),
  );
}

const keelAt = curve(KEEL);
const waterlineAt = curve(WATERLINE);
const deckAt = curve(DECK_EDGE);
const sheerAt = curve(SHEER);

export function shipHalfBreadth(x: number, y: number): number {
  if (y >= 0) return waterlineAt(x) + (deckAt(x) - waterlineAt(x)) * (y / sheerAt(x));
  const depth = keelAt(x);
  if (depth >= 0) return 0;
  return waterlineAt(x) * Math.max(0, 1 - (y / depth) ** HULL.bilge) ** (1 / HULL.bilge);
}

const hullUv = (x: number, y: number): [number, number] => [
  x / HULL.tile,
  (y - HULL.base) / HULL.span,
];

function hull(): BufferGeometry {
  const xs = spread(STERN, BOW, HULL.columns);
  const rows = spread(0, 1, HULL.rows).map((share, row) =>
    xs.map((x): Vec3 => {
      const y = keelAt(x) + (sheerAt(x) - keelAt(x)) * share ** HULL.rowBias;
      return [x, y, row === 0 ? 0 : shipHalfBreadth(x, y)];
    }),
  );
  const side = orientFrom(
    gridSurface(rows, { uv: (row, column) => hullUv(rows[row][column][0], rows[row][column][1]) }),
    [0, 0, -1],
  );
  const ys = spread(keelAt(STERN), sheerAt(STERN), HULL.rows);
  const outline = [...ys, ...[...ys].reverse()].map((y, index): Pair => [
    (index < ys.length ? 1 : -1) * shipHalfBreadth(STERN, y),
    y,
  ]);
  const transom = orientFrom(
    flatPolygon(outline, (z, y) => [STERN, y, z], [], hullUv),
    [0, 0, 0],
  );
  return mergeParts([side, mirrorZ(side.clone()), transom]);
}

function deck(): BufferGeometry {
  const xs = spread(STERN, BOW, HULL.columns);
  const edge = (side: number) => xs.map((x): Vec3 => [x, sheerAt(x), side * deckAt(x)]);
  return orientFrom(gridSurface([edge(-1), edge(1)]), [0, 0, 0]);
}

function block([x0, x1, y0, y1, half, corner, lean]: Block): BufferGeometry {
  const solid = extrudePlan(
    roundedRectShape({ minA: x0, maxA: x1, minB: -half, maxB: half }, corner),
    y0,
    y1,
  );
  const centre = (x0 + x1) / 2;
  const position = solid.getAttribute('position');
  for (let at = 0; at < position.count; at += 1) {
    const inset = (lean * (position.getY(at) - y0)) / (y1 - y0);
    const x = position.getX(at);
    const z = position.getZ(at);
    position.setX(at, x - Math.sign(x - centre) * inset);
    position.setZ(at, z - Math.sign(z) * inset);
  }
  solid.computeVertexNormals();
  const normal = solid.getAttribute('normal');
  const uv = solid.getAttribute('uv');
  for (let at = 0; at < uv.count; at += 1) {
    const across = Math.abs(normal.getX(at)) > FACING ? position.getZ(at) : position.getX(at);
    uv.setXY(at, across / WALL_TILE, (position.getY(at) - SHIP.deck) / WALL_TILE);
  }
  return solid;
}

function funnelPiece(radius: number, height: number, base: number): BufferGeometry {
  const [width, depth] = FUNNEL.scale;
  return new CylinderGeometry(radius, radius * FUNNEL.radii[1], height, FUNNEL_SIDES)
    .scale(width, 1, depth)
    .translate(0, base + height / 2, 0)
    .rotateZ(FUNNEL.rake)
    .translate(FUNNEL.x, 0, 0);
}

function strake(side: number): BufferGeometry {
  const [aft, fore] = STRAKE.ends;
  return tubeAlong(
    spread(STERN + aft, BOW - fore, STRAKE.samples).map((x): Vec3 => {
      const y = sheerAt(x) - STRAKE.drop;
      return [x, y, side * shipHalfBreadth(x, y)];
    }),
    STRAKE.radius,
    CHAIN_SIDES,
  );
}

function hullTexture() {
  const texture = canvasTexture(...PORTS.map, (pen, width, height) => {
    const v = (y: number) => (height * (y - HULL.base)) / HULL.span;
    pen.fillStyle = PAINT.hull;
    pen.fillRect(0, 0, width, height);
    pen.fillStyle = PAINT.boot;
    pen.fillRect(0, 0, width, v(PORTS.boot));
    pen.fillStyle = PAINT.port;
    for (let port = 0; port < PORTS.count; port += 1) {
      pen.beginPath();
      pen.arc(((port + 0.5) / PORTS.count) * width, v(PORTS.y), PORTS.radius, 0, Math.PI * 2);
      pen.fill();
    }
  });
  texture.wrapS = RepeatWrapping;
  return texture;
}

function wallTexture() {
  const [width, height] = WINDOWS.size;
  return canvasTexture(
    WINDOWS.map,
    WINDOWS.map,
    (pen, size) => {
      pen.fillStyle = PAINT.white;
      pen.fillRect(0, 0, size, size);
      pen.fillStyle = PAINT.port;
      WINDOWS.xs.forEach((x) =>
        pen.fillRect(x * size, WINDOWS.y * size, width * size, height * size),
      );
    },
    true,
  );
}

function placed(spots: readonly Vec3[]): Matrix4[] {
  return spots.map((spot) => new Matrix4().makeTranslation(...spot));
}

export function createShip(context: PartContext): ShipPart {
  const track = context.tracker.track.bind(context.tracker);
  const walls = { ...matte(PAINT.hull, 0.7), map: track(wallTexture()) };
  const hullFinish = { ...matte(PAINT.white, 0.75), map: track(hullTexture()) };
  const height = SHIP.mastTop - SHIP.bridgeTop;
  const [thickness, yardY, span] = MAST.yard;
  const mast = mergeParts([
    rod('y', MAST.radius, height, [SHIP.mastX, SHIP.bridgeTop + height / 2, 0]),
    boxAt([thickness, thickness, span], [SHIP.mastX, yardY, 0]),
    boxAt(
      [MAST.lead, thickness, thickness],
      [SHIP.mastX + MAST.lead / 2, SHIP.radarHeight - PEDESTAL[1], 0],
    ),
  ]);
  const radar = new Group();
  radar.position.set(SHIP.mastX + MAST.lead, SHIP.radarHeight, 0);
  radar.add(
    partMesh(
      context,
      mergeParts([
        rod('y', PEDESTAL[0], PEDESTAL[1], [0, -PEDESTAL[1] / 2, 0]),
        boxAt(RADAR, [0, RADAR[1] / 2, 0]),
      ]),
      'shipRadar',
      DARK,
    ),
  );
  const object = new Group();
  object.add(
    new Mesh(track(hull()), wetSurface(context.materials.get('ship', hullFinish))),
    partMesh(context, deck(), 'ship', DECKING),
    partMesh(context, mergeParts(BLOCKS.map(block)), 'ship', walls),
    partMesh(context, funnelPiece(1, FUNNEL.height, FUNNEL.base), 'ship', matte(PAINT.hull, 0.7)),
    partMesh(
      context,
      mergeParts([
        block(BRIDGE_WINDOWS),
        funnelPiece(FUNNEL.radii[0], FUNNEL_CAP, FUNNEL.base + FUNNEL.height),
        tubeAlong(CHAIN, CHAIN_RADIUS, CHAIN_SIDES),
        strake(-1),
        strake(1),
      ]),
      'ship',
      DARK,
    ),
    partMesh(context, mast, 'shipRadar', walls),
    instanced(
      context,
      boxAt([LAMP_SIZE, LAMP_SIZE, LAMP_SIZE], [0, 0, 0]),
      'ship',
      LAMP,
      placed(LAMPS),
    ),
    radar,
  );
  return {
    object,
    radar,
    deckAnchor: anchorAt(object, 0, SHIP.deck, 0),
    radarAnchor: anchorAt(radar, 0, RADAR[1], 0),
  };
}
