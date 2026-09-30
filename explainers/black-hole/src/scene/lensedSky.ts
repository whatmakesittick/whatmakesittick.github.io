import { Mesh, ShaderMaterial } from 'three';
import type { Camera, PerspectiveCamera, WebGLRenderer } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { MaterialLibrary } from '@core/scene/materials';
import { BLIT_FRAGMENT, BLIT_VERTEX } from './blitShader';
import { SKY } from './constants';
import { fullscreenTriangle } from './fullscreenTriangle';
import { LensPass } from './lensPass';

export class LensedSky {
  readonly mesh: Mesh;
  private readonly pass = new LensPass();
  private readonly material: ShaderMaterial;

  constructor(materials: MaterialLibrary) {
    this.material = new ShaderMaterial({
      uniforms: { uImage: { value: this.pass.target.texture } },
      vertexShader: BLIT_VERTEX,
      fragmentShader: BLIT_FRAGMENT,
      depthWrite: false,
      toneMapped: false,
    });
    materials.register(UNDIMMED_GROUP, this.material);
    this.mesh = new Mesh(fullscreenTriangle(), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = SKY.renderOrder;
    this.mesh.onBeforeRender = (renderer: WebGLRenderer, _scene, camera: Camera) => {
      this.pass.render(renderer, camera as PerspectiveCamera);
    };
  }

  prepare(renderer: WebGLRenderer): Promise<void> {
    return this.pass.prepare(renderer);
  }

  setTime(seconds: number): void {
    this.pass.setTime(seconds);
  }

  setDiscShown(shown: boolean): void {
    this.pass.setDiscShown(shown);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.material.dispose();
    this.pass.dispose();
  }
}
