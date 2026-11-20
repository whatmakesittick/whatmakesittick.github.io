import { FrontSide, Mesh, PlaneGeometry, Vector2 } from 'three';
import type { Color, Vector3 } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { PartContext } from '../context';
import { LAYER } from '../pool/constants';
import type { PoolFrame } from '../pool/constants';
import { FRAGMENT_HEAD, FRAGMENT_TAIL, fogShader } from '../pool/shaders';

const WAKE_Y = 0.003;
const SIZE = { length: 2.6, width: 1.2 } as const;
const AHEAD_M = 0.25;
const SPEED_REFERENCE_MS = 2;
const FOOT_DEPTH_M = { shallow: -0.12, deep: -0.42 } as const;
const MAX_STRENGTH = 1;

const FRAGMENT = /* glsl */ `
${FRAGMENT_HEAD}
uniform vec3 uFoam;
uniform vec2 uFeet;
uniform float uStrength;

void main() {
  vec2 q = vWorld.xz - uFeet;
  float behind = -q.x;
  float along = smoothstep(-0.05, 0.15, behind) * exp(-behind * 0.95);
  float spread = 0.1 + 0.11 * behind;
  float across = exp(-pow(q.y / spread, 2.0));
  vec2 p = vec2(vWorld.x - uScroll, vWorld.z);
  float kx = TAU / PERIOD;
  float cells = sin(kx * p.x + 2.2 * sin(p.y * 9.0 + uPhase)) * sin(2.0 * kx * p.x + p.y * 13.0 - 2.0 * uPhase);
  float patches = smoothstep(0.0, 0.7, cells * 0.5 + 0.35);
  vec2 e = min(vUv, 1.0 - vUv);
  float edge = smoothstep(0.0, 0.12, min(e.x, e.y));
  float alpha = uStrength * along * across * patches * 0.55 * edge;
  gl_FragColor = vec4(uFoam, alpha);
${FRAGMENT_TAIL}`;

export class Wake {
  readonly mesh: Mesh;
  private readonly feet = new Vector2();
  private readonly strength = { value: 0 };

  constructor(context: PartContext, frame: PoolFrame, foam: Color) {
    const geometry = context.tracker.track(
      new PlaneGeometry(SIZE.length, SIZE.width).rotateX(-Math.PI / 2),
    );
    const material = fogShader(context, UNDIMMED_GROUP, {
      fragment: FRAGMENT,
      side: FrontSide,
      transparent: true,
      uniforms: {
        uScroll: frame.uScroll,
        uPhase: frame.uPhase,
        uFoam: { value: foam },
        uFeet: { value: this.feet },
        uStrength: this.strength,
      },
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.renderOrder = LAYER.effects;
    this.mesh.frustumCulled = false;
  }

  setState(right: Vector3, left: Vector3, speedMs: number): void {
    const x = (right.x + left.x) / 2;
    const z = (right.z + left.z) / 2;
    this.feet.set(x, z);
    this.mesh.position.set(x + AHEAD_M - SIZE.length / 2, WAKE_Y, z);
    const shallow = Math.max(right.y, left.y);
    const lift = (shallow - FOOT_DEPTH_M.deep) / (FOOT_DEPTH_M.shallow - FOOT_DEPTH_M.deep);
    this.strength.value = Math.min(
      Math.max(lift, 0) * (speedMs / SPEED_REFERENCE_MS),
      MAX_STRENGTH,
    );
  }
}
