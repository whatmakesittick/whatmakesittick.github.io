export const NOISE_GLSL = /* glsl */ `
const float TAU = 6.2831853;
const float WRAP = 2880.0;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float cellNoise(vec2 p, float period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float x0 = mod(i.x, period);
  float x1 = mod(i.x + 1.0, period);
  float a = hash12(vec2(x0, i.y));
  float b = hash12(vec2(x1, i.y));
  float c = hash12(vec2(x0, i.y + 1.0));
  float d = hash12(vec2(x1, i.y + 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float roadU(float x, float scroll) {
  return mod(x + scroll, WRAP);
}
`;

export const ATMOSPHERE_GLSL = /* glsl */ `
uniform vec3 uSunDir;
uniform vec3 uSkyTop;
uniform vec3 uSkyHorizon;
uniform vec3 uSkyAway;
uniform vec3 uSunGlow;
uniform vec2 uHaze;

vec3 skyAt(vec3 dir) {
  float up = clamp(dir.y, 0.0, 1.0);
  vec2 bearing = normalize(dir.xz + vec2(1e-5));
  float sunward = dot(bearing, normalize(uSunDir.xz)) * 0.5 + 0.5;
  vec3 horizon = mix(uSkyAway, uSkyHorizon, pow(sunward, 3.0));
  vec3 sky = mix(horizon, uSkyTop, pow(up, 0.5));
  float toward = max(dot(dir, uSunDir), 0.0);
  float low = 1.0 - smoothstep(0.0, 0.25, up);
  return sky + uSunGlow * (pow(toward, 8.0) * 0.12 * (0.4 + 0.6 * low) + pow(toward, 64.0) * 0.5 + pow(toward, 900.0) * 1.6);
}

vec3 horizonAt(vec3 ray) {
  return skyAt(normalize(vec3(ray.x, 0.0, ray.z)));
}

float hazeAt(float distance) {
  float haze = 1.0 - exp(-distance / uHaze.x);
  return max(haze, smoothstep(uHaze.y * 0.6, uHaze.y, distance));
}

vec3 hazed(vec3 colour, vec3 world) {
  vec3 ray = world - cameraPosition;
  return mix(colour, horizonAt(ray), hazeAt(length(ray)));
}
`;

export const LIGHT_GLSL = /* glsl */ `
uniform vec3 uSunLight;
uniform vec3 uSkyLight;
uniform vec3 uBounceLight;

vec3 sunTerm(vec3 normal) {
  return uSunLight * max(dot(normal, uSunDir), 0.0);
}

vec3 ambientTerm(vec3 normal) {
  float sky = 0.5 + 0.5 * normal.y;
  return uSkyLight * sky + uBounceLight * (1.0 - sky);
}

vec3 lit(vec3 albedo, vec3 normal, float sunShare) {
  return albedo * (sunTerm(normal) * sunShare + ambientTerm(normal));
}
`;

export const OUTPUT_GLSL = /* glsl */ `
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
`;

export const WORLD_VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;

void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  #ifdef USE_INSTANCING
    world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  #endif
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix) * normal);
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;
