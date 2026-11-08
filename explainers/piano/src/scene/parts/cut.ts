import type {
  IUniform,
  Intersection,
  Material,
  Object3D,
  Raycaster,
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

const patched = new WeakMap<Material, CutMode>();
const CUT_ON = 0.5;
const PLAIN_MESH = 'Mesh';
const CUT_MESH = 'CutMesh';

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
  patched.set(material, mode);
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

export function isCutAway(cut: CutUniforms, point: Vector3, mode: CutMode): boolean {
  const inside = cut.on.value > CUT_ON && point.x < cut.x.value && point.y < CUT_TOP;
  return mode === 'remove' ? inside : !inside;
}

function cutRaycast(object: Object3D, cut: CutUniforms, mode: CutMode): Object3D['raycast'] {
  const raycast = object.raycast.bind(object);
  return (raycaster: Raycaster, hits: Intersection[]) => {
    const found: Intersection[] = [];
    raycast(raycaster, found);
    found.forEach((hit) => {
      if (!isCutAway(cut, hit.point, mode)) hits.push(hit);
    });
  };
}

export function raycastThroughCut(root: Object3D, cut: CutUniforms): void {
  root.traverse((object) => {
    if (!isMesh(object) || Array.isArray(object.material)) return;
    const mode = patched.get(object.material);
    if (!mode) return;
    object.raycast = cutRaycast(object, cut, mode);
    // The label occlusion's bounds tree skips raycast() for plain meshes.
    if (object.type === PLAIN_MESH) Object.defineProperty(object, 'type', { value: CUT_MESH });
  });
}
