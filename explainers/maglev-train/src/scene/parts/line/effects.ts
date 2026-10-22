import { Color } from 'three';
import type { Mesh } from 'three';
import { LINE_DRAW } from '../../constants';
import { THEME } from '../../../theme';
import type { PartContext } from '../context';
import { POWERED_STRIP, WAVE_HALO } from './effectConstants';
import { WAVE_GLSL } from './glsl';
import { ribbonMesh } from './ribbon';
import type { WaveUniforms } from './waveUniforms';

const SPAN = [-LINE_DRAW.behind, LINE_DRAW.ahead] as const;
const glslFloat = (value: number) => value.toFixed(4);

const POWERED_FRAGMENT = /* glsl */ `
${WAVE_GLSL}
uniform vec3 uGlow;

void main() {
  float across = 1.0 - vAcross * vAcross;
  float core = smoothstep(0.86, 1.0, across);
  float alpha = uOpacity * across * across * sectionMask(vX) * fogFade();
  vec3 colour = mix(uGlow, vec3(1.0), core * ${glslFloat(POWERED_STRIP.core)}) * uTint;
  gl_FragColor = vec4(colour, alpha);
  #include <colorspace_fragment>
}
`;

const HALO_FRAGMENT = /* glsl */ `
${WAVE_GLSL}

void main() {
  float across = 1.0 - vAcross * vAcross;
  float alpha = uOpacity * pow(across, 1.5) * sectionMask(vX) * fogFade();
  gl_FragColor = vec4(waveBand(vX) * uTint, alpha);
  #include <colorspace_fragment>
}
`;

export function poweredStripMesh(context: PartContext, wave: WaveUniforms): Mesh {
  const mesh = ribbonMesh(context, {
    group: 'poweredSection',
    lane: POWERED_STRIP,
    span: SPAN,
    opacity: POWERED_STRIP.opacity,
    fragment: POWERED_FRAGMENT,
    uniforms: { ...wave, uGlow: { value: new Color(THEME.powered) } },
  });
  mesh.name = 'poweredSection';
  return mesh;
}

export function waveHaloMesh(context: PartContext, wave: WaveUniforms): Mesh {
  const mesh = ribbonMesh(context, {
    group: 'travellingWave',
    lane: WAVE_HALO,
    span: SPAN,
    opacity: WAVE_HALO.opacity,
    fragment: HALO_FRAGMENT,
    uniforms: wave,
  });
  mesh.name = 'travellingWave';
  return mesh;
}
