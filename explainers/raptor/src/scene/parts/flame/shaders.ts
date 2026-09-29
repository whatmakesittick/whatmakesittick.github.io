const NOISE = /* glsl */ `
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 3; octave++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}
`;

export const PLUME_VERTEX = /* glsl */ `
uniform float uLength;
uniform float uExitRadius;
uniform float uSpread;
uniform float uWaist;
uniform float uSpacing;
uniform float uGrowth;

varying float vShare;
varying float vDistance;
varying float vAngle;
varying vec3 vNormalView;
varying vec3 vViewPosition;

const float PI = 3.141592653589793;

void main() {
  float share = clamp(-position.y, 0.0, 1.0);
  float distance = share * uLength;
  float pinch = 1.0 - (1.0 - uWaist) * pow(sin(PI * distance / uSpacing), 2.0) * (1.0 - share);
  float radius = uExitRadius * pinch + distance * uSpread + uExitRadius * uGrowth * share;
  vec3 local = vec3(position.x * radius, -distance, position.z * radius);
  vec3 localNormal = normalize(vec3(position.x, uSpread + uGrowth * uExitRadius / max(uLength, 1.0), position.z));
  vec4 world = vec4(local, 1.0);
  #ifdef USE_INSTANCING
    world = instanceMatrix * world;
    localNormal = mat3(instanceMatrix) * localNormal;
  #endif
  vec4 view = modelViewMatrix * world;
  vViewPosition = -view.xyz;
  vNormalView = normalize(normalMatrix * localNormal);
  vShare = share;
  vDistance = distance;
  vAngle = atan(position.z, position.x);
  gl_Position = projectionMatrix * view;
}
`;

export const PLUME_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uSpread;
uniform float uBrightness;
uniform float uSpacing;
uniform float uAir;
uniform float uOpacity;
uniform vec3 uCore;
uniform vec3 uSheath;
uniform vec3 uFlame;

varying float vShare;
varying float vDistance;
varying float vAngle;
varying vec3 vNormalView;
varying vec3 vViewPosition;

${NOISE}

void main() {
  vec3 normal = normalize(vNormalView);
  vec3 toCamera = normalize(vViewPosition);
  float facing = abs(dot(normal, toCamera));
  float body = pow(facing, 1.3);
  float rim = pow(1.0 - facing, 2.0);
  float share = vShare;
  float tail = 1.0 - smoothstep(0.3, 1.0, share);
  float exitCore = exp(-share * 16.0);
  float warm = exp(-share * 3.5);
  vec2 flow = vec2(vAngle * 1.6, vDistance * 0.01 - uTime * 7.0);
  float turbulence = fbm(flow);
  float streaks = fbm(vec2(vAngle * 5.0, vDistance * 0.004 - uTime * 11.0));
  float flicker = 0.75 + 0.5 * turbulence;
  vec3 colour = mix(uSheath, uCore, clamp(0.7 * exitCore + 0.3 * warm * body, 0.0, 1.0));
  float thinning = 1.0 / (1.0 + 2.5 * uSpread);
  float glow = (0.04 + 0.16 * warm + 0.35 * exitCore) * body * tail * flicker * thinning;
  vec3 light = colour * glow;
  light += uFlame * rim * tail * (0.1 + 0.25 * streaks) * (0.25 + 0.75 * uAir) * flicker * thinning;
  float head = smoothstep(0.0, 0.004, share);
  gl_FragColor = vec4(light * uBrightness * uOpacity * head, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const FLAME_VERTEX = /* glsl */ `
varying float vShare;
varying float vAngle;
varying vec3 vNormalView;
varying vec3 vViewPosition;

void main() {
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -view.xyz;
  vNormalView = normalize(normalMatrix * normal);
  vShare = 1.0 - uv.y;
  vAngle = uv.x * 6.283185307179586;
  gl_Position = projectionMatrix * view;
}
`;

export const FLAME_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform float uIntensity;
uniform vec3 uHot;
uniform vec3 uMid;
uniform vec3 uCool;

varying float vShare;
varying float vAngle;
varying vec3 vNormalView;
varying vec3 vViewPosition;

${NOISE}

void main() {
  float facing = abs(dot(normalize(vNormalView), normalize(vViewPosition)));
  float turbulence = fbm(vec2(vAngle * 2.0, vShare * 6.0 - uTime * 9.0));
  float heat = exp(-vShare * 2.6);
  vec3 colour = vShare < 0.35
    ? mix(uHot, uMid, vShare / 0.35)
    : mix(uMid, uCool, clamp((vShare - 0.35) / 0.65, 0.0, 1.0));
  float intensity = (0.06 + 0.42 * heat) * pow(facing, 1.8) * (0.55 + 0.9 * turbulence);
  gl_FragColor = vec4(colour * intensity * uIntensity, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export const DIAMOND_VERTEX = /* glsl */ `
varying vec2 vPlace;
varying float vStrength;

void main() {
  mat4 frame = modelMatrix;
  vStrength = 1.0;
  #ifdef USE_INSTANCING
    frame = modelMatrix * instanceMatrix;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vStrength = instanceColor.r;
  #endif
  vec3 centre = (frame * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 along = (frame * vec4(0.0, 1.0, 0.0, 0.0)).xyz;
  float width = length((frame * vec4(1.0, 0.0, 0.0, 0.0)).xyz);
  vec3 toCamera = normalize(cameraPosition - centre);
  vec3 side = normalize(cross(normalize(along), toCamera)) * width;
  vec3 world = centre + along * position.y + side * position.x;
  vPlace = position.xy * 2.0;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

export const DIAMOND_FRAGMENT = /* glsl */ `
uniform float uTime;
uniform vec3 uColour;

varying vec2 vPlace;
varying float vStrength;

void main() {
  float taper = max(0.0, 1.0 - vPlace.y * vPlace.y);
  float across = vPlace.x / max(taper, 0.04);
  float glow = pow(taper, 1.5) * exp(-across * across * 1.8);
  float shimmer = 0.9 + 0.1 * sin(uTime * 37.0 + vPlace.y * 3.0);
  gl_FragColor = vec4(uColour * glow * vStrength * shimmer * 0.3, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;
