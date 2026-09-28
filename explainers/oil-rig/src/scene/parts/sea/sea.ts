import {
  BufferAttribute,
  Color,
  Group,
  MeshBasicMaterial,
  PlaneGeometry,
  RingGeometry,
} from 'three';
import type { BufferGeometry, Material, Mesh } from 'three';
import { smoothstep } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { SEABED_Y } from '../../../model/scale';
import { BLOCK, HULL, RENDER_ORDER, SEA } from '../../constants';
import { FINISHES } from '../../finishes';
import { merge } from '../../geometry/merge';
import { finishMesh, registeredMesh } from '../context';
import type { PartContext } from '../context';
import { CORNERS } from '../rig/hull';

const RGB = 3;
const RGBA = 4;
const XYZ = 3;
const QUARTER_TURN = Math.PI / 2;
const WHITE = new Color('#ffffff');

interface Wave {
  amplitude: number;
  number: number;
  cos: number;
  sin: number;
  speed: number;
}

interface Rect {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const WAVES: readonly Wave[] = SEA.waves.map((wave) => ({
  amplitude: wave.amplitude,
  number: (Math.PI * 2) / wave.length,
  cos: Math.cos(wave.angle),
  sin: Math.sin(wave.angle),
  speed: wave.speed,
}));

export function waveHeight(x: number, z: number, time: number): number {
  let height = 0;
  for (const wave of WAVES) {
    height +=
      wave.amplitude * Math.sin(wave.number * (x * wave.cos + z * wave.sin) - wave.speed * time);
  }
  return height;
}

function distanceOutside(x: number, z: number): number {
  const dx = Math.max(Math.abs(x) - BLOCK.halfWidth, 0);
  const dz = Math.max(z - BLOCK.front, BLOCK.back - z, 0);
  return Math.hypot(dx, dz);
}

function distanceInside(x: number, z: number): number {
  return Math.min(BLOCK.halfWidth - Math.abs(x), BLOCK.front - z, z - BLOCK.back);
}

function flatPlane(rect: Rect, cell: number): PlaneGeometry {
  const width = rect.maxX - rect.minX;
  const depth = rect.maxZ - rect.minZ;
  const plane = new PlaneGeometry(
    width,
    depth,
    Math.max(1, Math.round(width / cell)),
    Math.max(1, Math.round(depth / cell)),
  );
  plane.rotateX(-QUARTER_TURN);
  plane.translate((rect.minX + rect.maxX) / 2, 0, (rect.minZ + rect.maxZ) / 2);
  return plane;
}

function surfaceGeometry(): PlaneGeometry {
  const rect = {
    minX: -BLOCK.halfWidth,
    maxX: BLOCK.halfWidth,
    minZ: BLOCK.back,
    maxZ: BLOCK.front,
  };
  return flatPlane(rect, SEA.cell);
}

function fadeOutward(plane: PlaneGeometry): PlaneGeometry {
  const position = plane.getAttribute('position');
  const colors = new Float32Array(position.count * RGBA);
  for (let index = 0; index < position.count; index++) {
    const distance = distanceOutside(position.getX(index), position.getZ(index));
    const fade = 1 - smoothstep(distance, 0, SEA.outerReach);
    colors.set([WHITE.r, WHITE.g, WHITE.b, fade], index * RGBA);
  }
  plane.setAttribute('color', new BufferAttribute(colors, RGBA));
  return plane;
}

function outerGeometry(): BufferGeometry {
  const { halfWidth, back, front } = BLOCK;
  const reach = SEA.outerReach;
  const strips: Rect[] = [
    { minX: -halfWidth - reach, maxX: halfWidth + reach, minZ: back - reach, maxZ: back },
    { minX: -halfWidth - reach, maxX: halfWidth + reach, minZ: front, maxZ: front + reach },
    { minX: -halfWidth - reach, maxX: -halfWidth, minZ: back, maxZ: front },
    { minX: halfWidth, maxX: halfWidth + reach, minZ: back, maxZ: front },
  ];
  return merge(strips.map((rect) => fadeOutward(flatPlane(rect, SEA.outerCell))));
}

function shade(plane: PlaneGeometry): PlaneGeometry {
  const position = plane.getAttribute('position');
  const colors = new Float32Array(position.count * RGB);
  const top = new Color(SEA.topShade);
  const bottom = new Color(SEA.bottomShade);
  const color = new Color();
  for (let index = 0; index < position.count; index++) {
    const share = position.getY(index) / SEABED_Y;
    color
      .copy(top)
      .lerp(bottom, share)
      .toArray(colors, index * RGB);
  }
  plane.setAttribute('color', new BufferAttribute(colors, RGB));
  return plane;
}

function wall(width: number, placeAt: (plane: PlaneGeometry) => void): PlaneGeometry {
  const plane = new PlaneGeometry(width, -SEABED_Y, 1, 1);
  plane.translate(0, SEABED_Y / 2, 0);
  placeAt(plane);
  return shade(plane);
}

function wallGeometry(closed: boolean): BufferGeometry {
  const width = BLOCK.halfWidth * 2;
  const front = closed ? BLOCK.front : BLOCK.cutZ;
  const depth = front - BLOCK.back;
  const middleZ = (front + BLOCK.back) / 2;
  const walls = [
    wall(width, (plane) => plane.translate(0, 0, BLOCK.back)),
    ...[-1, 1].map((side) =>
      wall(depth, (plane) => {
        plane.rotateY(side * QUARTER_TURN);
        plane.translate(side * BLOCK.halfWidth, 0, middleZ);
      }),
    ),
  ];
  if (closed) walls.push(wall(width, (plane) => plane.translate(0, 0, BLOCK.front)));
  return merge(walls);
}

function foamRing(x: number, z: number): BufferGeometry {
  const { inner, outer, alpha, lift, segments } = SEA.foam;
  const ring = new RingGeometry(inner, outer, segments, 1);
  const position = ring.getAttribute('position');
  const colors = new Float32Array(position.count * RGBA);
  for (let index = 0; index < position.count; index++) {
    const radius = Math.hypot(position.getX(index), position.getY(index));
    const share = (radius - inner) / (outer - inner);
    colors.set([WHITE.r, WHITE.g, WHITE.b, alpha * (1 - share)], index * RGBA);
  }
  ring.setAttribute('color', new BufferAttribute(colors, RGBA));
  ring.rotateX(-QUARTER_TURN);
  ring.translate(x, lift, z);
  return ring;
}

function foamGeometry(): BufferGeometry {
  const offset = HULL.column.offset;
  return merge(CORNERS.map(([sx, sz]) => foamRing(sx * offset, sz * offset)));
}

export class SeaPart {
  readonly object = new Group();
  private readonly surface: Mesh;
  private readonly clearWater: Mesh;
  private readonly solidWater: Mesh;
  private readonly clearSea: Material;
  private readonly solidSea: Material;
  private readonly base: Float32Array;
  private readonly damping: Float32Array;

  constructor(context: PartContext) {
    this.clearSea = context.materials.get(UNDIMMED_GROUP, FINISHES.sea);
    this.solidSea = context.materials.get(UNDIMMED_GROUP, FINISHES.seaOpaque);
    this.surface = finishMesh(context, surfaceGeometry(), UNDIMMED_GROUP, FINISHES.sea);
    this.surface.frustumCulled = false;
    this.surface.renderOrder = RENDER_ORDER.sea;
    this.base = Float32Array.from(this.surface.geometry.getAttribute('position').array);
    this.damping = this.edgeDamping();
    const outer = finishMesh(context, outerGeometry(), UNDIMMED_GROUP, FINISHES.seaOuter);
    outer.renderOrder = RENDER_ORDER.sea;
    this.clearWater = finishMesh(context, wallGeometry(false), UNDIMMED_GROUP, FINISHES.water);
    this.clearWater.renderOrder = RENDER_ORDER.water;
    this.solidWater = finishMesh(context, wallGeometry(true), UNDIMMED_GROUP, FINISHES.waterOpaque);
    this.object.add(this.surface, outer, this.clearWater, this.solidWater, this.foam(context));
  }

  setCutaway(cutaway: boolean): void {
    this.surface.material = cutaway ? this.clearSea : this.solidSea;
    this.clearWater.visible = cutaway;
    this.solidWater.visible = !cutaway;
  }

  update(time: number): void {
    const position = this.surface.geometry.getAttribute('position') as BufferAttribute;
    const array = position.array as Float32Array;
    for (let offset = 0, vertex = 0; offset < array.length; offset += XYZ, vertex++) {
      const x = this.base[offset];
      const z = this.base[offset + 2];
      array[offset + 1] = waveHeight(x, z, time) * this.damping[vertex];
    }
    position.needsUpdate = true;
  }

  private edgeDamping(): Float32Array {
    const count = this.base.length / XYZ;
    const damping = new Float32Array(count);
    for (let vertex = 0; vertex < count; vertex++) {
      const inside = distanceInside(this.base[vertex * XYZ], this.base[vertex * XYZ + 2]);
      damping[vertex] = smoothstep(inside, 0, SEA.edgeDamp);
    }
    return damping;
  }

  private foam(context: PartContext): Mesh {
    const material = new MeshBasicMaterial({
      vertexColors: true,
      transparent: true,
      depthWrite: false,
    });
    const foam = registeredMesh(context, foamGeometry(), UNDIMMED_GROUP, material);
    foam.renderOrder = RENDER_ORDER.sea;
    return foam;
  }
}
