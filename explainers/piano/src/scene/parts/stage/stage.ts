import {
  CircleGeometry,
  Color,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  SRGBColorSpace,
} from 'three';
import type { BufferGeometry, Texture } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { LEG_SPOTS, LYRE, STAGE_RADIUS } from '../../../model';
import { THEME } from '../../../theme';
import { canvasTexture } from '../canvasTexture';
import type { PartContext, Section } from '../context';
import { namedGroup, registeredMaterial } from '../context';

const FLOOR_SEGMENTS = 96;
const FLOOR_TEXTURE_SIZE = 1024;
const CENTRE_Z = -1.15;
const POOL = { x: -0.15, z: -1.25, radius: 2.5, strength: 0.32 } as const;
const POOL_FALLOFF: readonly (readonly [offset: number, share: number])[] = [
  [0, 1],
  [0.3, 0.8],
  [0.55, 0.25],
  [1, 0],
];
const EDGE_FADE = { start: 0.3, end: 0.82 } as const;
const DITHER = 3;
const RGBA = 4;
const BYTE = 255;
const QUARTER_TURN = Math.PI / 2;
const SHADOW_LIFT = 0.002;
const CASE_SHADOW = { x: 0, z: -1.3, width: 2.1, depth: 3.35, opacity: 0.85 } as const;
const FOOT_SHADOW = { size: 0.34, opacity: 0.9 } as const;

function rgba(color: string, alpha: number): string {
  const { r, g, b } = new Color(color).getRGB({ r: 0, g: 0, b: 0 }, SRGBColorSpace);
  const channel = (value: number) => Math.round(value * BYTE);
  return `rgba(${channel(r)},${channel(g)},${channel(b)},${alpha})`;
}

function dither(context: CanvasRenderingContext2D, size: number): void {
  const image = context.getImageData(0, 0, size, size);
  for (let index = 0; index < image.data.length; index += RGBA) {
    const noise = (Math.random() - 0.5) * DITHER;
    for (let channel = 0; channel < RGBA - 1; channel++) image.data[index + channel] += noise;
  }
  context.putImageData(image, 0, 0);
}

function paintFloor(context: CanvasRenderingContext2D, size: number): void {
  const half = size / 2;
  const toPixels = half / STAGE_RADIUS;
  context.fillStyle = THEME.stage;
  context.fillRect(0, 0, size, size);
  const poolX = half + POOL.x * toPixels;
  const poolY = half + (POOL.z - CENTRE_Z) * toPixels;
  const pool = context.createRadialGradient(poolX, poolY, 0, poolX, poolY, POOL.radius * toPixels);
  POOL_FALLOFF.forEach(([offset, share]) =>
    pool.addColorStop(offset, rgba(THEME.spot, POOL.strength * share)),
  );
  context.fillStyle = pool;
  context.fillRect(0, 0, size, size);
  const edge = context.createRadialGradient(half, half, 0, half, half, half);
  edge.addColorStop(EDGE_FADE.start, rgba(THEME.background, 0));
  edge.addColorStop(EDGE_FADE.end, rgba(THEME.background, 1));
  context.fillStyle = edge;
  context.fillRect(0, 0, size, size);
  dither(context, size);
}

function flat(geometry: BufferGeometry, x: number, z: number): BufferGeometry {
  return geometry.rotateX(-QUARTER_TURN).translate(x, SHADOW_LIFT, z);
}

function backdropMaterial(context: PartContext, material: MeshBasicMaterial): MeshBasicMaterial {
  return registeredMaterial(context, UNDIMMED_GROUP, material, false);
}

function shadowMaterial(context: PartContext, texture: Texture, opacity: number) {
  return backdropMaterial(
    context,
    new MeshBasicMaterial({ map: texture, transparent: true, opacity, depthWrite: false }),
  );
}

function floor(context: PartContext): Mesh {
  const texture = context.tracker.track(
    canvasTexture(FLOOR_TEXTURE_SIZE, FLOOR_TEXTURE_SIZE, (paint, size) => paintFloor(paint, size)),
  );
  const material = backdropMaterial(
    context,
    new MeshBasicMaterial({ map: texture, toneMapped: false }),
  );
  const geometry = context.tracker.track(
    flat(new CircleGeometry(STAGE_RADIUS, FLOOR_SEGMENTS), 0, CENTRE_Z).translate(
      0,
      -SHADOW_LIFT,
      0,
    ),
  );
  return new Mesh(geometry, material);
}

function caseShadow(context: PartContext): Mesh {
  const geometry = flat(
    new PlaneGeometry(CASE_SHADOW.width, CASE_SHADOW.depth),
    CASE_SHADOW.x,
    CASE_SHADOW.z,
  );
  const material = shadowMaterial(context, context.textures.shadow, CASE_SHADOW.opacity);
  return new Mesh(context.tracker.track(geometry), material);
}

function footShadows(context: PartContext): Mesh {
  const spots = [...LEG_SPOTS, [0, LYRE.z] as const];
  const geometry = mergeGeometries(
    spots.map(([x, z]) => flat(new PlaneGeometry(FOOT_SHADOW.size, FOOT_SHADOW.size), x, z)),
  );
  const material = shadowMaterial(context, context.textures.shadow, FOOT_SHADOW.opacity);
  const mesh = new Mesh(context.tracker.track(geometry), material);
  mesh.position.y = SHADOW_LIFT;
  mesh.renderOrder = 1;
  return mesh;
}

export function createStage(context: PartContext): Section {
  const root = namedGroup('stage');
  root.add(floor(context), caseShadow(context), footShadows(context));
  return { root, setState: () => undefined };
}
