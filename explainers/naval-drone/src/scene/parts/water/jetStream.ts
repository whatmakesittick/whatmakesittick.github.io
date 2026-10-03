import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  DoubleSide,
  DynamicDrawUsage,
  Group,
  Mesh,
  ShaderMaterial,
} from 'three';
import type { Object3D, Texture } from 'three';
import { lerp, smoothstep } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState } from '../../../ids';
import { JET } from '../../../model/layout';
import { GRAVITY, knotsToMs } from '../../../model/scale';
import { JET_STREAM } from '../../constants';
import type { Vec3 } from '../../geometry/surface';
import { registered } from '../context';
import type { PartContext } from '../context';
import { seededRandom } from '../surfaces';
import { LocalWater } from './hullWater';

const TUNING = JET_STREAM.tuning;

const VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vView;
void main() {
  vUv = uv;
  vec4 view = modelViewMatrix * vec4(position, 1.0);
  vView = -view.xyz;
  vNormalView = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * view;
}
`;

const FRAGMENT = /* glsl */ `
uniform sampler2D uFoamMap;
uniform vec3 uColour;
uniform vec3 uFlow;
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormalView;
varying vec3 vView;
void main() {
  float along = vUv.x;
  float streak = texture2D(uFoamMap, vec2(vUv.y * 2.0, along * uFlow.y - uTime * uFlow.x)).r;
  float fine = texture2D(uFoamMap, vec2(vUv.y * 5.0 + 0.3, along * uFlow.y * 2.0 - uTime * uFlow.x * 1.4)).r;
  float edge = 1.0 - abs(dot(normalize(vNormalView), normalize(vView)));
  float body = smoothstep(0.0, 0.05, along) * (1.0 - smoothstep(0.55, 1.0, along));
  float alpha = uFlow.z * body * (0.25 + 0.75 * smoothstep(0.35, 0.75, streak * 0.6 + fine * 0.5)) * (0.45 + 0.55 * edge);
  gl_FragColor = vec4(uColour, clamp(alpha, 0.0, 0.9));
  #include <colorspace_fragment>
}
`;

function tubeGrid(rings: number, segments: number): BufferGeometry {
  const count = (rings + 1) * (segments + 1);
  const geometry = new BufferGeometry();
  const uvs = new Float32Array(count * 2);
  const indices: number[] = [];
  for (let ring = 0; ring <= rings; ring += 1) {
    for (let segment = 0; segment <= segments; segment += 1) {
      uvs.set([ring / rings, segment / segments], (ring * (segments + 1) + segment) * 2);
      if (ring < rings && segment < segments) {
        const a = ring * (segments + 1) + segment;
        const b = a + segments + 1;
        indices.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
  }
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(count * 3), 3).setUsage(DynamicDrawUsage),
  );
  geometry.setAttribute('uv', new BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

function shapeTube(
  geometry: BufferGeometry,
  rings: number,
  segments: number,
  centre: (share: number) => Vec3,
  radius: (share: number) => number,
): void {
  const position = geometry.getAttribute('position');
  for (let ring = 0; ring <= rings; ring += 1) {
    const share = ring / rings;
    const [x, y, z] = centre(share);
    const r = radius(share);
    for (let segment = 0; segment <= segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      position.setXYZ(
        ring * (segments + 1) + segment,
        x,
        y + r * Math.cos(angle),
        z + r * Math.sin(angle),
      );
    }
  }
  position.needsUpdate = true;
  geometry.computeVertexNormals();
}

export class JetStreamPart {
  readonly column: Mesh;
  readonly reverse = new Group();
  readonly rooster: PointCloud;
  readonly anchor = new Group();
  private readonly material: ShaderMaterial;
  private readonly reverseMaterial: ShaderMaterial;
  private readonly columnGeometry: BufferGeometry;
  private readonly reverseGeometries: BufferGeometry[];
  private readonly water = new LocalWater();
  private clock = 0;
  private level = 0;
  private reverseOn = false;
  private readonly seeds: readonly (readonly [number, number, number, number])[];

  constructor(context: PartContext, foamMap: Texture, steering: Object3D) {
    const { segments, rings, reverse, look, rooster } = JET_STREAM;
    this.material = registered(
      context,
      'jetStream',
      new ShaderMaterial({
        uniforms: {
          uFoamMap: { value: foamMap },
          uColour: { value: new Color(look.colour) },
          uFlow: { value: [0, look.streaks, look.opacity] },
          uTime: { value: 0 },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
    );
    this.reverseMaterial = registered(context, 'jetStream', this.material.clone());
    this.reverseMaterial.uniforms.uFoamMap.value.dispose();
    this.reverseMaterial.uniforms.uFoamMap.value = foamMap;
    this.reverseMaterial.uniforms.uTime = this.material.uniforms.uTime;
    this.columnGeometry = context.tracker.track(tubeGrid(rings, segments));
    this.column = new Mesh(this.columnGeometry, this.material);
    this.column.frustumCulled = false;
    steering.add(this.column);
    this.column.add(this.anchor);
    this.reverseGeometries = [-1, 1].map(() =>
      context.tracker.track(tubeGrid(reverse.rings, segments)),
    );
    this.reverseGeometries.forEach((geometry) => {
      const mesh = new Mesh(geometry, this.reverseMaterial);
      mesh.frustumCulled = false;
      this.reverse.add(mesh);
    });
    const pointMaterial = registered(
      context,
      'wake',
      createPointMaterial(context.textures.dot, rooster.size, AdditiveBlending),
    );
    this.rooster = new PointCloud(rooster.count, pointMaterial);
    const random = seededRandom(rooster.seed);
    this.seeds = Array.from(
      { length: rooster.count },
      () => [random(), random(), random(), random()] as const,
    );
    context.tracker.track({ dispose: () => this.rooster.dispose() });
  }

  setState(state: AssemblyState, body: Object3D): void {
    const { jet, boat, view } = state;
    const emphasis = view.flow ? JET_STREAM.emphasis : 1;
    const length = lerp(
      JET_STREAM.length[0],
      JET_STREAM.length[1],
      smoothstep(jet.jetSpeed * JET_STREAM.lengthPerSpeed, 0, 2),
    );
    const flowing = jet.flow > 0;
    this.reverseOn = jet.bucket > TUNING.reverseOn;
    this.column.visible = flowing && !this.reverseOn;
    this.reverse.visible = flowing && this.reverseOn;
    const uniforms = this.material.uniforms;
    const flow = uniforms.uFlow.value as number[];
    flow[0] = jet.jetSpeed / Math.max(length, TUNING.minLength);
    flow[2] = JET_STREAM.look.opacity * emphasis * smoothstep(jet.throttle, 0, TUNING.throttleFade);
    const reverse = this.reverseMaterial.uniforms.uFlow.value as number[];
    reverse[0] = flow[0];
    reverse[2] = flow[2] * JET_STREAM.reverse.fade;
    const drop = (share: number) =>
      0.5 * GRAVITY * ((share * length) / Math.max(jet.jetSpeed, 1)) ** 2;
    shapeTube(
      this.columnGeometry,
      JET_STREAM.rings,
      JET_STREAM.segments,
      (share) => [
        JET.steeringNozzle.x[0] - JET.steeringNozzle.pivotX - share * length,
        -drop(share),
        0,
      ],
      (share) => JET_STREAM.exitRadius + share * length * JET_STREAM.spread,
    );
    this.anchor.position.set(
      JET.steeringNozzle.x[0] - JET.steeringNozzle.pivotX - length * TUNING.anchorShare,
      0,
      0,
    );
    this.placeReverse();
    body.updateMatrixWorld(true);
    this.water.use(body.matrixWorld);
    this.level =
      smoothstep(boat.knots, ...JET_STREAM.rooster.onFrom) *
      jet.throttle *
      emphasis *
      (this.reverseOn ? 0 : 1);
    this.placeRooster(knotsToMs(boat.knots));
  }

  private placeReverse(): void {
    const { reverse, segments } = JET_STREAM;
    const [cx, cy] = TUNING.reverseCentre;
    this.reverseGeometries.forEach((geometry, index) => {
      const side = index === 0 ? -1 : 1;
      shapeTube(
        geometry,
        reverse.rings,
        segments,
        (share) => [
          cx + share * reverse.length * Math.cos(reverse.angle),
          cy -
            reverse.dive * Math.sin(share * Math.PI * TUNING.reverseArc) -
            share * TUNING.reverseSink,
          side * share * reverse.length * Math.sin(reverse.angle),
        ],
        (share) => reverse.radius * (1 + share * TUNING.reverseGrow),
      );
    });
  }

  private placeRooster(speed: number): void {
    const { count, life, aft, up, spread, gravity } = JET_STREAM.rooster;
    this.rooster.points.visible = this.level > TUNING.shown;
    if (!this.rooster.points.visible) return;
    const exit = JET.steeringNozzle.x[0];
    for (let index = 0; index < count; index += 1) {
      const [phase, across, rise, drift] = this.seeds[index];
      const age = ((this.clock / life + phase) % 1) * life;
      const [lateralBase, liftBase, aftBase, aftSpread] = TUNING.jitter;
      const lateral = (across - 0.5) * spread * (lateralBase + drift);
      const lift = up * (liftBase + (1 - liftBase) * rise) * this.level;
      const x = exit - (aft * (aftBase + aftSpread * drift) + speed * TUNING.speedDrift) * age;
      const z = lateral * age * TUNING.lateralGain;
      const floor = this.water.level(x, z);
      const y = Math.max(floor + lift * age - 0.5 * gravity * age * age, floor);
      this.rooster.setPoint(index, x, y, z);
      this.rooster.setColor(index, 1, 1, 1, (1 - age / life) * TUNING.alpha * this.level);
    }
    this.rooster.commit();
  }

  advance(deltaSeconds: number, state: AssemblyState): void {
    this.clock += deltaSeconds;
    this.material.uniforms.uTime.value = this.clock;
    this.placeRooster(knotsToMs(state.boat.knots));
  }
}
