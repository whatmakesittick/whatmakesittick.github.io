import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { chainShaderPatch } from '@core/scene/shaderPatch';

export const NEAR_FADE = { hiddenM: 2.2, shownM: 3.4 } as const;

const VERTEX_HEAD = /* glsl */ `
varying float vCameraGap;
`;

const VERTEX_BODY = /* glsl */ `
{
  vec4 nearWorld = vec4(transformed, 1.0);
  #ifdef USE_INSTANCING
    nearWorld = instanceMatrix * nearWorld;
  #endif
  nearWorld = modelMatrix * nearWorld;
  vCameraGap = length(nearWorld.xz - cameraPosition.xz);
}
`;

const FRAGMENT_HEAD = /* glsl */ `
varying float vCameraGap;
`;

const FRAGMENT_BODY = /* glsl */ `
{
  float shown = smoothstep(${NEAR_FADE.hiddenM.toFixed(2)}, ${NEAR_FADE.shownM.toFixed(2)}, vCameraGap);
  float dither = fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715))));
  if (dither >= shown) discard;
}
`;

function inject(source: string, anchor: string, addition: string): string {
  if (!source.includes(anchor)) throw new Error(`Shader anchor missing: ${anchor}`);
  return source.replace(anchor, `${anchor}\n${addition}`);
}

function patch(shader: WebGLProgramParametersWithUniforms): void {
  shader.vertexShader = inject(shader.vertexShader, '#include <common>', VERTEX_HEAD);
  shader.vertexShader = inject(shader.vertexShader, '#include <begin_vertex>', VERTEX_BODY);
  shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <clipping_planes_fragment>',
    FRAGMENT_BODY,
  );
}

export function fadeNearCamera<M extends Material>(material: M): M {
  return chainShaderPatch(material, 'nearFade', patch);
}
