import { LineSegments, MathUtils, Mesh, Vector3 } from 'three';
import type { Camera, IUniform, Material, Object3D } from 'three';
import type { AssemblyState } from '../../../ids';
import { CASE, JACK_ANCHOR_Y, JACK_Z } from '../../../model';
import { markDissolved } from '../closeMask';
import type { CutUniforms } from '../cut';
import { DITHER_NOISE, inject } from '../shaderChunks';

const SIDE_VIEW = { below: CASE.rimTop + 0.1, above: CASE.rimTop + 0.15 } as const;
const CLOSE_UP = { inside: 2.8, outside: 3 } as const;
const FULL = 1;
const GONE = 0.5;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uCaseXray;
${DITHER_NOISE}
`;
const FRAGMENT_BODY = /* glsl */ `
if (ditherNoise(gl_FragCoord.xy) < uCaseXray) discard;
`;

type Drawn = Mesh | LineSegments;

function isDrawn(object: Object3D): object is Drawn {
  return object instanceof Mesh || object instanceof LineSegments;
}

export class CaseXray {
  private readonly amount: IUniform<number> = { value: 0 };
  private readonly cut: CutUniforms;
  private readonly close: IUniform<number>;
  private readonly patched = new WeakSet<Material>();
  private readonly section = new Vector3();
  private lineUp = false;

  constructor(cut: CutUniforms, close: IUniform<number>) {
    this.cut = cut;
    this.close = close;
  }

  watch(root: Object3D): void {
    root.traverse((node) => {
      if (!isDrawn(node) || Array.isArray(node.material)) return;
      this.patch(node.material);
      node.onBeforeRender = (_renderer, _scene, camera) => this.follow(camera);
    });
  }

  setState({ view }: AssemblyState): void {
    this.lineUp = view.lineUp;
  }

  private follow(camera: Camera): void {
    this.amount.value = this.lineUp
      ? FULL
      : Math.max(this.closeUpShare(camera.position), this.close.value);
  }

  private closeUpShare(eye: Vector3): number {
    const low = 1 - MathUtils.smoothstep(eye.y, SIDE_VIEW.below, SIDE_VIEW.above);
    this.section.set(this.cut.x.value, JACK_ANCHOR_Y, JACK_Z);
    const distance = eye.distanceTo(this.section);
    return low * (1 - MathUtils.smoothstep(distance, CLOSE_UP.inside, CLOSE_UP.outside));
  }

  private patch(material: Material): void {
    if (this.patched.has(material)) return;
    this.patched.add(material);
    markDissolved(material, () => this.close.value >= GONE);
    const compile = material.onBeforeCompile.bind(material);
    const cacheKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      compile(shader, renderer);
      shader.uniforms.uCaseXray = this.amount;
      shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
      shader.fragmentShader = inject(
        shader.fragmentShader,
        '#include <clipping_planes_fragment>',
        FRAGMENT_BODY,
      );
    };
    material.customProgramCacheKey = () => `${cacheKey()}|case-xray`;
    material.needsUpdate = true;
  }
}
