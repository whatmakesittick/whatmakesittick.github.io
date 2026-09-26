import { BufferAttribute, BufferGeometry, NormalBlending, Points, PointsMaterial } from 'three';
import type { Blending, Texture } from 'three';
import { RENDER_ORDER } from '../constants';

const RGBA = 4;
const ALPHA = 3;
const XYZ = 3;

export function createPointMaterial(
  texture: Texture,
  size: number,
  blending: Blending = NormalBlending,
): PointsMaterial {
  return new PointsMaterial({
    size,
    map: texture,
    vertexColors: true,
    transparent: true,
    depthWrite: false,
    blending,
    sizeAttenuation: true,
  });
}

export class PointCloud {
  readonly points: Points;
  readonly positions: Float32Array;
  readonly colors: Float32Array;
  private readonly geometry: BufferGeometry;

  constructor(count: number, material: PointsMaterial) {
    this.positions = new Float32Array(count * XYZ);
    this.colors = new Float32Array(count * RGBA);
    this.geometry = new BufferGeometry();
    this.geometry.setAttribute('position', new BufferAttribute(this.positions, XYZ));
    this.geometry.setAttribute('color', new BufferAttribute(this.colors, RGBA));
    this.points = new Points(this.geometry, material);
    this.points.frustumCulled = false;
    this.points.renderOrder = RENDER_ORDER.overlay;
  }

  setPoint(index: number, x: number, y: number, z: number): void {
    const offset = index * XYZ;
    this.positions[offset] = x;
    this.positions[offset + 1] = y;
    this.positions[offset + 2] = z;
  }

  setColor(index: number, r: number, g: number, b: number, alpha: number): void {
    const offset = index * RGBA;
    this.colors[offset] = r;
    this.colors[offset + 1] = g;
    this.colors[offset + 2] = b;
    this.colors[offset + ALPHA] = alpha;
  }

  commit(): void {
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('color').needsUpdate = true;
  }
}
