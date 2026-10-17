import { CircleGeometry, Matrix4, SphereGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import type { Vec3 } from './mesh';
import { spot } from './surface';
import type { BodySurface } from './surface';

export type MirrorFinish = 'paint' | 'mirror' | 'frame';

const MIRROR = {
  x: 0.84,
  head: { y: 0.79, z: 1.0, depth: 0.09, height: 0.056, width: 0.12 },
  glass: { inset: 0.88, offset: 0.002 },
  stalk: { height: 0.028, length: 0.07 },
  segments: { around: 20, down: 12, glass: 24 },
} as const;
const STALK_REACH = 0.8;
const SIDES = [1, -1] as const;

function placed(geometry: BufferGeometry, mirror: number, at: Vec3): BufferGeometry {
  geometry.applyMatrix4(new Matrix4().makeScale(1, 1, mirror));
  geometry.translate(at[0], at[1], at[2] * mirror);
  if (mirror < 0) flipWinding(geometry);
  return geometry;
}

function flipWinding(geometry: BufferGeometry): void {
  const index = geometry.getIndex();
  if (!index) return;
  for (let face = 0; face < index.count; face += 3) {
    const first = index.getX(face);
    index.setX(face, index.getX(face + 2));
    index.setX(face + 2, first);
  }
}

function mirrorHead(): BufferGeometry {
  const { head, segments } = MIRROR;
  const geometry = new SphereGeometry(1, segments.around, segments.down, Math.PI / 2, Math.PI);
  geometry.scale(head.depth, head.height, head.width);
  return geometry;
}

function mirrorGlass(): BufferGeometry {
  const { head, glass, segments } = MIRROR;
  const geometry = new CircleGeometry(1, segments.glass);
  geometry.rotateY(-Math.PI / 2);
  geometry.scale(1, head.height * glass.inset, head.width * glass.inset);
  geometry.translate(-glass.offset, 0, 0);
  return geometry;
}

function mirrorStalk(surface: BodySurface): BufferGeometry {
  const { x, head, stalk } = MIRROR;
  const base = surface.point(x, spot('belt', 0.5));
  const innerZ = head.z - head.width * STALK_REACH;
  const [run, lift] = [innerZ - base[2], head.y - base[1]];
  const geometry = box({
    minX: -stalk.length / 2,
    maxX: stalk.length / 2,
    minY: -stalk.height / 2,
    maxY: stalk.height / 2,
    minZ: 0,
    maxZ: Math.hypot(run, lift),
  });
  const rise = Math.atan2(lift, run);
  geometry.rotateX(-rise);
  geometry.translate(0, base[1] - head.y, base[2] - head.z);
  return geometry;
}

export function mirrorParts(surface: BodySurface): Map<MirrorFinish, BufferGeometry[]> {
  const centre: Vec3 = [MIRROR.x, MIRROR.head.y, MIRROR.head.z];
  const each = (build: () => BufferGeometry) =>
    SIDES.map((mirror) => placed(build(), mirror, centre));
  return new Map<MirrorFinish, BufferGeometry[]>([
    ['paint', each(mirrorHead)],
    ['mirror', each(mirrorGlass)],
    ['frame', each(() => mirrorStalk(surface))],
  ]);
}
