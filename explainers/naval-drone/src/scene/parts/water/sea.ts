import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Matrix4,
  Mesh,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector2,
  Vector4,
} from 'three';
import type { Camera, Object3D } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { LIGHT_RIG, SEA } from '../../constants';
import { registered } from '../context';
import type { PartContext } from '../context';
import { HULL_MASK_GLSL, hullPlanRange, hullPlanTexture } from './hullPlan';
import { foamTexture, rippleTexture } from './seaMaps';
import { SKY_GLSL, skyUniforms } from './skyShade';
import { SECTION_GLSL, sectionUniforms } from './sectionMask';
import type { SectionUniforms } from './sectionMask';
import { WATER, WAVE_GLSL } from './waves';

const VERTEX = /* glsl */ `
#include <fog_pars_vertex>
${WAVE_GLSL}
uniform vec2 uGridOrigin;
uniform vec2 uCellShape;
varying vec3 vWorld;
void main() {
  vec2 at = position.xz + uGridOrigin;
  float cell = length(position.xz) * uCellShape.x + uCellShape.y;
  vec3 wave = seaWave(at, cell);
  vec3 world = vec3(at.x, wave.x, at.y);
  vWorld = world;
  vec4 mvPosition = viewMatrix * vec4(world, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const FRAGMENT = /* glsl */ `
#include <fog_pars_fragment>
${WAVE_GLSL}
${SKY_GLSL}
${HULL_MASK_GLSL}
${SECTION_GLSL}
uniform sampler2D uRipples;
uniform sampler2D uFoamMap;
uniform vec3 uDeep;
uniform vec3 uLit;
uniform vec3 uScatter;
uniform vec3 uFoamColour;
uniform vec3 uSunColour;
uniform vec4 uRippleScale;
uniform vec4 uRippleFlow;
uniform vec2 uRippleFade;
uniform vec4 uGlitter;
uniform vec4 uFoamShape;
uniform vec2 uFresnel;
uniform float uFoamLevel;
uniform float uWaveScale;
uniform float uHullMargin;
varying vec3 vWorld;

void main() {
  if (insideSection(vWorld) || insideHull(vWorld, uHullMargin)) discard;
  float dist = length(cameraPosition - vWorld);
  float footprint = dist * 0.002;
  vec3 wave = seaWave(vWorld.xz, footprint * 4.0);
  vec2 base = vWorld.xz + uSeaDrift;
  vec2 near = 1.0 - smoothstep(uRippleFade.x, uRippleFade.y, dist) * vec2(0.65, 0.95);
  vec2 r1 = texture2D(uRipples, base * uRippleScale.x + uSeaTime * uRippleFlow.xy).xy - 0.5;
  vec2 r2 = texture2D(uRipples, base * uRippleScale.y + uSeaTime * uRippleFlow.zw).xy - 0.5;
  vec2 r3 = texture2D(uRipples, base * uRippleScale.w + uSeaTime * uRippleFlow.yx * 0.3).xy - 0.5;
  vec2 ripple = (r1 * near.x + r2 * near.y * 0.7 + r3 * 0.55) * uRippleScale.z;
  vec3 normal = normalize(vec3(-wave.y - ripple.x, 1.0, -wave.z - ripple.y));
  vec3 view = normalize(cameraPosition - vWorld);
  float facing = max(dot(normal, view), 0.0);
  float fresnel = uFresnel.x + (1.0 - uFresnel.x) * pow(1.0 - facing, uFresnel.y);
  vec3 reflected = reflect(-view, normal);
  reflected.y = abs(reflected.y);
  vec3 sky = skyColour(reflected);
  float sunSide = pow(0.5 + 0.5 * dot(normalize(-view.xz + vec2(1e-5)), normalize(uSun.xz)), 2.0);
  float crest = wave.x / max(uWaveScale, 0.05);
  vec3 body = mix(uDeep, uLit, sunSide * 0.85);
  body += uScatter * max(crest, 0.0) * 0.16 * (0.3 + sunSide) * (1.0 - facing * 0.7);
  vec3 colour = mix(body, sky, fresnel);
  float sunDot = max(dot(reflected, uSun), 0.0);
  float sharp = mix(uGlitter.x, uGlitter.w, smoothstep(30.0, 1200.0, dist));
  colour += uSunColour * (pow(sunDot, sharp) * uGlitter.z + pow(sunDot, uGlitter.y) * 0.25) * (0.3 + 0.7 * fresnel);
  float noise = texture2D(uFoamMap, base * uFoamShape.x + uSeaTime * 0.012).r;
  float streaks = texture2D(uFoamMap, base * uFoamShape.x * 4.3 + vec2(0.37, 0.61)).r;
  float fine = texture2D(uFoamMap, base * uFoamShape.x * 11.0 + vec2(0.71, 0.13)).r;
  float cap = smoothstep(uFoamShape.y, uFoamShape.z, crest + (noise - 0.5) * 0.45);
  float lace = smoothstep(0.5, 0.56, streaks * 0.55 + fine * 0.45 + cap * 0.2);
  float foam = cap * lace * uFoamLevel * (1.0 - smoothstep(150.0, 1200.0, dist));
  colour = mix(colour, uFoamColour * (0.72 + 0.28 * sunSide), foam);
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
  #include <fog_fragment>
}
`;

function polarGrid(): BufferGeometry {
  const { rings, segments, innerRadius, growth } = SEA;
  const positions: number[] = [0, 0, 0];
  for (let ring = 0; ring <= rings; ring += 1) {
    const radius = innerRadius * growth ** ring;
    for (let segment = 0; segment < segments; segment += 1) {
      const angle = (segment / segments) * Math.PI * 2;
      positions.push(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
    }
  }
  const indices: number[] = [];
  for (let segment = 0; segment < segments; segment += 1) {
    indices.push(0, 1 + ((segment + 1) % segments), 1 + segment);
  }
  for (let ring = 0; ring < rings; ring += 1) {
    const inner = 1 + ring * segments;
    const outer = inner + segments;
    for (let segment = 0; segment < segments; segment += 1) {
      const next = (segment + 1) % segments;
      indices.push(
        inner + segment,
        inner + next,
        outer + segment,
        inner + next,
        outer + next,
        outer + segment,
      );
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

export class SeaPart {
  readonly mesh: Mesh;
  readonly section: SectionUniforms;
  readonly hullMask: Record<string, { value: unknown }>;
  private readonly material: ShaderMaterial;
  private readonly boatInverse = new Matrix4();

  constructor(context: PartContext) {
    const { colours, ripples, glitter, foam, fresnel } = SEA;
    this.section = sectionUniforms();
    const { tracker } = context;
    this.material = registered(
      context,
      UNDIMMED_GROUP,
      new ShaderMaterial({
        uniforms: {
          ...UniformsUtils.clone(UniformsLib.fog),
          ...skyUniforms(),
          ...this.section,
          uSeaTime: WATER.uSeaTime,
          uSeaDrift: WATER.uSeaDrift,
          uWaves: WATER.uWaves,
          uFoamLevel: WATER.uFoamLevel,
          uWaveScale: { value: 1 },
          uGridOrigin: { value: new Vector2() },
          uCellShape: { value: new Vector2(SEA.growth - 1, SEA.innerRadius) },
          uBoatInverse: { value: this.boatInverse },
          uHullPlan: { value: tracker.track(hullPlanTexture()) },
          uHullPlanRange: { value: hullPlanRange() },
          uHullMargin: { value: SEA.hullMargin },
          uRipples: { value: tracker.track(rippleTexture()) },
          uFoamMap: { value: tracker.track(foamTexture()) },
          uDeep: { value: new Color(colours.deep) },
          uLit: { value: new Color(colours.lit) },
          uScatter: { value: new Color(colours.scatter) },
          uFoamColour: { value: new Color(colours.foam) },
          uSunColour: { value: new Color(LIGHT_RIG.key.color) },
          uRippleScale: {
            value: new Vector4(
              ripples.scales[0],
              ripples.scales[1],
              ripples.strength,
              ripples.broad,
            ),
          },
          uRippleFlow: { value: new Vector4(...ripples.flow[0], ...ripples.flow[1]) },
          uRippleFade: { value: new Vector2(ripples.fadeFrom, ripples.fadeTo) },
          uGlitter: {
            value: new Vector4(glitter.sharp, glitter.broad, glitter.sharpGain, glitter.farSharp),
          },
          uFoamShape: { value: new Vector4(foam.scale, foam.crestFrom, foam.crestTo, 0) },
          uFresnel: { value: new Vector2(fresnel.base, fresnel.power) },
        },
        vertexShader: VERTEX,
        fragmentShader: FRAGMENT,
        fog: true,
        toneMapped: false,
      }),
    );
    const { uBoatInverse, uHullPlan, uHullPlanRange } = this.material.uniforms;
    this.hullMask = { uBoatInverse, uHullPlan, uHullPlanRange };
    this.mesh = new Mesh(tracker.track(polarGrid()), this.material);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = SEA.renderOrder;
    const origin = this.material.uniforms.uGridOrigin.value as Vector2;
    this.mesh.onBeforeRender = (_renderer, _scene, camera: Camera) => {
      const snap = SEA.snap;
      origin.set(
        Math.round(camera.position.x / snap) * snap,
        Math.round(camera.position.z / snap) * snap,
      );
    };
  }

  followBoat(body: Object3D): void {
    body.updateMatrixWorld(true);
    this.boatInverse.copy(body.matrixWorld).invert();
  }

  setWaveScale(waveHeight: number, foamLevel: number): void {
    this.material.uniforms.uWaveScale.value = waveHeight / 2;
    WATER.uFoamLevel.value = foamLevel;
  }
}
