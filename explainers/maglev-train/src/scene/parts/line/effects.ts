import { glslFloat } from '../shaderChunks';
import { POWERED_STRIP } from './effectConstants';
import { WAVE_GLSL } from './glsl';

export const POWERED_FRAGMENT = /* glsl */ `
${WAVE_GLSL}
uniform vec3 uGlow;

void main() {
  if (beyondCut()) discard;
  float across = 1.0 - abs(vAcross);
  float core = smoothstep(${glslFloat(POWERED_STRIP.coreFrom)}, ${glslFloat(POWERED_STRIP.coreTo)}, across);
  float glow = max(core, across * across * ${glslFloat(POWERED_STRIP.wash)});
  float alpha = uOpacity * glow * sectionMask(vX) * fogFade();
  vec3 colour = mix(uGlow, vec3(1.0), core * ${glslFloat(POWERED_STRIP.core)}) * uTint;
  gl_FragColor = vec4(colour, alpha);
  #include <colorspace_fragment>
}
`;

export const HALO_FRAGMENT = /* glsl */ `
${WAVE_GLSL}

void main() {
  if (beyondCut()) discard;
  float across = 1.0 - vAcross * vAcross;
  float alpha = uOpacity * pow(across, 1.5) * sectionMask(vX) * fogFade();
  gl_FragColor = vec4(waveBand(vX) * uTint, alpha);
  #include <colorspace_fragment>
}
`;
