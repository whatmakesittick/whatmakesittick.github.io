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
`;

const STARS = /* glsl */ `
const float STAR_CELLS = 700.0;
const float STAR_THRESHOLD = 0.9972;
const vec3 BAND_NORMAL = normalize(vec3(0.35, 1.0, 0.5));

vec3 starField(vec3 direction) {
  vec3 cell = floor(direction * STAR_CELLS);
  float seed = hash(cell);
  float star = step(STAR_THRESHOLD, seed);
  float brightness = pow((seed - STAR_THRESHOLD) / (1.0 - STAR_THRESHOLD), 2.0);
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
const float HEAT_SPREAD = 1.4;
const vec3 HOT = vec3(1.0, 0.98, 0.95);
const vec3 COOL = vec3(1.0, 0.42, 0.1);
const vec3 BLUE_SHIFT = vec3(0.72, 0.82, 1.0);
const vec3 RED_SHIFT = vec3(1.0, 0.32, 0.12);

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
  float swirl = angle - uTime * omega;
  float radial = log(radius);
  float streaks = fbm(vec2(radial * 9.0, swirl * 2.4));
  float grain = noise(vec2(radial * 34.0, swirl * 7.0));
  return 0.35 + 0.65 * streaks * (0.6 + 0.4 * grain);
}

vec4 discSample(vec3 hit, vec3 rayDirection) {
  float radius = length(hit.xz);
  float angle = atan(hit.z, hit.x);
  float inner = smoothstep(uDiscInner, uDiscInner + 0.5, radius);
  float outer = 1.0 - smoothstep(uDiscOuter - 4.5, uDiscOuter, radius);
  float profile = pow(uDiscInner / radius, 2.2);
  float texture = discTexture(radius, angle);
  float emission = 2.4 * profile * texture * inner * outer;
  vec3 base = mix(COOL, HOT, clamp(pow(profile, HEAT_SPREAD), 0.0, 1.0));
  float shift = shiftFactor(hit, rayDirection, radius);
  vec3 tint = shift > 1.0
    ? mix(base, BLUE_SHIFT, clamp((shift - 1.0) * 1.6, 0.0, 0.7))
    : mix(base, RED_SHIFT, clamp((1.0 - shift) * 1.6, 0.0, 0.85));
  float boost = pow(shift, 3.0);
  float density = (0.6 + 0.4 * texture) * inner * outer;
  return vec4(tint * emission * boost, density);
}
`;

const GLOW = /* glsl */ `
const float PHOTON_SPHERE = 1.5;
const float RING_WIDTH = 0.03;
const float RING_STRENGTH = 0.6;
const vec3 RING_COLOUR = vec3(1.0, 0.9, 0.75);
vec3 photonRing(float closest) {
  float offset = (closest - PHOTON_SPHERE) / RING_WIDTH;
  return RING_COLOUR * RING_STRENGTH * exp(-offset * offset);
}
`;

export const LENS_FRAGMENT = /* glsl */ `
uniform float uDisc;
uniform float uBending;
uniform float uExposure;
uniform int uMaxSteps;
uniform vec3 uCameraPosition;
uniform mat4 uInverseProjection;
uniform mat4 uCameraToWorld;
varying vec2 vClip;

${NOISE}
${STARS}
${DISC}
${GLOW}

const float ESCAPE_RADIUS = 60.0;
const float STEP_SCALE = 0.045;
const float STEP_MIN = 0.015;
const float STEP_MAX = 0.9;
const float BENDING = 1.5;

struct Ray {
  vec3 position;
  vec3 velocity;
  bool captured;
  int hits;
  vec3 firstHit;
  vec3 firstDirection;
  vec3 secondHit;
  vec3 secondDirection;
  float closest;
};

bool insideDisc(vec3 hit) {
  float radius = length(hit.xz);
  return radius > uDiscInner && radius < uDiscOuter;
}

void recordHit(inout Ray ray, vec3 from, vec3 to, vec3 direction) {
  if (from.y * to.y >= 0.0 || ray.hits >= 2) return;
  vec3 hit = mix(from, to, from.y / (from.y - to.y));
  if (!insideDisc(hit)) return;
  if (ray.hits == 0) {
    ray.firstHit = hit;
    ray.firstDirection = direction;
  } else {
    ray.secondHit = hit;
    ray.secondDirection = direction;
  }
  ray.hits++;
}

Ray trace(vec3 origin, vec3 direction) {
  Ray ray = Ray(origin, direction, false, 0, vec3(0.0), vec3(0.0), vec3(0.0), vec3(0.0), ESCAPE_RADIUS);
  vec3 angular = cross(origin, direction);
  float h2 = dot(angular, angular) * uBending;
  bool bent = uBending > 0.5;
  for (int i = 0; i < uMaxSteps; i++) {
    float r2 = dot(ray.position, ray.position);
    float radius = sqrt(r2);
    ray.closest = min(ray.closest, radius);
    if (bent && radius < HORIZON) { ray.captured = true; break; }
    if (radius > ESCAPE_RADIUS && dot(ray.position, ray.velocity) > 0.0) break;
    float dt = clamp(radius * STEP_SCALE, STEP_MIN, STEP_MAX);
    vec3 acceleration = -BENDING * h2 * ray.position / (r2 * r2 * radius);
    vec3 nextVelocity = ray.velocity + acceleration * dt;
    vec3 nextPosition = ray.position + nextVelocity * dt;
    recordHit(ray, ray.position, nextPosition, normalize(nextVelocity));
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
  vec3 colour = vec3(0.0);
  float transmit = 1.0;
  if (uDisc > 0.5 && ray.hits > 0) {
    vec4 first = discSample(ray.firstHit, ray.firstDirection);
    colour += first.rgb;
    transmit = 1.0 - first.a;
  }
  if (uDisc > 0.5 && ray.hits > 1) {
    vec4 second = discSample(ray.secondHit, ray.secondDirection);
    colour += transmit * second.rgb;
    transmit *= 1.0 - second.a;
  }
  if (!ray.captured) colour += transmit * starField(normalize(ray.velocity));
  if (uDisc > 0.5 && !ray.captured) colour += uBending * photonRing(ray.closest);
  gl_FragColor = vec4(1.0 - exp(-colour * uExposure), 1.0);
}
`;
