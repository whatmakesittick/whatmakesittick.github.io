import type { MeshStandardMaterial } from 'three';
import { createMaterial } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import { registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

const CACHE_KEY = 'farmGroundWidening';
const DECLARATIONS = 'attribute vec3 lateral;\nuniform float groundWiden;\nvoid main() {';
const WIDEN_VERTEX = '#include <begin_vertex>\ntransformed += lateral * groundWiden;';

export interface WideningOptions {
  readonly halfWidth: number;
  readonly perMetre: number;
}

export class GroundWidening {
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
      shader.uniforms.groundWiden = this.widen;
      shader.vertexShader = shader.vertexShader
        .replace('void main() {', DECLARATIONS)
        .replace('#include <begin_vertex>', WIDEN_VERTEX);
    };
    this.material.customProgramCacheKey = () => CACHE_KEY;
    registeredMaterial(context, group, this.material);
  }

  update(cameraDistance: number): void {
    const { halfWidth, perMetre } = this.options;
    this.widen.value = Math.max(0, cameraDistance * perMetre - halfWidth);
  }
}
