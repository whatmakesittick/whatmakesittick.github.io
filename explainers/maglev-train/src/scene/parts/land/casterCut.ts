import type { Texture, WebGLProgramParametersWithUniforms } from 'three';
import type { CutUniform } from '../line/cut';
import { glslFloat, inject } from '../shaderChunks';
import { SHADOW_SLOPE } from './shadow';

const RATIO_DIGITS = 5;
const CASTER_RATIO = glslFloat(SHADOW_SLOPE[0] / SHADOW_SLOPE[1], RATIO_DIGITS);

const VERTEX_HEAD = /* glsl */ `
varying vec2 vGroundXZ;
`;

const VERTEX_BODY = /* glsl */ `
vGroundXZ = (modelMatrix * vec4(transformed, 1.0)).xz;
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uCutX;
varying vec2 vGroundXZ;
bool castAheadOfCut() {
  return vGroundXZ.x - vGroundXZ.y * ${CASTER_RATIO} > uCutX;
}
`;

const SHADE_HEAD = /* glsl */ `
uniform sampler2D uLineShade;
`;

const SHADE_BODY = /* glsl */ `
if (!castAheadOfCut()) diffuseColor.rgb *= texture2D(uLineShade, vMapUv).rgb;
`;

const DISCARD_BODY = /* glsl */ `
if (castAheadOfCut()) discard;
`;

function trackGround(shader: WebGLProgramParametersWithUniforms, cut: CutUniform): void {
  shader.uniforms.uCutX = cut;
  shader.vertexShader = inject(shader.vertexShader, '#include <common>', VERTEX_HEAD);
  shader.vertexShader = inject(shader.vertexShader, '#include <project_vertex>', VERTEX_BODY);
  shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
}

export function shadeBehindCut(
  shader: WebGLProgramParametersWithUniforms,
  shade: Texture,
  cut: CutUniform,
): void {
  trackGround(shader, cut);
  shader.uniforms.uLineShade = { value: shade };
  shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', SHADE_HEAD);
  shader.fragmentShader = inject(shader.fragmentShader, '#include <map_fragment>', SHADE_BODY);
}

export function dropShadowAheadOfCut(
  shader: WebGLProgramParametersWithUniforms,
  cut: CutUniform,
): void {
  trackGround(shader, cut);
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <clipping_planes_fragment>',
    DISCARD_BODY,
  );
}
