export const LENS_VERTEX = /* glsl */ `
varying vec2 vClip;

void main() {
  vClip = position.xy;
  gl_Position = vec4(position.xy, 1.0, 1.0);
}
`;

const NOISE = /* glsl */ `
float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}

float hash2(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash2(i), hash2(i + vec2(1.0, 0.0)), u.x),
             mix(hash2(i + vec2(0.0, 1.0)), hash2(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int octave = 0; octave < 4; octave++) {
    value += amplitude * noise(p);
    p *= 2.03;
    amplitude *= 0.5;
  }
  return value;
}

float ringNoise(vec2 p, float period) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float near = mod(i.y, period);
  float far = mod(i.y + 1.0, period);
  return mix(mix(hash2(vec2(i.x, near)), hash2(vec2(i.x + 1.0, near)), u.x),
             mix(hash2(vec2(i.x, far)), hash2(vec2(i.x + 1.0, far)), u.x), u.y);
}

float ringFbm(float radial, float turn, float bands, float streaks) {
  float value = 0.0;
  float amplitude = 0.5;
  float scale = 1.0;
  for (int octave = 0; octave < 4; octave++) {
    float period = streaks * scale;
    value += amplitude * ringNoise(vec2(radial * bands * scale, turn * period), period);
    scale *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
`;

const STARS = /* glsl */ `
const float STAR_CELLS = 700.0;
const float STAR_THRESHOLD = 0.9972;
const vec3 BAND_NORMAL = normalize(vec3(0.35, 1.0, 0.5));

vec3 starField(vec3 direction) {
  vec3 cell = floor(direction * STAR_CELLS);
  float seed = hash(cell);
  float star = step(STAR_THRESHOLD, seed);
  float brightness = pow(max(seed - STAR_THRESHOLD, 0.0) / (1.0 - STAR_THRESHOLD), 2.0);
  vec3 tint = mix(vec3(1.0, 0.82, 0.68), vec3(0.72, 0.84, 1.0), hash(cell + 7.0));
  vec3 colour = tint * star * (0.25 + 2.2 * brightness);
  float band = exp(-pow(dot(direction, BAND_NORMAL) * 3.2, 2.0));
  vec2 sheet = vec2(atan(direction.z, direction.x) * 3.0, dot(direction, BAND_NORMAL) * 6.0);
  float cloud = fbm(sheet);
  colour += vec3(0.28, 0.32, 0.5) * band * (0.15 + 0.85 * cloud) * 0.32;
  return colour;
}
`;

const DISC = /* glsl */ `
uniform float uTime;
uniform float uDiscInner;
uniform float uDiscOuter;

const float HORIZON = 1.0;
const float SPEED_CAP = 0.72;
const float SWIRL_RATE = 0.1;
const float TWO_PI = 6.28318530718;
const float BAND_DENSITY = 28.0;
const float STREAK_COUNT = 6.0;
const float GRAIN_DENSITY = 120.0;
const float GRAIN_STREAKS = 24.0;
const float EMISSION = 5.0;
const float INNER_KELVIN = 6500.0;
const float COOLING = 0.9;
const float KELVIN_MIN = 1000.0;
const float KELVIN_MAX = 15000.0;
const mat3 XYZ_TO_RGB = mat3(
  3.2404542, -0.969266, 0.0556434,
  -1.5371385, 1.8760108, -0.2040259,
  -0.4985314, 0.041556, 1.0572252
);

// Krystek's fit of the Planckian locus: https://en.wikipedia.org/wiki/Planckian_locus#Approximation
vec3 blackbodyColour(float kelvin) {
  float t = clamp(kelvin, KELVIN_MIN, KELVIN_MAX);
  float u = (0.860117757 + 1.54118254e-4 * t + 1.28641212e-7 * t * t)
    / (1.0 + 8.42420235e-4 * t + 7.08145163e-7 * t * t);
  float v = (0.317398726 + 4.22806245e-5 * t + 4.20481691e-8 * t * t)
    / (1.0 - 2.89741816e-5 * t + 1.61456053e-7 * t * t);
  vec2 xy = vec2(3.0 * u, 2.0 * v) / (2.0 * u - 8.0 * v + 4.0);
  vec3 xyz = vec3(xy.x, xy.y, 1.0 - xy.x - xy.y) / xy.y;
  return max(XYZ_TO_RGB * xyz, 0.0);
}

float shiftFactor(vec3 hit, vec3 rayDirection, float radius) {
  float speed = min(sqrt(0.5 / max(radius - HORIZON, 0.01)), SPEED_CAP);
  vec3 tangent = normalize(vec3(-hit.z, 0.0, hit.x));
  float gamma = 1.0 / sqrt(1.0 - speed * speed);
  float doppler = 1.0 / (gamma * (1.0 - speed * dot(tangent, -rayDirection)));
  float gravity = sqrt(max(1.0 - HORIZON / radius, 0.0));
  return doppler * gravity;
}

float discTexture(float radius, float angle) {
  float omega = SWIRL_RATE / pow(radius, 1.5);
  float turn = (angle - uTime * omega) / TWO_PI;
  float radial = log(radius);
  float streaks = ringFbm(radial, turn, BAND_DENSITY, STREAK_COUNT);
  float grain = ringNoise(vec2(radial * GRAIN_DENSITY, turn * GRAIN_STREAKS), GRAIN_STREAKS);
  return 0.35 + 0.65 * streaks * (0.6 + 0.4 * grain);
}

vec4 discSample(vec3 hit, vec3 rayDirection) {
  float radius = length(hit.xz);
  float angle = atan(hit.z, hit.x);
  float inner = smoothstep(uDiscInner, uDiscInner + 0.5, radius);
  float outer = 1.0 - smoothstep(uDiscOuter - 4.5, uDiscOuter, radius);
  float profile = pow(uDiscInner / radius, 2.2);
  float texture = discTexture(radius, angle);
  float emission = EMISSION * profile * texture * inner * outer;
  float shift = shiftFactor(hit, rayDirection, radius);
  float kelvin = INNER_KELVIN * pow(uDiscInner / radius, COOLING) * shift;
  float boost = pow(shift, 3.0);
  float density = (0.6 + 0.4 * texture) * inner * outer;
  return vec4(blackbodyColour(kelvin) * emission * boost, density);
}
`;

export const LENS_FRAGMENT = /* glsl */ `
uniform float uDisc;
uniform float uBending;
uniform int uMaxSteps;
uniform vec3 uCameraPosition;
uniform mat4 uInverseProjection;
uniform mat4 uCameraToWorld;
varying vec2 vClip;

${NOISE}
${STARS}
${DISC}

const float ESCAPE_RADIUS = 60.0;
const float STEP_SCALE = 0.045;
const float STEP_MIN = 0.015;
const float STEP_MAX = 0.9;
const float BENDING = 1.5;

struct Ray {
  vec3 position;
  vec3 velocity;
  bool captured;
  vec3 light;
  float transmit;
};

bool insideDisc(vec3 hit) {
  float radius = length(hit.xz);
  return radius > uDiscInner && radius < uDiscOuter;
}

void crossDisc(inout Ray ray, vec3 from, vec3 to, vec3 direction) {
  if (uDisc < 0.5 || from.y * to.y >= 0.0) return;
  vec3 hit = mix(from, to, from.y / (from.y - to.y));
  if (!insideDisc(hit)) return;
  vec4 disc = discSample(hit, direction);
  ray.light += ray.transmit * disc.rgb;
  ray.transmit *= 1.0 - disc.a;
}

Ray trace(vec3 origin, vec3 direction) {
  Ray ray = Ray(origin, direction, false, vec3(0.0), 1.0);
  vec3 angular = cross(origin, direction);
  float h2 = dot(angular, angular) * uBending;
  bool bent = uBending > 0.5;
  for (int i = 0; i < uMaxSteps; i++) {
    float r2 = dot(ray.position, ray.position);
    float radius = sqrt(r2);
    if (bent && radius < HORIZON) { ray.captured = true; break; }
    if (radius > ESCAPE_RADIUS && dot(ray.position, ray.velocity) > 0.0) break;
    float dt = clamp(radius * STEP_SCALE, STEP_MIN, STEP_MAX);
    vec3 acceleration = -BENDING * h2 * ray.position / (r2 * r2 * radius);
    vec3 nextVelocity = ray.velocity + acceleration * dt;
    vec3 nextPosition = ray.position + nextVelocity * dt;
    crossDisc(ray, ray.position, nextPosition, normalize(nextVelocity));
    ray.position = nextPosition;
    ray.velocity = nextVelocity;
  }
  return ray;
}

vec3 viewDirection() {
  vec4 view = uInverseProjection * vec4(vClip, 1.0, 1.0);
  return normalize((uCameraToWorld * vec4(view.xyz / view.w, 0.0)).xyz);
}

void main() {
  Ray ray = trace(uCameraPosition, viewDirection());
  vec3 colour = ray.light;
  if (!ray.captured) colour += ray.transmit * starField(normalize(ray.velocity));
  gl_FragColor = vec4(colour, 1.0);
}
`;
