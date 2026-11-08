import { LineSegments, Mesh, Vector3 } from 'three';
import type { IUniform, Intersection, Material, Object3D } from 'three';
import type { Point } from '../../ids';
import { DITHER_NOISE, glslFloat, inject } from './shaderChunks';

export interface KeepBox {
  readonly min: Point;
  readonly max: Point;
}

export interface MaskStyle {
  readonly soft: number;
  readonly veil: number;
  readonly tone: number;
}

type GoneTest = (point: Vector3) => boolean;

const FAR = 1e3;
const NOWHERE: KeepBox = { min: [FAR, FAR, FAR], max: [-FAR, -FAR, -FAR] };
const MIN_SOFT = 1e-4;
const GONE = 0.5;
const PLAIN: MaskStyle = { soft: 0.001, veil: 0, tone: 1 };

const VERTEX_HEAD = /* glsl */ `
varying vec3 vCloseWorld;
`;

const VERTEX_BODY = /* glsl */ `
vec4 closeWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
closeWorld = instanceMatrix * closeWorld;
#endif
vCloseWorld = (modelMatrix * closeWorld).xyz;
#ifdef USE_INSTANCING
vCloseWorld.x = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).x;
#endif
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uCloseAmount;
uniform vec3 uCloseMin;
uniform vec3 uCloseMax;
varying vec3 vCloseWorld;
${DITHER_NOISE}
`;

function fragmentBody({ soft, veil }: MaskStyle): string {
  return /* glsl */ `
vec3 closeOut = max(uCloseMin - vCloseWorld, vCloseWorld - uCloseMax);
float closeEdge = max(closeOut.x, max(closeOut.y, closeOut.z));
float closeGone = max(smoothstep(0.0, ${glslFloat(Math.max(soft, MIN_SOFT))}, closeEdge), ${glslFloat(veil)});
if (ditherNoise(gl_FragCoord.xy) < uCloseAmount * closeGone) discard;
`;
}

function toneBody({ tone }: MaskStyle): string {
  return `diffuseColor.rgb *= mix(1.0, ${glslFloat(tone)}, uCloseAmount);`;
}

const dissolved = new WeakMap<Material, GoneTest>();

function isDrawn(object: Object3D): object is Mesh | LineSegments {
  return object instanceof Mesh || object instanceof LineSegments;
}

export function markDissolved(material: Material, gone: GoneTest): void {
  dissolved.set(material, gone);
}

export function keepsCloseHit({ object, point }: Intersection): boolean {
  if (!isDrawn(object) || Array.isArray(object.material)) return true;
  const gone = dissolved.get(object.material);
  return !gone?.(point);
}

export class CloseMask {
  private readonly amount: IUniform<number>;
  private readonly style: MaskStyle;
  private readonly min: IUniform<Vector3> = { value: new Vector3(...NOWHERE.min) };
  private readonly max: IUniform<Vector3> = { value: new Vector3(...NOWHERE.max) };

  constructor(amount: IUniform<number>, style: Partial<MaskStyle> = {}) {
    this.amount = amount;
    this.style = { ...PLAIN, ...style };
  }

  keep(box: KeepBox | null): void {
    const { min, max } = box ?? NOWHERE;
    this.min.value.set(...min);
    this.max.value.set(...max);
  }

  cover(root: Object3D): void {
    root.traverse((node) => {
      if (isDrawn(node) && !Array.isArray(node.material)) this.patch(node.material);
    });
  }

  patch(material: Material): void {
    if (dissolved.has(material)) return;
    markDissolved(material, (point) => this.isGone(point));
    const compile = material.onBeforeCompile.bind(material);
    const cacheKey = material.customProgramCacheKey.bind(material);
    const { style } = this;
    material.onBeforeCompile = (shader, renderer) => {
      compile(shader, renderer);
      shader.uniforms.uCloseAmount = this.amount;
      shader.uniforms.uCloseMin = this.min;
      shader.uniforms.uCloseMax = this.max;
      shader.vertexShader = inject(shader.vertexShader, '#include <common>', VERTEX_HEAD);
      shader.vertexShader = inject(shader.vertexShader, '#include <project_vertex>', VERTEX_BODY);
      shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
      shader.fragmentShader = inject(
        shader.fragmentShader,
        '#include <clipping_planes_fragment>',
        fragmentBody(style),
      );
      shader.fragmentShader = inject(
        shader.fragmentShader,
        '#include <color_fragment>',
        toneBody(style),
      );
    };
    material.customProgramCacheKey = () =>
      `${cacheKey()}|close-${style.soft}-${style.veil}-${style.tone}`;
    material.needsUpdate = true;
  }

  private isGone(point: Vector3): boolean {
    if (this.amount.value < GONE) return false;
    if (this.style.veil >= GONE) return true;
    const { min, max } = this;
    return (
      point.x < min.value.x ||
      point.y < min.value.y ||
      point.z < min.value.z ||
      point.x > max.value.x ||
      point.y > max.value.y ||
      point.z > max.value.z
    );
  }
}
