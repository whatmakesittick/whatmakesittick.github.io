import {
  HalfFloatType,
  LinearFilter,
  Matrix4,
  Mesh,
  OrthographicCamera,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderTarget,
} from 'three';
import type { PerspectiveCamera, WebGLRenderer } from 'three';
import { DISC_INNER_RADIUS, DISC_OUTER_RADIUS } from '../model';
import { LENS } from './constants';
import { fullscreenTriangle } from './fullscreenTriangle';
import { LensBloom } from './lensBloom';
import { LENS_FRAGMENT, LENS_VERTEX } from './lensShader';

const SHOWN = 1;
const HIDDEN = 0;

function fitPixels(size: Vector2, maxPixels: number): Vector2 {
  const pixels = size.x * size.y;
  if (pixels <= maxPixels) return size;
  const scale = Math.sqrt(maxPixels / pixels);
  return size.multiplyScalar(scale).floor();
}

export class LensPass {
  readonly target: WebGLRenderTarget;
  private readonly material: ShaderMaterial;
  private readonly scene = new Scene();
  private readonly camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
  private readonly bloom = new LensBloom();
  private readonly bufferSize = new Vector2();
  private ready = false;

  constructor() {
    this.material = new ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDisc: { value: SHOWN },
        uBending: { value: LENS.bent },
        uDiscInner: { value: DISC_INNER_RADIUS },
        uDiscOuter: { value: DISC_OUTER_RADIUS },
        uMaxSteps: { value: LENS.maxSteps },
        uCameraPosition: { value: new Vector3() },
        uInverseProjection: { value: new Matrix4() },
        uCameraToWorld: { value: new Matrix4() },
      },
      vertexShader: LENS_VERTEX,
      fragmentShader: LENS_FRAGMENT,
      depthTest: false,
      depthWrite: false,
    });
    this.target = new WebGLRenderTarget(1, 1, {
      type: HalfFloatType,
      minFilter: LinearFilter,
      magFilter: LinearFilter,
      depthBuffer: false,
    });
    const triangle = new Mesh(fullscreenTriangle(), this.material);
    triangle.frustumCulled = false;
    this.scene.add(triangle);
  }

  setTime(seconds: number): void {
    this.material.uniforms.uTime.value = seconds;
  }

  setMaxSteps(steps: number): void {
    this.material.uniforms.uMaxSteps.value = steps;
  }

  async prepare(renderer: WebGLRenderer): Promise<void> {
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(this.target);
    const compiled = Promise.all([
      renderer.compileAsync(this.scene, this.camera),
      this.bloom.prepare(renderer),
    ]);
    renderer.setRenderTarget(previous);
    await compiled;
    this.ready = true;
  }

  setDiscShown(shown: boolean): void {
    this.material.uniforms.uDisc.value = shown ? SHOWN : HIDDEN;
  }

  setBending(bending: number): void {
    this.material.uniforms.uBending.value = bending;
  }

  render(renderer: WebGLRenderer, camera: PerspectiveCamera): void {
    if (!this.ready) return;
    this.resize(renderer);
    const uniforms = this.material.uniforms;
    uniforms.uCameraPosition.value.copy(camera.position);
    uniforms.uInverseProjection.value.copy(camera.projectionMatrixInverse);
    uniforms.uCameraToWorld.value.copy(camera.matrixWorld);
    const previous = renderer.getRenderTarget();
    renderer.setRenderTarget(this.target);
    renderer.render(this.scene, this.camera);
    this.bloom.apply(renderer, this.target);
    renderer.setRenderTarget(previous);
  }

  dispose(): void {
    this.target.dispose();
    this.material.dispose();
    this.bloom.dispose();
  }

  private resize(renderer: WebGLRenderer): void {
    const size = fitPixels(renderer.getDrawingBufferSize(this.bufferSize), LENS.maxPixels);
    if (this.target.width === size.x && this.target.height === size.y) return;
    this.target.setSize(size.x, size.y);
    this.bloom.setSize(size.x, size.y);
  }
}
