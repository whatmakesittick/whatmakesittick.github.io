import { Color } from 'three';
import type { Material, WebGLProgramParametersWithUniforms } from 'three';
import { THEME } from '../../../../theme';
import { SKY_COLOURS } from '../../land/atmosphere';

const SHEEN = {
  ground: '#2b231e',
  strength: 0.85,
  facing: 0.18,
  edgePower: 3,
  horizonBand: 0.12,
} as const;

const HEAD = /* glsl */ `
uniform vec3 uLensSky;
uniform vec3 uLensHorizon;
uniform vec3 uLensGround;
`;

const SHEEN_GLSL = /* glsl */ `
{
  vec3 toEye = normalize(vViewPosition);
  vec3 bounced = inverseTransformDirection(reflect(-toEye, normal), viewMatrix);
  float up = bounced.y;
  vec3 sky = mix(uLensHorizon, uLensSky, smoothstep(0.0, 0.7, up));
  vec3 seen = mix(uLensGround, sky, smoothstep(-${SHEEN.horizonBand}, 0.02, up));
  float edge = pow(1.0 - clamp(dot(normal, toEye), 0.0, 1.0), ${SHEEN.edgePower.toFixed(1)});
  totalEmissiveRadiance += seen * ${SHEEN.strength} * (${SHEEN.facing} + (1.0 - ${SHEEN.facing}) * edge);
}
`;

function inject(source: string, anchor: string, addition: string): string {
  if (!source.includes(anchor)) throw new Error(`Shader anchor missing: ${anchor}`);
  return source.replace(anchor, `${anchor}\n${addition}`);
}

function patch(shader: WebGLProgramParametersWithUniforms): void {
  shader.uniforms.uLensSky = { value: new Color(THEME.skyTop) };
  shader.uniforms.uLensHorizon = { value: new Color(SKY_COLOURS.horizon) };
  shader.uniforms.uLensGround = { value: new Color(SHEEN.ground) };
  shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', HEAD);
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <emissivemap_fragment>',
    SHEEN_GLSL,
  );
}

const patched = new WeakSet<Material>();

export function applyLensSheen<M extends Material>(material: M): M {
  if (patched.has(material)) return material;
  patched.add(material);
  const compile = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    patch(shader);
  };
  material.customProgramCacheKey = () => `${cacheKey()}|lensSheen`;
  material.needsUpdate = true;
  return material;
}
