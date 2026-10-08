import { BufferAttribute, Vector3 } from 'three';
import type { BufferGeometry, MeshStandardMaterial } from 'three';
import { createMaterial } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import { registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

const CACHE_KEY = 'farmWidening';
const DECLARATIONS = 'attribute vec3 lateral;\nuniform float farmWiden;\nvoid main() {';
const WIDEN_VERTEX = '#include <begin_vertex>\ntransformed += lateral * farmWiden;';
const XYZ = 3;

export interface WideningOptions {
  readonly halfWidth: number;
  readonly perMetre: number;
}

export type LateralRule = (point: Vector3, target: Vector3) => Vector3;

export function wideningAt(cameraDistance: number, { halfWidth, perMetre }: WideningOptions) {
  return Math.max(0, cameraDistance * perMetre - halfWidth);
}

export function withLateral(geometry: BufferGeometry, rule: LateralRule): BufferGeometry {
  const position = geometry.getAttribute('position');
  const laterals = new Float32Array(position.count * XYZ);
  const point = new Vector3();
  const side = new Vector3();
  for (let index = 0; index < position.count; index += 1)
    rule(point.fromBufferAttribute(position, index), side).toArray(laterals, index * XYZ);
  geometry.setAttribute('lateral', new BufferAttribute(laterals, XYZ));
  return geometry;
}

export function radialAroundY(point: Vector3, target: Vector3): Vector3 {
  return target.set(point.x, 0, point.z).normalize();
}

export function radialAroundX(axisY: number): LateralRule {
  return (point, target) => target.set(0, point.y - axisY, point.z).normalize();
}

export class Widening {
  readonly material: MeshStandardMaterial;
  private readonly widen = { value: 0 };
  private readonly options: WideningOptions;

  constructor(
    context: PartContext,
    group: EmphasisGroup,
    finish: MaterialFinish,
    options: WideningOptions,
  ) {
    this.options = options;
    this.material = createMaterial(finish);
    this.material.onBeforeCompile = (shader) => {
      shader.uniforms.farmWiden = this.widen;
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', DECLARATIONS)
        .replace('#include <begin_vertex>', WIDEN_VERTEX);
    };
    this.material.customProgramCacheKey = () => CACHE_KEY;
    registeredMaterial(context, group, this.material);
  }

  update(cameraDistance: number): void {
    this.widen.value = wideningAt(cameraDistance, this.options);
  }
}
