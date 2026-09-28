import {
  BufferAttribute,
  CircleGeometry,
  Color,
  Group,
  MeshBasicMaterial,
  PlaneGeometry,
} from 'three';
import type { BufferGeometry, Material, Mesh } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { SEABED_Y } from '../../../model/scale';
import { BLOCK, HULL, RENDER_ORDER, SEA } from '../../constants';
import { FINISHES } from '../../finishes';
import { merge } from '../../geometry/merge';
import { finishMesh, registeredMesh } from '../context';
import type { PartContext } from '../context';
import { CORNERS } from '../rig/hull';

const RGB = 3;
const XYZ = 3;
const QUARTER_TURN = Math.PI / 2;
const FOAM = { radius: 17, lift: 0.3, opacity: 0.55, segments: 24 } as const;

interface Wave {
  amplitude: number;
  number: number;
  cos: number;
  sin: number;
  speed: number;
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

function surfaceGeometry(): PlaneGeometry {
  const width = BLOCK.halfWidth * 2;
  const depth = BLOCK.front - BLOCK.back;
  const plane = new PlaneGeometry(width, depth, width / SEA.cell, depth / SEA.cell);
  plane.rotateX(-QUARTER_TURN);
  plane.translate(0, 0, (BLOCK.front + BLOCK.back) / 2);
  return plane;
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

function foamGeometry(): BufferGeometry {
  const discs = CORNERS.map(([sx, sz]) => {
    const disc = new CircleGeometry(FOAM.radius, FOAM.segments);
    disc.rotateX(-QUARTER_TURN);
    disc.translate(sx * HULL.column.offset, FOAM.lift, sz * HULL.column.offset);
    return disc;
  });
  return merge(discs, true);
}

export class SeaPart {
  readonly object = new Group();
  private readonly surface: Mesh;
  private readonly clearWater: Mesh;
  private readonly solidWater: Mesh;
  private readonly clearSea: Material;
  private readonly solidSea: Material;
  private readonly base: Float32Array;

  constructor(context: PartContext) {
    this.clearSea = context.materials.get(UNDIMMED_GROUP, FINISHES.sea);
    this.solidSea = context.materials.get(UNDIMMED_GROUP, FINISHES.seaOpaque);
    this.surface = finishMesh(context, surfaceGeometry(), UNDIMMED_GROUP, FINISHES.sea);
    this.surface.frustumCulled = false;
    this.surface.renderOrder = RENDER_ORDER.sea;
    this.base = Float32Array.from(this.surface.geometry.getAttribute('position').array);
    this.clearWater = finishMesh(context, wallGeometry(false), UNDIMMED_GROUP, FINISHES.water);
    this.clearWater.renderOrder = RENDER_ORDER.water;
    this.solidWater = finishMesh(context, wallGeometry(true), UNDIMMED_GROUP, FINISHES.waterOpaque);
    this.object.add(this.surface, this.clearWater, this.solidWater, this.foam(context));
  }

  setCutaway(cutaway: boolean): void {
    this.surface.material = cutaway ? this.clearSea : this.solidSea;
    this.clearWater.visible = cutaway;
    this.solidWater.visible = !cutaway;
  }

  update(time: number): void {
    const position = this.surface.geometry.getAttribute('position') as BufferAttribute;
    const array = position.array as Float32Array;
    for (let offset = 0; offset < array.length; offset += XYZ) {
      array[offset + 1] = waveHeight(this.base[offset], this.base[offset + 2], time);
    }
    position.needsUpdate = true;
  }

  private foam(context: PartContext): Mesh {
    const material = new MeshBasicMaterial({
      map: context.textures.glow,
      transparent: true,
      opacity: FOAM.opacity,
      depthWrite: false,
    });
    const foam = registeredMesh(context, foamGeometry(), UNDIMMED_GROUP, material);
    foam.renderOrder = RENDER_ORDER.sea;
    return foam;
  }
}
