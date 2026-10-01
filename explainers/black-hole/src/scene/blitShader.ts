export const BLIT_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

export const BLIT_FRAGMENT = /* glsl */ `
uniform sampler2D uImage;
uniform float uExposure;
varying vec2 vUv;

const float GRAIN = 0.012;
const float VIGNETTE = 0.28;
const float VIGNETTE_START = 0.45;
const float VIGNETTE_END = 1.15;
const float HALF_DIAGONAL = 0.70710678;

float grain(vec2 pixel) {
  return fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
}

float vignette(vec2 uv) {
  float edge = length(uv - 0.5) / HALF_DIAGONAL;
  return 1.0 - VIGNETTE * smoothstep(VIGNETTE_START, VIGNETTE_END, edge);
}

void main() {
  vec3 light = texture2D(uImage, vUv).rgb;
  gl_FragColor = vec4(light * uExposure * vignette(vUv), 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  gl_FragColor.rgb += GRAIN * grain(gl_FragCoord.xy);
}
`;
