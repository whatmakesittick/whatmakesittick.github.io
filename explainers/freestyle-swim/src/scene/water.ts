import {
  BackSide,
  Color,
  CylinderGeometry,
  DoubleSide,
  Mesh,
  PlaneGeometry,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import { THEME } from '../theme';
import type { PartContext } from './parts/context';
import { FLOOR_Y, HALF_EXTENT_M, LAYER, scrollOffset } from './parts/pool/constants';
import type { PoolFrame } from './parts/pool/constants';
import type { WaterCues } from './parts/pool/pool';
import {
  CAUSTIC_GLSL,
  FRAGMENT_HEAD,
  FRAGMENT_TAIL,
  WATER_GLSL,
  fogShader,
  waterUniforms,
} from './parts/pool/shaders';

const OPACITY_ABOVE = 0.24;
const OPACITY_UNDERWATER = 0.05;
const EASE_SECONDS = 0.4;
const SETTLED = 0.002;
const CONTACT = {
  head: { radius: 0.11, reach: 0.12 },
  hand: { radius: 0.045, reach: 0.06 },
  trunk: { radius: 0.12, depth: 0.1, reach: 0.16 },
} as const;
const CONTACT_COUNT = 4;
const KEY_LIGHT = new Vector3(0.35, 0.9, 0.3).normalize();
const VOLUME_SEGMENTS = 24;

const FRAGMENT = /* glsl */ `
${FRAGMENT_HEAD}
${WATER_GLSL}
${CAUSTIC_GLSL}
uniform float uOpacity;
uniform vec3 uSky;
uniform vec3 uLight;
uniform vec4 uEnds[${CONTACT_COUNT}];
uniform vec2 uReach[${CONTACT_COUNT}];

vec2 slopes(vec2 p) {
  vec2 g = vec2(0.0);
  for (int i = 0; i < 4; i++) {
    float n = float(i + 1);
    float kx = TAU * n / PERIOD;
    float zf = 1.7 + 0.6 * n;
    float zp = p.y * zf + n * 1.3 + n * uPhase;
    float s = kx * p.x + 1.2 * sin(zp) + n * 2.1;
    float footprint = fwidth(kx * p.x);
    float a = 0.0026 / n * (1.0 - smoothstep(0.08, 0.5, footprint));
    g += a * cos(s) * vec2(kx, 1.2 * zf * cos(zp));
  }
  return g;
}

float contactLine() {
  float sum = 0.0;
  for (int i = 0; i < ${CONTACT_COUNT}; i++) {
    vec2 a = uEnds[i].xy;
    vec2 ab = uEnds[i].zw - a;
    vec2 q = vWorld.xz - a;
    float t = clamp(dot(q, ab) / max(dot(ab, ab), 1e-5), 0.0, 1.0);
    float d = length(q - ab * t) - uReach[i].x;
    float line = exp(-d * d / 0.00012) + 0.3 * exp(-max(d, 0.0) * 40.0) * step(-0.003, d);
    sum += line * uReach[i].y * (i == 3 ? 0.55 : 1.0);
  }
  vec2 p = vec2(vWorld.x - uScroll, vWorld.z);
  float foam = 0.55 + 0.45 * sin(TAU * p.x / (PERIOD * 0.25) + 3.0 * sin(p.y * 31.0 + uPhase));
  return min(sum, 1.0) * foam;
}

void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float reach = length(cameraPosition - vWorld);
  float calm = smoothstep(0.05, 0.4, abs(v.y)) * (1.0 - smoothstep(3.0, 8.0, reach));
  vec2 g = slopes(vec2(vWorld.x - uScroll, vWorld.z)) * calm;
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  float shimmer = clamp(dot(g, vec2(0.8, 0.6)) * 9.0, -1.0, 1.0);
  float contact = contactLine();
  float presence = smoothstep(${OPACITY_UNDERWATER}, ${OPACITY_ABOVE}, uOpacity);
  vec3 col;
  float alpha;
  if (gl_FrontFacing) {
    float ndv = max(dot(n, v), 0.0);
    float far = smoothstep(1.0, 7.0, reach);
    float f = (0.02 + 0.98 * pow(1.0 - ndv, 5.0)) * mix(mix(0.3, 1.0, presence), 1.0, far);
    vec3 r = reflect(-v, n);
    vec3 ceiling = mix(uWaterLit, uSky, smoothstep(0.0, 0.6, r.y)) * (0.75 + 0.25 * shimmer);
    float glint = pow(max(dot(n, normalize(uLight + v)), 0.0), 320.0);
    float absorb = uOpacity * (0.55 + 0.45 * far) * (1.0 - 0.25 * shimmer);
    alpha = absorb + f - absorb * f;
    col = (uWaterDeep * absorb * (1.0 - f) + ceiling * f) / max(alpha, 0.001);
    col = mix(col, uSky, contact * 0.7) + uSky * glint * 0.6;
    alpha = max(alpha, contact * 0.6) + glint * 0.35;
  } else {
    float cosT = max(dot(-n, v), 0.0);
    float sinT = sqrt(1.0 - cosT * cosT);
    float tir = smoothstep(0.7, 0.77, sinT);
    float edge = exp(-pow((sinT - 0.745) / 0.035, 2.0));
    vec3 silver = mix(uWaterLit, uSky, 0.18);
    vec3 mirror = mix(silver, waterHorizon(), smoothstep(0.5, 6.0, reach));
    float light = caustic(vec2(vWorld.x - uScroll, vWorld.z) * 1.5);
    vec3 window = mix(uWaterLit, uSky, 0.5 + 0.5 * light);
    col = mix(window, mirror * (0.9 + 0.15 * shimmer), tir) + uSky * edge * 0.4;
    float open = mix(0.35, 0.55, presence) + 0.25 * light;
    alpha = mix(open, 0.92, tir) + edge * 0.3;
    col = mix(col, uSky, contact * 0.6);
    alpha = max(alpha, contact * 0.6);
  }
  gl_FragColor = vec4(col, min(alpha, 0.95));
${FRAGMENT_TAIL}`;

const VOLUME_FRAGMENT = /* glsl */ `
${FRAGMENT_HEAD}
${WATER_GLSL}
void main() {
  if (cameraPosition.y > 0.0) discard;
  vec3 ray = normalize(vWorld - cameraPosition);
  float depth = clamp(-vWorld.y / ${(-FLOOR_Y).toFixed(2)}, 0.0, 1.0);
  float down = 0.3 * depth - ray.y;
  vec3 col = down < 0.0 ? mix(waterHorizon(), uWaterLit, smoothstep(0.0, -0.6, down)) : mix(waterHorizon(), uWaterDeep, smoothstep(0.0, 0.6, down));
  gl_FragColor = vec4(col, 1.0);
  #include <colorspace_fragment>
}`;

export function createWaterSurface(context: PartContext, frame: PoolFrame): WaterSurface {
  return new WaterSurface(context, frame);
}

export function createWaterVolume(context: PartContext): Mesh {
  const height = -FLOOR_Y;
  const geometry = new CylinderGeometry(
    HALF_EXTENT_M,
    HALF_EXTENT_M,
    height,
    VOLUME_SEGMENTS,
    1,
    true,
  ).translate(0, FLOOR_Y + height / 2, 0);
  const material = fogShader(context, 'waterline', {
    fragment: VOLUME_FRAGMENT,
    side: BackSide,
    uniforms: waterUniforms(),
  });
  const mesh = new Mesh(context.tracker.track(geometry), material);
  mesh.frustumCulled = false;
  return mesh;
}

export class WaterSurface {
  readonly mesh: Mesh;
  private readonly frame: PoolFrame;
  private readonly material: ReturnType<typeof fogShader>;
  private readonly opacity = { value: OPACITY_ABOVE };
  private target = OPACITY_ABOVE;
  private readonly ends = Array.from({ length: CONTACT_COUNT }, () => new Vector4());
  private readonly reaches = Array.from({ length: CONTACT_COUNT }, () => new Vector2());
  private seen = false;

  constructor(context: PartContext, frame: PoolFrame) {
    this.frame = frame;
    this.material = fogShader(context, 'waterline', {
      side: DoubleSide,
      transparent: true,
      fragment: FRAGMENT,
      uniforms: {
        ...waterUniforms(),
        uScroll: frame.uScroll,
        uPhase: frame.uPhase,
        uOpacity: this.opacity,
        uSky: { value: new Color(THEME.splash) },
        uLight: { value: KEY_LIGHT },
        uEnds: { value: this.ends },
        uReach: { value: this.reaches },
      },
    });
    this.material.opacity = OPACITY_ABOVE;
    const size = HALF_EXTENT_M * 2;
    const geometry = context.tracker.track(new PlaneGeometry(size, size).rotateX(-Math.PI / 2));
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.renderOrder = LAYER.water;
    this.mesh.frustumCulled = false;
  }

  setState(underwater: boolean, scrollM: number): void {
    this.frame.uScroll.value = scrollOffset(scrollM);
    this.target = underwater ? OPACITY_UNDERWATER : OPACITY_ABOVE;
    if (!this.seen) {
      this.seen = true;
      this.apply(this.target);
    }
  }

  setContacts(cues: WaterCues): void {
    this.point(0, cues.head, CONTACT.head);
    this.point(1, cues.rightHand, CONTACT.hand);
    this.point(2, cues.leftHand, CONTACT.hand);
    const { radius, depth, reach } = CONTACT.trunk;
    const middle = (cues.chest.y + cues.hips.y) / 2;
    const strength = Math.max(1 - Math.abs(middle + depth) / reach, 0);
    this.ends[3].set(cues.hips.x, cues.hips.z, cues.chest.x, cues.chest.z);
    this.reaches[3].set(radius, strength);
  }

  update(deltaSeconds: number): boolean {
    const gap = this.target - this.opacity.value;
    if (Math.abs(gap) < SETTLED) {
      this.apply(this.target);
      return false;
    }
    const step = ((OPACITY_ABOVE - OPACITY_UNDERWATER) / EASE_SECONDS) * deltaSeconds;
    this.apply(this.opacity.value + Math.sign(gap) * Math.min(Math.abs(gap), step));
    return Math.abs(this.target - this.opacity.value) >= SETTLED;
  }

  private point(slot: number, at: Vector3, contact: { radius: number; reach: number }): void {
    const strength = Math.max(1 - Math.abs(at.y) / contact.reach, 0);
    this.ends[slot].set(at.x, at.z, at.x, at.z);
    this.reaches[slot].set(contact.radius, strength);
  }

  private apply(value: number): void {
    this.opacity.value = value;
    this.material.opacity = value;
  }
}
