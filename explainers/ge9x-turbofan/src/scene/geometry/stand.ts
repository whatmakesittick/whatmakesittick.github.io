import { BoxGeometry, Color, CylinderGeometry, Float32BufferAttribute } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { AXIS_HEIGHT_M } from '../../model/scale';
import { nacelleOuterAt } from './profiles';
import { closedLoop, revolve } from './revolve';

const TONES = {
  frame: '#46556a',
  pad: '#1c1e21',
  fork: '#d6a422',
  wheel: '#26282b',
} as const;

type Tone = keyof typeof TONES;

const RAIL = { from: -2.75, to: 1.5, z: 0.78, size: 0.1, y: 0.115 } as const;
const BEAMS = [-2.68, -1.9, 0.9, 1.43] as const;
const SADDLES = [-1.9, 0.9] as const;
const SADDLE = {
  width: 0.24,
  pad: 0.022,
  frame: 0.07,
  arc: 0.52,
  gap: 0.004,
  segments: 24,
} as const;
const POST = { z: 0.7, size: 0.09 } as const;
const WHEEL = { radius: 0.06, width: 0.05, z: 0.87, y: 0.06, ends: [-2.6, 1.38] } as const;
const FORK = { width: 0.07, height: 0.09 } as const;

interface Piece {
  geometry: BufferGeometry;
  tone: Tone;
}

function tinted({ geometry, tone }: Piece): BufferGeometry {
  const colour = new Color(TONES[tone]);
  const flat = geometry.index ? geometry.toNonIndexed() : geometry;
  if (flat !== geometry) geometry.dispose();
  const values = new Float32Array(flat.getAttribute('position').count * 3);
  for (let index = 0; index < values.length; index += 3)
    values.set([colour.r, colour.g, colour.b], index);
  flat.setAttribute('color', new Float32BufferAttribute(values, 3));
  if (!flat.getAttribute('uv'))
    flat.setAttribute(
      'uv',
      new Float32BufferAttribute(new Float32Array((values.length / 3) * 2), 2),
    );
  return flat;
}

function box(
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  x: number,
  y: number,
  z: number,
): BufferGeometry {
  const geometry = new BoxGeometry(sizeX, sizeY, sizeZ);
  geometry.translate(x, y, z);
  return geometry;
}

function cradle(x: number, inner: number, outer: number): BufferGeometry {
  const half = SADDLE.width / 2;
  const geometry = revolve(
    closedLoop([
      [x - half, outer],
      [x + half, outer],
      [x + half, inner],
      [x - half, inner],
    ]),
    SADDLE.segments * 6,
    { start: Math.PI - SADDLE.arc, length: SADDLE.arc * 2 },
  );
  geometry.translate(0, AXIS_HEIGHT_M, 0);
  return geometry;
}

function postHeight(x: number): number {
  const outer = nacelleOuterAt(x) + SADDLE.gap + SADDLE.pad + SADDLE.frame;
  return AXIS_HEIGHT_M - Math.sqrt(outer * outer - POST.z * POST.z);
}

function saddle(x: number): Piece[] {
  const skin = nacelleOuterAt(x) + SADDLE.gap;
  const railTop = RAIL.y + RAIL.size / 2;
  const top = postHeight(x);
  return [
    { geometry: cradle(x, skin, skin + SADDLE.pad), tone: 'pad' },
    { geometry: cradle(x, skin + SADDLE.pad, skin + SADDLE.pad + SADDLE.frame), tone: 'frame' },
    ...[-1, 1].map((side): Piece => ({
      geometry: box(
        POST.size,
        top - railTop + 0.04,
        POST.size,
        x,
        (top + railTop) / 2,
        side * POST.z,
      ),
      tone: 'frame',
    })),
  ];
}

function wheels(): Piece[] {
  return WHEEL.ends.flatMap((x) =>
    [-1, 1].flatMap((side): Piece[] => {
      const tyre = new CylinderGeometry(WHEEL.radius, WHEEL.radius, WHEEL.width, 16);
      tyre.rotateX(Math.PI / 2);
      tyre.translate(x, WHEEL.y, side * WHEEL.z);
      return [
        { geometry: tyre, tone: 'wheel' },
        {
          geometry: box(FORK.width, FORK.height, 0.03, x, WHEEL.y + 0.035, side * (WHEEL.z - 0.04)),
          tone: 'fork',
        },
      ];
    }),
  );
}

export function standGeometry(): BufferGeometry {
  const railLength = RAIL.to - RAIL.from;
  const railX = (RAIL.to + RAIL.from) / 2;
  const pieces: Piece[] = [
    ...[-1, 1].map((side): Piece => ({
      geometry: box(railLength, RAIL.size, RAIL.size, railX, RAIL.y, side * RAIL.z),
      tone: 'frame',
    })),
    ...BEAMS.map((x): Piece => ({
      geometry: box(0.08, 0.08, RAIL.z * 2, x, RAIL.y, 0),
      tone: 'frame',
    })),
    ...SADDLES.flatMap(saddle),
    ...wheels(),
  ];
  const parts = pieces.map(tinted);
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('Cannot merge the stand');
  return merged;
}
