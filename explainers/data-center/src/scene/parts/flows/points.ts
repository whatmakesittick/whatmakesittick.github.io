import { BufferAttribute, CanvasTexture, Color, NormalBlending, SRGBColorSpace } from 'three';
import type { Blending, PointsMaterial, Texture } from 'three';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { RENDER_ORDER, TEXTURE_PX } from './constants';
import { patchShader } from './shader';

export interface GradientStop {
  readonly offset: number;
  readonly color: string;
}

export interface PointStyle {
  readonly texture: Texture;
  readonly size: number;
  readonly worldSize?: boolean;
  readonly blending?: Blending;
  readonly depthTest?: boolean;
  readonly pull?: boolean;
  readonly sized?: boolean;
  readonly renderOrder?: number;
}

const SIZE_ATTRIBUTE = 'aSize';

export function gradientTexture(context: PartContext, stops: readonly GradientStop[]): Texture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_PX;
  canvas.height = TEXTURE_PX;
  const draw = canvas.getContext('2d');
  if (draw) {
    const half = TEXTURE_PX / 2;
    const gradient = draw.createRadialGradient(half, half, 0, half, half, half);
    stops.forEach(({ offset, color }) => gradient.addColorStop(offset, color));
    draw.fillStyle = gradient;
    draw.fillRect(0, 0, TEXTURE_PX, TEXTURE_PX);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return context.tracker.track(texture);
}

function pointMaterial(style: PointStyle): PointsMaterial {
  const material = createPointMaterial(style.texture, style.size, style.blending ?? NormalBlending);
  material.sizeAttenuation = style.worldSize ?? false;
  material.depthTest = style.depthTest ?? true;
  material.toneMapped = false;
  return patchShader(
    material,
    style.sized
      ? {
          key: 'flow-puff',
          vertexHead: `attribute float ${SIZE_ATTRIBUTE};`,
          pointSize: `gl_PointSize = size * ${SIZE_ATTRIBUTE};`,
        }
      : { key: 'flow-point' },
    style.pull ?? true,
  );
}

export class Cloud {
  readonly cloud: PointCloud;
  readonly material: PointsMaterial;
  readonly count: number;
  private readonly sizes: Float32Array | null;
  private readonly tint = new Color();

  constructor(context: PartContext, group: EmphasisGroup, count: number, style: PointStyle) {
    this.count = count;
    this.material = registeredMaterial(context, group, pointMaterial(style));
    this.cloud = context.tracker.track(
      new PointCloud(count, this.material, style.renderOrder ?? RENDER_ORDER.particles),
    );
    this.sizes = style.sized ? new Float32Array(count) : null;
    if (this.sizes) {
      this.cloud.points.geometry.setAttribute(SIZE_ATTRIBUTE, new BufferAttribute(this.sizes, 1));
    }
    for (let index = 0; index < count; index += 1) this.hide(index);
    this.commit();
  }

  get object(): PointCloud['points'] {
    return this.cloud.points;
  }

  set(
    index: number,
    x: number,
    y: number,
    z: number,
    color: string,
    alpha: number,
    size = 1,
  ): void {
    this.cloud.setPoint(index, x, y, z);
    this.tint.set(color);
    this.cloud.setColor(index, this.tint.r, this.tint.g, this.tint.b, alpha);
    if (this.sizes) this.sizes[index] = size;
  }

  hide(index: number): void {
    this.cloud.setColor(index, 0, 0, 0, 0);
    if (this.sizes) this.sizes[index] = 0;
  }

  commit(): void {
    this.cloud.commit();
    const sizes = this.cloud.points.geometry.getAttribute(SIZE_ATTRIBUTE);
    if (sizes) sizes.needsUpdate = true;
  }
}
