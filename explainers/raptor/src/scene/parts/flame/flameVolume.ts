import { AdditiveBlending, Color, Mesh, ShaderMaterial } from 'three';
import type { EmphasisGroup, PartContext } from '../context';
import { registered } from '../context';
import { revolveStrand } from '../../geometry/revolve';
import type { Strand } from '../../geometry/revolve';
import { FLAME_FRAGMENT, FLAME_VERTEX } from './shaders';

const TRANSLUCENT = 0.99;

export interface FlameLook {
  hot: string;
  mid: string;
  cool: string;
  segments: number;
}

export class FlameVolume {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;

  constructor(
    context: PartContext,
    strand: Strand,
    group: EmphasisGroup,
    look: FlameLook,
    time: { value: number },
  ) {
    this.material = registered(
      context,
      group,
      new ShaderMaterial({
        uniforms: {
          uTime: time,
          uIntensity: { value: 0 },
          uHot: { value: new Color(look.hot) },
          uMid: { value: new Color(look.mid) },
          uCool: { value: new Color(look.cool) },
        },
        vertexShader: FLAME_VERTEX,
        fragmentShader: FLAME_FRAGMENT,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        opacity: TRANSLUCENT,
      }),
    );
    const geometry = context.tracker.track(revolveStrand(strand, { segments: look.segments }));
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.renderOrder = 2;
  }

  setIntensity(intensity: number, shown: boolean): void {
    this.material.uniforms.uIntensity.value = intensity;
    this.mesh.visible = shown && intensity > 0;
  }
}
