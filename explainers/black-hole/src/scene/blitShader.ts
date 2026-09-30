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

void main() {
  vec3 light = texture2D(uImage, vUv).rgb;
  gl_FragColor = vec4(light * uExposure, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
