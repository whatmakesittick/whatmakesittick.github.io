import { Color, DoubleSide, Mesh, PlaneGeometry, Vector3, Vector4 } from 'three';
import { THEME } from '../theme';
import type { PartContext } from './parts/context';
import { HALF_EXTENT_M, LAYER, scrollOffset } from './parts/pool/constants';
import type { PoolFrame } from './parts/pool/constants';
import type { WaterCues } from './parts/pool/pool';
import { FRAGMENT_HEAD, FRAGMENT_TAIL, fogShader } from './parts/pool/shaders';

const OPACITY_ABOVE = 0.4;
const OPACITY_UNDERWATER = 0.1;
const EASE_SECONDS = 0.4;
const SETTLED = 0.002;
const CONTACT_RADIUS_M = { head: 0.11, hand: 0.05 } as const;
const CONTACT_REACH_M = { head: 0.12, hand: 0.06 } as const;
const CONTACT_COUNT = 3;
const KEY_LIGHT = new Vector3(0.35, 0.9, 0.3).normalize();

const FRAGMENT = /* glsl */ `
${FRAGMENT_HEAD}
uniform float uOpacity;
uniform vec3 uTint;
uniform vec3 uClear;
uniform vec3 uSky;
uniform vec3 uLight;
uniform vec4 uContacts[${CONTACT_COUNT}];

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

void main() {
  vec3 v = normalize(cameraPosition - vWorld);
  float reach = length(cameraPosition - vWorld);
  float calm = smoothstep(0.05, 0.4, abs(v.y)) * (1.0 - smoothstep(3.0, 8.0, reach));
  vec2 g = slopes(vec2(vWorld.x - uScroll, vWorld.z)) * calm;
  vec3 n = normalize(vec3(-g.x, 1.0, -g.y));
  vec3 col;
  float alpha;
  if (gl_FrontFacing) {
    float ndv = max(dot(n, v), 0.0);
    float f = 0.03 + 0.97 * pow(1.0 - ndv, 3.2);
    float glint = pow(max(dot(n, normalize(uLight + v)), 0.0), 240.0);
    float far = smoothstep(1.0, 6.5, reach);
    float lens = clamp(dot(g, vec2(0.8, 0.6)) * 7.0, -0.35, 0.35);
    vec3 body = mix(uClear, uTint, 0.45 + 0.5 * far) * (1.0 + lens);
    float contact = 0.0;
    for (int i = 0; i < ${CONTACT_COUNT}; i++) {
      vec4 c = uContacts[i];
      contact += exp(-pow((distance(vWorld.xz, c.xy) - c.w) / 0.016, 2.0)) * c.z;
    }
    contact = min(contact, 1.0);
    col = mix(body, uSky, f * 0.85) + uSky * glint * 0.9;
    col = mix(col, uSky, contact * 0.55);
    alpha = uOpacity + f * 0.45 + glint * 0.5 + contact * 0.35;
  } else {
    float cosT = max(dot(-n, v), 0.0);
    float sinT = sqrt(1.0 - cosT * cosT);
    float tir = smoothstep(0.66, 0.76, sinT);
    float edge = exp(-pow((sinT - 0.74) / 0.05, 2.0));
    float ripple = clamp(length(g) * 5.0, 0.0, 1.0);
    col = mix(uTint, uClear, 0.35 + 0.3 * tir + 0.2 * ripple) + uSky * edge * 0.3;
    alpha = mix(0.02 + 0.07 * ripple + 0.2 * uOpacity, 0.55, tir) + edge * 0.2;
  }
  gl_FragColor = vec4(col, min(alpha, 0.92));
${FRAGMENT_TAIL}`;

export function createWaterSurface(context: PartContext, frame: PoolFrame): WaterSurface {
  return new WaterSurface(context, frame);
}

export class WaterSurface {
  readonly mesh: Mesh;
  private readonly frame: PoolFrame;
  private readonly material: ReturnType<typeof fogShader>;
  private readonly opacity = { value: OPACITY_ABOVE };
  private target = OPACITY_ABOVE;
  private readonly contacts = Array.from({ length: CONTACT_COUNT }, () => new Vector4());
  private seen = false;

  constructor(context: PartContext, frame: PoolFrame) {
    this.frame = frame;
    this.material = fogShader(context, 'waterline', {
      side: DoubleSide,
      transparent: true,
      fragment: FRAGMENT,
      uniforms: {
        uScroll: frame.uScroll,
        uPhase: frame.uPhase,
        uOpacity: this.opacity,
        uTint: { value: new Color(THEME.water) },
        uClear: { value: new Color(THEME.waterClear) },
        uSky: { value: new Color(THEME.splash) },
        uLight: { value: KEY_LIGHT },
        uContacts: { value: this.contacts },
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
    this.contact(0, cues.head, CONTACT_RADIUS_M.head, CONTACT_REACH_M.head);
    this.contact(1, cues.rightHand, CONTACT_RADIUS_M.hand, CONTACT_REACH_M.hand);
    this.contact(2, cues.leftHand, CONTACT_RADIUS_M.hand, CONTACT_REACH_M.hand);
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

  private contact(slot: number, point: Vector3, radius: number, reach: number): void {
    const strength = Math.max(1 - Math.abs(point.y) / reach, 0);
    this.contacts[slot].set(point.x, point.z, strength, radius);
  }

  private apply(value: number): void {
    this.opacity.value = value;
    this.material.opacity = value;
  }
}
