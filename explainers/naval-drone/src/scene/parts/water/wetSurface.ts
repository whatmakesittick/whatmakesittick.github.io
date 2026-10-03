import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { Color } from 'three';
import { THEME } from '../../../theme';
import { WET } from '../../constants';
import { WATER, WAVE_GLSL } from './waves';

const KEY = 'naval-drone-wet';

const VERTEX_HEAD = /* glsl */ `
varying vec3 vWetWorld;
`;

const VERTEX_BODY = /* glsl */ `
#include <project_vertex>
vWetWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;

const FRAGMENT_HEAD = /* glsl */ `
varying vec3 vWetWorld;
${WAVE_GLSL}
`;

const FRAGMENT_COLOUR = /* glsl */ `
#include <color_fragment>
float wetLine = seaHeight(vWetWorld.xz) + ${WET.rise.toFixed(3)};
float wetness = 1.0 - smoothstep(wetLine, wetLine + ${WET.fade.toFixed(3)}, vWetWorld.y);
diffuseColor.rgb *= mix(1.0, ${WET.darken.toFixed(3)}, wetness);
`;

const MURK = new Color(THEME.seaDeep);

const FRAGMENT_MURK = /* glsl */ `
outgoingLight = mix(outgoingLight, vec3(${MURK.toArray()
  .map((value) => value.toFixed(3))
  .join(
    ', ',
  )}), smoothstep(0.0, ${WET.murkDepth.toFixed(2)}, wetLine - vWetWorld.y) * ${WET.murk.toFixed(2)});
#include <opaque_fragment>
`;

const FRAGMENT_ROUGHNESS = /* glsl */ `
#include <roughnessmap_fragment>
roughnessFactor = mix(roughnessFactor, ${WET.roughness.toFixed(3)}, wetness);
`;

function inject(shader: WebGLProgramParametersWithUniforms): void {
  shader.uniforms.uSeaTime = WATER.uSeaTime;
  shader.uniforms.uSeaDrift = WATER.uSeaDrift;
  shader.uniforms.uWaves = WATER.uWaves;
  shader.vertexShader =
    VERTEX_HEAD + shader.vertexShader.replace('#include <project_vertex>', VERTEX_BODY);
  shader.fragmentShader =
    FRAGMENT_HEAD +
    shader.fragmentShader
      .replace('#include <color_fragment>', FRAGMENT_COLOUR)
      .replace('#include <roughnessmap_fragment>', FRAGMENT_ROUGHNESS)
      .replace('#include <opaque_fragment>', FRAGMENT_MURK);
}

export function wetSurface<T extends Material>(material: T): T {
  if (material.customProgramCacheKey() === KEY) return material;
  material.onBeforeCompile = inject;
  material.customProgramCacheKey = () => KEY;
  material.needsUpdate = true;
  return material;
}
