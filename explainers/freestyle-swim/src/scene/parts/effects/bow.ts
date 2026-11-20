import { FrontSide, Mesh, PlaneGeometry, Vector2 } from 'three';
import type { Color, Vector3 } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { PartContext } from '../context';
import { LAYER } from '../pool/constants';
import type { PoolFrame } from '../pool/constants';
import { FRAGMENT_HEAD, FRAGMENT_TAIL, fogShader } from '../pool/shaders';

const BOW_Y = 0.002;
const SIZE = { length: 1.5, width: 1.6 } as const;
const CREST_AHEAD_M = 0.16;
const AHEAD_MARGIN_M = 0.15;
const SPEED_REFERENCE_MS = 2;
const HEAD_UP_GAIN = 1.6;
const MAX_STRENGTH = 1.2;

const FRAGMENT = /* glsl */ `
${FRAGMENT_HEAD}
uniform vec3 uFoam;
uniform vec2 uHead;
uniform float uStrength;
const float ARC_K = 2.96;
const float ARM_START = 0.2;
const float ARM_Z = 0.26;
const float ARM_SLOPE = 0.353;
const float ARM_COS = 0.94;

void main() {
  vec2 q = vWorld.xz - uHead;
  float u = q.x - ${CREST_AHEAD_M};
  float z = abs(q.y);
  float behind = max(-u, 0.0);
  float dArc = (u + ARC_K * z * z) * 0.85;
  float crest = exp(-pow(dArc / 0.03, 2.0)) * (1.0 - smoothstep(0.16, 0.28, z));
  float armZ = ARM_Z + ARM_SLOPE * (behind - ARM_START);
  float dArm = (z - armZ) * ARM_COS;
  float armFade = step(ARM_START, behind) * exp(-(behind - ARM_START) * 1.1);
  float wave = 0.5 + 0.5 * sin(TAU * (vWorld.x - uScroll) / (PERIOD * 0.5));
  float arms = exp(-pow(dArm / 0.013, 2.0)) * armFade * (0.6 + 0.4 * wave);
  float wedge = (1.0 - smoothstep(armZ - 0.12, armZ, z)) * armFade * 0.12 * wave;
  vec2 e = min(vUv, 1.0 - vUv);
  float edge = smoothstep(0.0, 0.15, min(e.x, e.y));
  float alpha = clamp(uStrength * (crest * 0.4 + arms * 0.3 + wedge), 0.0, 0.6) * edge;
  gl_FragColor = vec4(uFoam, alpha);
${FRAGMENT_TAIL}`;

export class BowRipple {
  readonly mesh: Mesh;
  private readonly head = new Vector2();
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
        uHead: { value: this.head },
        uStrength: this.strength,
      },
    });
    this.mesh = new Mesh(geometry, material);
    this.mesh.renderOrder = LAYER.effects;
    this.mesh.frustumCulled = false;
  }

  setState(head: Vector3, speedMs: number, headUp: boolean): void {
    this.head.set(head.x, head.z);
    this.mesh.position.set(
      head.x + CREST_AHEAD_M + AHEAD_MARGIN_M - SIZE.length / 2,
      BOW_Y,
      head.z,
    );
    const gain = headUp ? HEAD_UP_GAIN : 1;
    this.strength.value = Math.min((speedMs / SPEED_REFERENCE_MS) * gain, MAX_STRENGTH);
  }
}
