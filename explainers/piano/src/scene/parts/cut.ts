import type {
  IUniform,
  Intersection,
  Material,
  Vector3,
  WebGLProgramParametersWithUniforms,
} from 'three';
import { isMesh } from '@core/scene/occlusion';
import { CUT_TOP } from '../constants';
import { glslFloat, inject } from './shaderChunks';

export type CutMode = 'remove' | 'keep';

export interface CutUniforms {
  readonly x: IUniform<number>;
  readonly on: IUniform<number>;
}

const VERTEX_HEAD = /* glsl */ `
varying vec2 vCutWorld;
`;

const VERTEX_BODY = /* glsl */ `
vec4 cutWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
cutWorld = instanceMatrix * cutWorld;
#endif
vCutWorld = (modelMatrix * cutWorld).xy;
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uCutX;
uniform float uCutOn;
varying vec2 vCutWorld;
`;

function fragmentBody(mode: CutMode): string {
  const inside = `uCutOn > 0.5 && vCutWorld.x < uCutX && vCutWorld.y < ${glslFloat(CUT_TOP)}`;
  return mode === 'remove' ? `if (${inside}) discard;` : `if (!(${inside})) discard;`;
}

interface CutPatch {
  cut: CutUniforms;
  mode: CutMode;
}

const patched = new WeakMap<Material, CutPatch>();
const CUT_ON = 0.5;

export function createCut(): CutUniforms {
  return { x: { value: 0 }, on: { value: 0 } };
}

export function setCut(cut: CutUniforms, enabled: boolean, x: number): void {
  cut.x.value = x;
  cut.on.value = enabled ? 1 : 0;
}

export function cutShader(
  shader: WebGLProgramParametersWithUniforms,
  cut: CutUniforms,
  mode: CutMode,
): void {
  shader.uniforms.uCutX = cut.x;
  shader.uniforms.uCutOn = cut.on;
  shader.vertexShader = inject(shader.vertexShader, '#include <common>', VERTEX_HEAD);
  shader.vertexShader = inject(shader.vertexShader, '#include <project_vertex>', VERTEX_BODY);
  shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <clipping_planes_fragment>',
    fragmentBody(mode),
  );
}

export function applyCut<M extends Material>(
  material: M,
  cut: CutUniforms,
  mode: CutMode = 'remove',
): M {
  if (patched.has(material)) return material;
  patched.set(material, { cut, mode });
  const compile = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    cutShader(shader, cut, mode);
  };
  material.customProgramCacheKey = () => `${cacheKey()}|cut-${mode}`;
  material.needsUpdate = true;
  return material;
}

function isCutAway({ cut, mode }: CutPatch, point: Vector3): boolean {
  const inside = cut.on.value > CUT_ON && point.x < cut.x.value && point.y < CUT_TOP;
  return mode === 'remove' ? inside : !inside;
}

export function keepsCutHit({ object, point }: Intersection): boolean {
  if (!isMesh(object) || Array.isArray(object.material)) return true;
  const patch = patched.get(object.material);
  return !patch || !isCutAway(patch, point);
}
