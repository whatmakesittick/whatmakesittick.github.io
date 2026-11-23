import {
  BufferAttribute,
  BufferGeometry,
  CapsuleGeometry,
  Color,
  Group,
  Mesh,
  ShaderMaterial,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import type { IUniform } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { ROAD } from '../../../model/layout';
import { THEME } from '../../../theme';
import { KERB, LAYER } from '../../constants';
import type { RunnerPose } from '../../runnerPose';
import { registered } from '../context';
import type { PartContext } from '../context';
import { SUN_VECTOR } from '../land/atmosphere';
import { proxySegments, PROXY_COUNT } from './proxies';

export const RUNNER_SHADOW_NAME = 'runnerShadow';

const CAPSULE = { capSegments: 3, radialSegments: 10 } as const;
const PENUMBRA_PER_M = 0.067;
const DEPTH = { step: 3e-7, wide: 2e-6, fringe: 7e-6, core: 1.2e-5 } as const;
const FADE = { fromM: 0, toM: 13, amount: 0.35 } as const;

interface Pass {
  readonly opacity: number;
  readonly spread: number;
  readonly bias: number;
}

const PASSES = {
  core: { opacity: 0.62, spread: -0.15, bias: DEPTH.core },
  fringe: { opacity: 0.38, spread: 0.45, bias: DEPTH.fringe },
  wide: { opacity: 0.16, spread: 1.4, bias: DEPTH.wide },
} as const satisfies Record<string, Pass>;

const CLIP = { none: 0, depth: 1, height: 2 } as const;

interface Receiver {
  readonly plane: Vector4;
  readonly clip: Vector4;
  readonly passes: readonly Pass[];
}

const KERB_FACE_Z_M = ROAD.zMaxM;
const LIFT_M = 0.003;

const RECEIVERS: readonly Receiver[] = [
  {
    plane: new Vector4(0, 1, 0, LIFT_M),
    clip: new Vector4(CLIP.none, 0, 0, 0),
    passes: [PASSES.core, PASSES.fringe, PASSES.wide],
  },
  {
    plane: new Vector4(0, 1, 0, KERB.heightM + LIFT_M),
    clip: new Vector4(CLIP.depth, KERB_FACE_Z_M, KERB_FACE_Z_M + KERB.widthM, 0),
    passes: [PASSES.core, PASSES.fringe],
  },
  {
    plane: new Vector4(0, 0, 1, KERB_FACE_Z_M - LIFT_M),
    clip: new Vector4(CLIP.height, 0, KERB.heightM, 0),
    passes: [PASSES.core, PASSES.fringe],
  },
];

const VERTEX = /* glsl */ `
attribute float proxy;
uniform vec4 uFrom[${PROXY_COUNT}];
uniform vec4 uTo[${PROXY_COUNT}];
uniform vec3 uSunDir;
uniform vec4 uPlane;
uniform float uSpread;
uniform vec2 uBias;
varying vec3 vWorld;

void main() {
  int index = int(proxy + 0.5);
  vec3 a = uFrom[index].xyz;
  vec3 b = uTo[index].xyz;
  vec3 axis = b - a;
  float len = length(axis);
  vec3 up = len > 1e-4 ? axis / len : vec3(0.0, 1.0, 0.0);
  vec3 helper = abs(up.y) < 0.95 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
  vec3 side = normalize(cross(up, helper));
  vec3 front = cross(side, up);
  vec3 centre = (a + b) * 0.5;
  float straight = clamp(position.y, -0.5, 0.5);
  float taper = mix(uFrom[index].w, uTo[index].w, straight + 0.5);
  float radius = max(taper + uSpread * max(centre.y, 0.0), 0.01);
  vec3 world = centre + up * (straight * len + (position.y - straight) * radius)
    + (side * position.x + front * position.z) * radius;
  float above = dot(uPlane.xyz, world) - uPlane.w;
  vec3 projected = world - uSunDir * above / dot(uPlane.xyz, uSunDir);
  vWorld = projected;
  gl_Position = projectionMatrix * viewMatrix * vec4(projected, 1.0);
  gl_Position.z -= (uBias.x + uBias.y * (${PROXY_COUNT - 1}.0 - float(index))) * gl_Position.w;
}
`;

const FRAGMENT = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
uniform vec4 uClip;
uniform vec3 uOrigin;
uniform vec3 uFade;
varying vec3 vWorld;

void main() {
  if (uClip.x > 0.5 && uClip.x < 1.5 && (vWorld.z < uClip.y || vWorld.z > uClip.z)) discard;
  if (uClip.x > 1.5 && (vWorld.y < uClip.y || vWorld.y > uClip.z)) discard;
  float reach = length(vWorld.xz - uOrigin.xz);
  float fade = 1.0 - uFade.z * smoothstep(uFade.x, uFade.y, reach);
  gl_FragColor = vec4(uColour, uOpacity * fade);
  #include <colorspace_fragment>
}
`;

function proxyGeometry(): BufferGeometry {
  const template = new CapsuleGeometry(1, 1, CAPSULE.capSegments, CAPSULE.radialSegments);
  const source = template.getAttribute('position');
  const indices = template.getIndex();
  const count = source.count;
  const positions = new Float32Array(count * PROXY_COUNT * 3);
  const proxies = new Float32Array(count * PROXY_COUNT);
  const index: number[] = [];
  for (let proxy = 0; proxy < PROXY_COUNT; proxy += 1) {
    positions.set(source.array as Float32Array, proxy * count * 3);
    proxies.fill(proxy, proxy * count, (proxy + 1) * count);
    indices?.array.forEach((value) => index.push(value + proxy * count));
  }
  template.dispose();
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('proxy', new BufferAttribute(proxies, 1));
  geometry.setIndex(index);
  return geometry;
}

export class RunnerShadow {
  readonly root = new Group();
  private readonly from: Vector4[] = Array.from({ length: PROXY_COUNT }, () => new Vector4());
  private readonly to: Vector4[] = Array.from({ length: PROXY_COUNT }, () => new Vector4());
  private readonly origin = new Vector3();

  constructor(context: PartContext) {
    this.root.name = RUNNER_SHADOW_NAME;
    const geometry = context.tracker.track(proxyGeometry());
    const shared: Record<string, IUniform> = {
      uFrom: { value: this.from },
      uTo: { value: this.to },
      uSunDir: { value: SUN_VECTOR },
      uColour: { value: new Color(THEME.shadow) },
      uOrigin: { value: this.origin },
      uFade: { value: new Vector3(FADE.fromM, FADE.toM, FADE.amount) },
    };
    let order = 0;
    RECEIVERS.forEach((receiver) => {
      receiver.passes.forEach((pass) => {
        const material = registered(
          context,
          UNDIMMED_GROUP,
          new ShaderMaterial({
            uniforms: {
              ...shared,
              uPlane: { value: receiver.plane },
              uClip: { value: receiver.clip },
              uSpread: { value: pass.spread * PENUMBRA_PER_M },
              uOpacity: { value: pass.opacity },
              uBias: { value: new Vector2(pass.bias, DEPTH.step) },
            },
            vertexShader: VERTEX,
            fragmentShader: FRAGMENT,
            transparent: true,
            depthWrite: true,
          }),
        );
        const mesh = new Mesh(geometry, material);
        mesh.frustumCulled = false;
        mesh.renderOrder = LAYER.runnerShadow + order;
        order += 1;
        this.root.add(mesh);
      });
    });
  }

  setPose(pose: RunnerPose): void {
    proxySegments(pose).forEach((segment, index) => {
      this.from[index].set(segment.from.x, segment.from.y, segment.from.z, segment.radius);
      this.to[index].set(segment.to.x, segment.to.y, segment.to.z, segment.endRadius);
    });
    this.origin.copy(pose.pelvis);
  }
}
