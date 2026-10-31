import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { PULL } from './constants';

export interface ShaderPatch {
  readonly key: string;
  readonly uniforms?: Record<string, { value: unknown }>;
  readonly vertexHead?: string;
  readonly vertexBegin?: string;
  readonly vertex?: string;
  readonly fragmentHead?: string;
  readonly fragment?: string;
  readonly pointSize?: string;
}

const COMMON = '#include <common>';
const BEGIN = '#include <begin_vertex>';
const PROJECT = '#include <project_vertex>';
const COLOR = '#include <color_fragment>';
const POINT_SIZE = 'gl_PointSize = size;';

const PULL_GLSL = `
  mvPosition.xyz += normalize(-mvPosition.xyz) * clamp(-mvPosition.z * ${PULL.share.toFixed(4)}, ${PULL.min.toFixed(3)}, ${PULL.max.toFixed(3)});
  gl_Position = projectionMatrix * mvPosition;`;

function after(source: string, anchor: string, addition = ''): string {
  return addition ? source.replace(anchor, `${anchor}\n${addition}`) : source;
}

export function patchShader<M extends Material>(material: M, patch: ShaderPatch, pull = true): M {
  material.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms) => {
    Object.assign(shader.uniforms, patch.uniforms ?? {});
    let vertex = after(shader.vertexShader, COMMON, patch.vertexHead);
    vertex = after(vertex, BEGIN, patch.vertexBegin);
    vertex = after(vertex, PROJECT, `${patch.vertex ?? ''}${pull ? PULL_GLSL : ''}`);
    if (patch.pointSize) vertex = vertex.replace(POINT_SIZE, patch.pointSize);
    shader.vertexShader = vertex;
    shader.fragmentShader = after(
      after(shader.fragmentShader, COMMON, patch.fragmentHead),
      COLOR,
      patch.fragment,
    );
  };
  material.customProgramCacheKey = () => `${patch.key}-${pull ? 'pull' : 'flat'}`;
  return material;
}
