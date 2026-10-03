import { BoxGeometry, Matrix4 } from 'three';
import type { BufferGeometry, Mesh, Texture } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { SLIPWAY } from '../../../model/layout';
import { THEME } from '../../../theme';
import { APRON, SLAB_THICKNESS } from '../../geometry/shoreTerrain';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import { canvasTexture, mottle } from '../surfaces';

type Span = readonly [number, number];

const KERB_WIDTH = 0.25;
const KERB_HEIGHT = 0.18;
const KERB_END = 0;
const MAP_SIZE = [2048, 512] as const;
const SIDE_Z = 2.4;
const MOTTLE = { cells: [240, 60] as const, strength: 0.08, seed: 41 };
const GROOVE_PITCH = 0.15;
const GROOVE_WIDTH = 0.025;
const GROOVE_COLOUR = 'rgba(40, 40, 36, 0.38)';
const WATER_MARKS = [
  [0.3, 0.35, '#7c7b75'],
  [0.08, 0.45, '#76825c'],
] as const;
const FINISH = { color: '#ffffff', roughness: 0.85, envMapIntensity: 0.5 } as const;

const SPAN: Span = [APRON.x[0], SLIPWAY.x[1]];
const SLOPE = (SLIPWAY.foot - SLIPWAY.top) / (SLIPWAY.x[1] - SLIPWAY.x[0]);
const UPRIGHT = 0.5;
const WHITE = '#ffffff';

function u(x: number): number {
  return (x - SPAN[0]) / (SPAN[1] - SPAN[0]);
}

function v(z: number): number {
  return (z - APRON.z[0]) / (APRON.z[1] - APRON.z[0]);
}

function block(x: Span, y: number, height: number, z: number, width: number): BufferGeometry {
  return new BoxGeometry(x[1] - x[0], height, width).translate(
    (x[0] + x[1]) / 2,
    y + height / 2,
    z,
  );
}

function sloped(geometry: BufferGeometry): BufferGeometry {
  geometry.applyMatrix4(new Matrix4().makeShear(SLOPE, 0, 0, 0, 0, 0));
  return geometry.translate(0, SLIPWAY.top - SLOPE * SLIPWAY.x[0], 0);
}

function mapped(geometry: BufferGeometry): BufferGeometry {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  for (let index = 0; index < position.count; index += 1) {
    const z =
      Math.abs(normal.getY(index)) > UPRIGHT ? position.getZ(index) : SIDE_Z + position.getY(index);
    uv.setXY(index, u(position.getX(index)), v(z));
  }
  return geometry;
}

export function slipwayGeometry(): BufferGeometry {
  const kerbZ = SLIPWAY.z[1] - KERB_WIDTH / 2;
  const kerbs = [-kerbZ, kerbZ].map((z) =>
    sloped(block([SLIPWAY.x[0], KERB_END], 0, KERB_HEIGHT, z, KERB_WIDTH)),
  );
  const slab = block(SLIPWAY.x, -SLAB_THICKNESS, SLAB_THICKNESS, 0, SLIPWAY.z[1] - SLIPWAY.z[0]);
  const apron = block(
    APRON.x,
    SLIPWAY.top - SLAB_THICKNESS,
    SLAB_THICKNESS,
    0,
    APRON.z[1] - APRON.z[0],
  );
  return mergeParts([sloped(slab), ...kerbs, apron].map(mapped));
}

function xAt(level: number): number {
  return SLIPWAY.x[0] + (level - SLIPWAY.top) / SLOPE;
}

function slipwayTexture(): Texture {
  return canvasTexture(MAP_SIZE[0], MAP_SIZE[1], (pen, width, height) => {
    pen.fillStyle = THEME.concrete;
    pen.fillRect(0, 0, width, height);
    mottle(pen, width, height, MOTTLE);
    const inner = SLIPWAY.z[1] - KERB_WIDTH;
    const top = v(-inner) * height;
    const groove = (GROOVE_WIDTH * width) / (SPAN[1] - SPAN[0]);
    pen.fillStyle = GROOVE_COLOUR;
    for (let x = SLIPWAY.x[0] + GROOVE_PITCH; x < SLIPWAY.x[1]; x += GROOVE_PITCH) {
      pen.fillRect(u(x) * width, top, groove, v(inner) * height - top);
    }
    pen.globalCompositeOperation = 'multiply';
    WATER_MARKS.forEach(([level, fade, tone]) => {
      const gradient = pen.createLinearGradient(
        u(xAt(level + fade)) * width,
        0,
        u(xAt(level - fade)) * width,
        0,
      );
      gradient.addColorStop(0, WHITE);
      gradient.addColorStop(1, tone);
      pen.fillStyle = gradient;
      pen.fillRect(0, 0, width, height);
    });
  });
}

export function createSlipway(context: PartContext): Mesh {
  const map = context.tracker.track(slipwayTexture());
  return partMesh(context, slipwayGeometry(), STRUCTURE_GROUP, { ...FINISH, map });
}
