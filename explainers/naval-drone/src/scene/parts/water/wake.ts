import {
  Group,
  BufferAttribute,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Mesh,
  ShaderMaterial,
  Vector2,
} from 'three';
import type { Texture } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import type { PartId } from '../../../ids';
import { LABEL_SPOTS, SEA, WAKE } from '../../constants';
import { THEME } from '../../../theme';
import type { TrailSample } from '../../geometry/trail';
import { registered } from '../context';
import type { PartContext } from '../context';
import { WATER, WAVE_GLSL } from './waves';

export interface WakeParams {
  knots: number;
  plane: number;
  bowAhead: number;
  emphasis: boolean;
}

const VERTEX = /* glsl */ `
${WAVE_GLSL}
attribute vec4 aWake;
attribute float aHeading;
uniform vec2 uCellShape;
varying vec4 vWake;
varying vec3 vWorld;
varying float vHeading;
void main() {
  vHeading = aHeading;
  float cell = length(position.xz - cameraPosition.xz) * uCellShape.x + uCellShape.y;
  vec3 world = vec3(position.x, seaWave(position.xz, cell).x + ${WAKE.lift.toFixed(3)}, position.z);
  vWake = aWake;
  vWorld = world;
  gl_Position = projectionMatrix * viewMatrix * vec4(world, 1.0);
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uFoamMap;
uniform vec3 uFoam;
uniform vec3 uTint;
uniform vec4 uShape;
uniform float uFoamScale;
uniform float uSeaTime;
uniform vec2 uSeaDrift;
varying vec4 vWake;
varying vec3 vWorld;
varying float vHeading;
float foamAt(vec2 p) {
  return texture2D(uFoamMap, p).r;
}
void main() {
  float behind = vWake.x;
  float across = vWake.y;
  vec2 dir = vec2(cos(vHeading), sin(vHeading));
  vec2 p = vWorld.xz + uSeaDrift;
  vec2 q = vec2(dot(p, dir), dot(p, vec2(-dir.y, dir.x))) * uFoamScale;
  float t = uSeaTime;
  vec2 warp = vec2(foamAt(q * 0.05 + vec2(t * 0.013, 0.0)), foamAt(q * 0.05 + vec2(0.5, t * 0.011))) - 0.5;
  vec2 w = q + warp * 1.6;
  float fine = mix(foamAt(w * 1.7 + vec2(0.37, -t * 0.06)), 0.6, smoothstep(10.0, 50.0, distance(cameraPosition, vWorld)));
  float churn = foamAt(w * 0.55 + vec2(0.0, t * 0.04)) * 0.55 + fine * 0.45;
  float streaks = foamAt(w * vec2(0.03, 0.3)) * 0.55 + foamAt(w * vec2(0.09, 0.9) + vec2(0.21, 0.6)) * 0.45;
  float n = mix(churn, streaks, smoothstep(4.0, 60.0, behind));
  float edge = abs(across) + warp.x * 0.3;
  float density;
  if (vWake.z < 0.5) {
    float body = 1.0 - smoothstep(0.3, 0.85, edge);
    float lines = exp(-pow((abs(across) - 0.86) / 0.16, 2.0)) * exp(-behind / (uShape.z * 0.6));
    density = body * (exp(-behind / uShape.x) * 1.1 + exp(-behind / uShape.y) * 0.5) + lines * 0.6;
  } else {
    density = (1.0 - smoothstep(0.2, 0.85, edge)) * smoothstep(0.0, 4.0, behind) * exp(-behind / uShape.z) * 0.65;
  }
  density = clamp(density * uShape.w * vWake.w * smoothstep(0.0, 0.1, behind), 0.0, 1.0);
  float foam = smoothstep(0.85 - density * 0.55, 1.2 - density * 0.55, n) * smoothstep(0.0, 0.12, density);
  float tint = clamp(density, 0.0, 1.0) * 0.16;
  vec3 colour = mix(uTint, uFoam * (0.88 + 0.12 * churn), foam / max(foam + tint, 1e-3));
  gl_FragColor = vec4(colour, clamp(max(foam * 0.8, tint), 0.0, 0.8));
  #include <colorspace_fragment>
}
`;

export class WakePart {
  readonly mesh: Mesh;
  readonly anchor = new Group();
  private readonly material: ShaderMaterial;
  private readonly positions: Float32Array;
  private readonly params: Float32Array;
  private readonly headings: Float32Array;
  private readonly geometry = new BufferGeometry();

  constructor(context: PartContext, group: PartId, foamMap: Texture) {
    const { samples, across, armAcross } = WAKE;
    const count = samples * across + 2 * samples * armAcross;
    this.positions = new Float32Array(count * 3);
    this.params = new Float32Array(count * 4);
    this.headings = new Float32Array(count);
    const position = new BufferAttribute(this.positions, 3).setUsage(DynamicDrawUsage);
    const wake = new BufferAttribute(this.params, 4).setUsage(DynamicDrawUsage);
    this.geometry.setAttribute('position', position);
    this.geometry.setAttribute('aWake', wake);
    this.geometry.setAttribute(
      'aHeading',
      new BufferAttribute(this.headings, 1).setUsage(DynamicDrawUsage),
    );
    this.geometry.setIndex(this.indices());
    this.material = registered(
      context,
      group,
      new ShaderMaterial({
        uniforms: {
          uSeaTime: WATER.uSeaTime,
          uSeaDrift: WATER.uSeaDrift,
          uWaves: WATER.uWaves,
          uCellShape: { value: new Vector2(SEA.growth - 1, SEA.innerRadius) },
          uFoamMap: { value: foamMap },
          uFoam: { value: new Color(THEME.foam) },
          uTint: { value: new Color(WAKE.tint) },
          uShape: { value: [WAKE.fade.core, WAKE.fade.wash, WAKE.fade.arm, 1] },
          uFoamScale: { value: WAKE.foamScale },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
        toneMapped: false,
      }),
    );
    this.mesh = new Mesh(context.tracker.track(this.geometry), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = WAKE.renderOrder;
    this.mesh.add(this.anchor);
  }

  private indices(): number[] {
    const { samples, across, armAcross } = WAKE;
    const indices: number[] = [];
    const strip = (start: number, width: number) => {
      for (let i = 0; i < samples - 1; i += 1) {
        for (let j = 0; j < width - 1; j += 1) {
          const a = start + i * width + j;
          const b = a + width;
          indices.push(a, b, a + 1, a + 1, b, b + 1);
        }
      }
    };
    strip(0, across);
    strip(samples * across, armAcross);
    strip(samples * across + samples * armAcross, armAcross);
    return indices;
  }

  private put(
    index: number,
    sample: TrailSample,
    lateral: number,
    params: readonly [behind: number, across: number, kind: number],
  ) {
    const sx = -Math.sin(sample.heading);
    const sz = Math.cos(sample.heading);
    this.positions.set([sample.x + sx * lateral, 0, sample.z + sz * lateral], index * 3);
    this.params.set([...params, sample.live ? 1 : 0], index * 4);
    this.headings[index] = sample.heading;
  }

  setTrail(trail: readonly TrailSample[], params: WakeParams): void {
    const { across, armAcross, samples } = WAKE;
    const strength = smoothstep(params.knots, ...WAKE.speedFrom);
    const armAngle = lerp(WAKE.kelvin, WAKE.planedArm, params.plane);
    const armStart = lerp(params.bowAhead, 0, params.plane);
    trail.forEach((sample, i) => {
      const half = WAKE.coreHalfWidth + sample.behind * Math.tan(WAKE.coreSpread);
      for (let j = 0; j < across; j += 1) {
        const v = (j / (across - 1)) * 2 - 1;
        this.put(i * across + j, sample, v * half, [sample.behind, v, 0]);
      }
      const reach = clamp(sample.behind + armStart, 0, WAKE.armReach);
      const offset = WAKE.coreHalfWidth + reach * Math.tan(armAngle);
      const width = lerp(WAKE.armWidth[0], WAKE.armWidth[1], reach / WAKE.armReach);
      [-1, 1].forEach((side, arm) => {
        const base = samples * across + arm * samples * armAcross + i * armAcross;
        for (let j = 0; j < armAcross; j += 1) {
          const v = (j / (armAcross - 1)) * 2 - 1;
          this.put(base + j, sample, side * (offset + v * width), [reach, v, 1]);
        }
      });
    });
    this.geometry.getAttribute('position').needsUpdate = true;
    this.geometry.getAttribute('aWake').needsUpdate = true;
    this.geometry.getAttribute('aHeading').needsUpdate = true;
    const spot = trail.find((sample) => sample.behind >= LABEL_SPOTS.wakeBehind) ?? trail[0];
    this.anchor.position.set(spot.x, 0, spot.z);
    const shape = this.material.uniforms.uShape.value as number[];
    shape[3] = strength * (params.emphasis ? WAKE.emphasis : 1);
    this.mesh.visible = strength > 0;
  }
}
