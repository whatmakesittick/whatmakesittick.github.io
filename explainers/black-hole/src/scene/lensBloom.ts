import { Mesh, OrthographicCamera, Scene, Vector2 } from 'three';
import type { ShaderMaterial, WebGLRenderer, WebGLRenderTarget } from 'three';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { BLOOM } from './constants';
import { fullscreenTriangle } from './fullscreenTriangle';

const UNSIZED = new Vector2(1, 1);
const NO_DELTA = 0;
const NO_MASK = false;

export class LensBloom {
  private readonly pass = new UnrealBloomPass(
    UNSIZED,
    BLOOM.strength,
    BLOOM.radius,
    BLOOM.threshold,
  );

  async prepare(renderer: WebGLRenderer): Promise<void> {
    const warmUp = new Scene();
    const geometry = fullscreenTriangle();
    for (const material of this.materials()) warmUp.add(new Mesh(geometry, material));
    await renderer.compileAsync(warmUp, new OrthographicCamera());
    geometry.dispose();
  }

  setSize(width: number, height: number): void {
    this.pass.setSize(width, height);
  }

  apply(renderer: WebGLRenderer, image: WebGLRenderTarget): void {
    this.pass.render(renderer, image, image, NO_DELTA, NO_MASK);
  }

  dispose(): void {
    this.pass.dispose();
  }

  private materials(): ShaderMaterial[] {
    return [
      this.pass.materialHighPassFilter,
      ...this.pass.separableBlurMaterials,
      this.pass.compositeMaterial,
      this.pass.blendMaterial,
    ];
  }
}
