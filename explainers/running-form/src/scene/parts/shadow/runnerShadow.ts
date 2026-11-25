import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Mesh,
  MultiplyBlending,
  ShaderMaterial,
  Vector3,
  Vector4,
} from 'three';
import type { IUniform } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { ROAD } from '../../../model/layout';
import { KERB, LAYER } from '../../constants';
import type { RunnerPose } from '../../runnerPose';
import { registered } from '../context';
import type { PartContext } from '../context';
import { atmosphereUniforms } from '../land/atmosphere';
import { SUN_VECTOR } from '../../sun';
import { proxySegments, PROXY_COUNT } from './proxies';
import type { ProxySegment } from './proxies';

const RUNNER_SHADOW_NAME = 'runnerShadow';

const SUN_HALF_ANGLE_RAD = 0.00465;
const BASE_SOFTNESS_M = 0.006;
const LIFT_M = 0.003;
const REJECT_MARGIN_M = 0.001;
const PIXEL_FOOTPRINT_SHARE = 0.7;
const MIN_COVER = 0.004;
const DEPTH_BIAS = 2e-6;
const QUAD_CORNERS = 4;
const AXES = 3;
const KERB_FACE_Z_M = ROAD.zMaxM;
const KERB_REACH_M = (KERB.heightM * Math.hypot(SUN_VECTOR.x, SUN_VECTOR.z)) / SUN_VECTOR.y;

interface Bounds {
  readonly uMin: number;
  readonly uMax: number;
  readonly vMin: number;
  readonly vMax: number;
}

interface Receiver {
  readonly normal: Vector3;
  readonly corners: (bounds: Bounds) => Vector3[];
  readonly clip: Vector4;
}

const UP = new Vector3(0, 1, 0);
const TOWARD_SEA = new Vector3(0, 0, -1);
const ALONG = new Vector3(-SUN_VECTOR.x, 0, -SUN_VECTOR.z).normalize();
const ACROSS = new Vector3(-ALONG.z, 0, ALONG.x);

function onGround(heightM: number): (bounds: Bounds) => Vector3[] {
  return ({ uMin, uMax, vMin, vMax }) =>
    [
      [uMin, vMin],
      [uMax, vMin],
      [uMin, vMax],
      [uMax, vMax],
    ].map(([u, v]) =>
      new Vector3().addScaledVector(ALONG, u).addScaledVector(ACROSS, v).setY(heightM),
    );
}

function kerbFace({ uMin, uMax, vMin, vMax }: Bounds): Vector3[] {
  const xs = [uMin, uMax].flatMap((u) => [vMin, vMax].map((v) => ALONG.x * u + ACROSS.x * v));
  const from = Math.min(...xs);
  const to = Math.max(...xs);
  const z = KERB_FACE_Z_M - LIFT_M;
  return [
    new Vector3(from, 0, z),
    new Vector3(to, 0, z),
    new Vector3(from, KERB.heightM, z),
    new Vector3(to, KERB.heightM, z),
  ];
}

const CLIP = { none: 0, depth: 1, height: 2 } as const;

const RECEIVERS: readonly Receiver[] = [
  { normal: UP, corners: onGround(LIFT_M), clip: new Vector4(CLIP.none, 0, 0, 0) },
  {
    normal: UP,
    corners: onGround(KERB.heightM + LIFT_M),
    clip: new Vector4(CLIP.depth, KERB_FACE_Z_M, KERB_FACE_Z_M + KERB.widthM, 0),
  },
  {
    normal: TOWARD_SEA,
    corners: kerbFace,
    clip: new Vector4(CLIP.height, 0, KERB.heightM, 0),
  },
];

const VERTEX = /* glsl */ `
varying vec3 vWorld;

void main() {
  vWorld = position;
  gl_Position = projectionMatrix * viewMatrix * vec4(position, 1.0);
  gl_Position.z -= ${DEPTH_BIAS.toExponential()} * gl_Position.w;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec4 uFrom[${PROXY_COUNT}];
uniform vec4 uTo[${PROXY_COUNT}];
uniform vec3 uSunDir;
uniform vec3 uShade;
uniform vec4 uClip;
varying vec3 vWorld;

float blocked(vec3 ground, vec4 from, vec4 to, float pixel) {
  vec3 ab = to.xyz - from.xyz;
  vec3 ag = ground - from.xyz;
  float abab = max(dot(ab, ab), 1e-8);
  float halfSpan = 0.5 * sqrt(abab);
  vec3 toMiddle = ag - 0.5 * ab;
  vec3 offAxis = toMiddle - uSunDir * dot(uSunDir, toMiddle);
  float softest = max((2.0 * halfSpan + length(ag)) * ${SUN_HALF_ANGLE_RAD} + ${BASE_SOFTNESS_M}, pixel);
  float reach = halfSpan + max(from.w, to.w) + softest + ${REJECT_MARGIN_M};
  if (dot(offAxis, offAxis) > reach * reach) return 0.0;
  float sab = dot(uSunDir, ab);
  float sag = dot(uSunDir, ag);
  float abag = dot(ab, ag);
  float skew = abab - sab * sab;
  float h = skew > 1e-7 ? clamp((abag - sab * sag) / skew, 0.0, 1.0) : 0.0;
  float t = max(h * sab - sag, 0.0);
  h = clamp((abag + t * sab) / abab, 0.0, 1.0);
  float gap = length(ag + uSunDir * t - ab * h);
  float radius = mix(from.w, to.w, h);
  float soft = max(t * ${SUN_HALF_ANGLE_RAD} + ${BASE_SOFTNESS_M}, pixel);
  return smoothstep(radius + soft, radius - soft, gap) * min(1.0, radius / soft);
}

void main() {
  if (uClip.x > 0.5 && uClip.x < 1.5 && (vWorld.z < uClip.y || vWorld.z > uClip.z)) discard;
  if (uClip.x > 1.5 && (vWorld.y < uClip.y || vWorld.y > uClip.z)) discard;
  float pixel = length(fwidth(vWorld)) * ${PIXEL_FOOTPRINT_SHARE};
  float cover = 0.0;
  for (int i = 0; i < ${PROXY_COUNT}; i++) {
    cover = max(cover, blocked(vWorld, uFrom[i], uTo[i], pixel));
  }
  if (cover < ${MIN_COVER}) discard;
  gl_FragColor = vec4(mix(vec3(1.0), uShade, cover), 1.0);
  #include <colorspace_fragment>
}
`;

function lightShare(normal: Vector3): Color {
  const uniforms = atmosphereUniforms();
  const sun = (uniforms.uSunLight.value as Color)
    .clone()
    .multiplyScalar(Math.max(normal.dot(SUN_VECTOR), 0));
  const sky = 0.5 + 0.5 * normal.y;
  const ambient = (uniforms.uSkyLight.value as Color)
    .clone()
    .multiplyScalar(sky)
    .add((uniforms.uBounceLight.value as Color).clone().multiplyScalar(1 - sky));
  const total = ambient.clone().add(sun);
  return new Color(ambient.r / total.r, ambient.g / total.g, ambient.b / total.b);
}

function quadGeometry(): BufferGeometry {
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(QUAD_CORNERS * AXES), AXES),
  );
  geometry.setIndex([0, 2, 1, 1, 2, 3]);
  return geometry;
}

function projected(point: Vector3, heightM: number, out: Vector3): Vector3 {
  return out.copy(point).addScaledVector(SUN_VECTOR, -(point.y - heightM) / SUN_VECTOR.y);
}

export function shadowBounds(segments: readonly ProxySegment[]): Bounds {
  const flat = new Vector3();
  let uMin = Infinity;
  let uMax = -Infinity;
  let vMin = Infinity;
  let vMax = -Infinity;
  segments.forEach((segment) => {
    [
      [segment.from, segment.radius],
      [segment.to, segment.endRadius],
    ].forEach(([point, radius]) => {
      const p = projected(point as Vector3, 0, flat);
      const reach = (radius as number) + (point as Vector3).y * SUN_HALF_ANGLE_RAD * 2;
      const u = p.dot(ALONG);
      const v = p.dot(ACROSS);
      uMin = Math.min(uMin, u - reach / SUN_VECTOR.y - KERB_REACH_M);
      uMax = Math.max(uMax, u + reach / SUN_VECTOR.y);
      vMin = Math.min(vMin, v - reach);
      vMax = Math.max(vMax, v + reach);
    });
  });
  return { uMin, uMax, vMin, vMax };
}

export class RunnerShadow {
  readonly root = new Group();
  private readonly from: Vector4[] = Array.from({ length: PROXY_COUNT }, () => new Vector4());
  private readonly to: Vector4[] = Array.from({ length: PROXY_COUNT }, () => new Vector4());
  private readonly quads: BufferGeometry[] = [];

  constructor(context: PartContext) {
    this.root.name = RUNNER_SHADOW_NAME;
    const shared: Record<string, IUniform> = {
      uFrom: { value: this.from },
      uTo: { value: this.to },
      uSunDir: { value: SUN_VECTOR },
    };
    RECEIVERS.forEach((receiver, order) => {
      const geometry = context.tracker.track(quadGeometry());
      const material = registered(
        context,
        UNDIMMED_GROUP,
        new ShaderMaterial({
          uniforms: {
            ...shared,
            uShade: { value: lightShare(receiver.normal) },
            uClip: { value: receiver.clip },
          },
          vertexShader: VERTEX,
          fragmentShader: FRAGMENT,
          transparent: true,
          premultipliedAlpha: true,
          blending: MultiplyBlending,
          depthWrite: false,
        }),
      );
      const mesh = new Mesh(geometry, material);
      mesh.frustumCulled = false;
      mesh.renderOrder = LAYER.runnerShadow + order;
      this.quads.push(geometry);
      this.root.add(mesh);
    });
  }

  setPose(pose: RunnerPose): void {
    const segments = proxySegments(pose);
    segments.forEach((segment, index) => {
      this.from[index].set(segment.from.x, segment.from.y, segment.from.z, segment.radius);
      this.to[index].set(segment.to.x, segment.to.y, segment.to.z, segment.endRadius);
    });
    const bounds = shadowBounds(segments);
    RECEIVERS.forEach((receiver, index) => {
      const attribute = this.quads[index].getAttribute('position') as BufferAttribute;
      receiver.corners(bounds).forEach((corner, at) => corner.toArray(attribute.array, at * AXES));
      attribute.needsUpdate = true;
    });
  }
}
