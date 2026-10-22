import { MeshStandardMaterial } from 'three';
import type { IUniform, WebGLProgramParametersWithUniforms } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { BEAM_M, CUT_X, GIRDER } from '../../../model';
import { glslFloat, inject } from '../shaderChunks';

export const NO_CUT = 1e6;

const PIER_TOLERANCE = 0.001;

export type CutUniform = IUniform<number>;

export function createCut(): CutUniform {
  return { value: NO_CUT };
}

export function setCut(cut: CutUniform, cutaway: boolean): void {
  cut.value = cutaway ? CUT_X : NO_CUT;
}

const VERTEX_HEAD = /* glsl */ `
varying float vCutX;
`;

const VERTEX_BODY = /* glsl */ `
vec4 cutWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
cutWorld = instanceMatrix * cutWorld;
#endif
vCutX = (modelMatrix * cutWorld).x;
#ifdef CUT_PIER_BELOW
if (position.y < CUT_PIER_BELOW) {
  vec4 pierAt = vec4(CUT_PIER_X, 0.0, 0.0, 1.0);
  #ifdef USE_INSTANCING
  pierAt = instanceMatrix * pierAt;
  #endif
  vCutX = (modelMatrix * pierAt).x;
}
#endif
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uCutX;
varying float vCutX;
`;

const FRAGMENT_BODY = /* glsl */ `
if (vCutX > uCutX) discard;
`;

export function applyCut(shader: WebGLProgramParametersWithUniforms, cut: CutUniform): void {
  shader.uniforms.uCutX = cut;
  shader.vertexShader = inject(shader.vertexShader, '#include <common>', VERTEX_HEAD);
  shader.vertexShader = inject(shader.vertexShader, '#include <project_vertex>', VERTEX_BODY);
  shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <clipping_planes_fragment>',
    FRAGMENT_BODY,
  );
}

export const PIER_LEVELS = {
  concrete: GIRDER.bottom - PIER_TOLERANCE,
  bearings: GIRDER.bottom + PIER_TOLERANCE,
} as const;

export function pierCutDefines(below: number): Record<string, string> {
  return {
    CUT_PIER_BELOW: glslFloat(below),
    CUT_PIER_X: glslFloat(-BEAM_M / 2),
  };
}

export function cutMaterial(
  finish: MaterialFinish,
  cut: CutUniform,
  defines: Record<string, string> = {},
): MeshStandardMaterial {
  const material = new MeshStandardMaterial(finish);
  material.defines = { ...material.defines, ...defines };
  material.onBeforeCompile = (shader) => applyCut(shader, cut);
  return material;
}
