export const BLIT_VERTEX = /* glsl */ `
varying vec2 vUv;

void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

export const BLIT_FRAGMENT = /* glsl */ `
uniform sampler2D uImage;
varying vec2 vUv;

void main() {
  gl_FragColor = texture2D(uImage, vUv);
  #include <colorspace_fragment>
}
`;
