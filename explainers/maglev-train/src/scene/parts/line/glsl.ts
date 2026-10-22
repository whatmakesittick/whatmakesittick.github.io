export const WAVE_GLSL = /* glsl */ `
uniform float uBandShift;
uniform float uWavelength;
uniform vec3 uPhaseA;
uniform vec3 uPhaseB;
uniform vec3 uPhaseC;
uniform vec4 uSection;
uniform float uWaveOn;

vec3 waveBand(float x) {
  float p = (x - uBandShift) / uWavelength * 3.0;
  float f = fract(p);
  float i = mod(floor(p), 3.0);
  vec3 a = i < 0.5 ? uPhaseA : (i < 1.5 ? uPhaseB : uPhaseC);
  vec3 b = i < 0.5 ? uPhaseB : (i < 1.5 ? uPhaseC : uPhaseA);
  float fw = fwidth(p);
  vec3 band = mix(a, b, smoothstep(0.62 - fw, 1.0, f));
  return mix(band, (uPhaseA + uPhaseB + uPhaseC) / 3.0, smoothstep(0.35, 1.2, fw));
}

float sectionMask(float x) {
  float start = smoothstep(uSection.x, uSection.x + uSection.z, x);
  float end = 1.0 - smoothstep(uSection.y - uSection.w, uSection.y, x);
  return start * end;
}
`;

export const RIBBON_VERTEX = /* glsl */ `
attribute float aAcross;
uniform float uHalfHeight;
varying float vAcross;
varying float vX;
varying float vDepth;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vec2 toCamera = cameraPosition.yz - world.yz;
  vec2 up = normalize(vec2(toCamera.y, -toCamera.x) + vec2(1e-5, 0.0));
  up *= up.x < 0.0 ? -1.0 : 1.0;
  world.yz += up * aAcross * uHalfHeight;
  vAcross = aAcross;
  vX = world.x;
  vec4 view = viewMatrix * world;
  vDepth = -view.z;
  gl_Position = projectionMatrix * view;
}
`;

export const RIBBON_FRAGMENT_HEAD = /* glsl */ `
uniform vec3 uTint;
uniform float uOpacity;
uniform float uCutX;
uniform float fogNear;
uniform float fogFar;
varying float vAcross;
varying float vX;
varying float vDepth;

float fogFade() {
  return 1.0 - smoothstep(fogNear, fogFar, vDepth);
}

bool beyondCut() {
  return vX > uCutX;
}
`;
