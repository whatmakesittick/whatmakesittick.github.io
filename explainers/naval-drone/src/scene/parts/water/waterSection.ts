import {
  BufferGeometry,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  ShaderMaterial,
} from 'three';
import type { Matrix4 } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { WATER_SECTION } from '../../../model/layout';
import { THEME } from '../../../theme';
import { SECTION_LOOK } from '../../constants';
import { mergeParts, registered } from '../context';
import type { PartContext } from '../context';
import { HULL_MASK_GLSL } from './hullPlan';
import { SKY_GLSL, skyUniforms } from './skyShade';
import { WATER, WAVE_GLSL } from './waves';

const VERTEX = /* glsl */ `
${WAVE_GLSL}
attribute float aTop;
varying vec3 vWorld;
varying float vDepth;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  float surface = seaHeight(world.xz);
  world.y = mix(world.y, surface, aTop);
  vWorld = world.xyz;
  vDepth = surface - world.y;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = /* glsl */ `
${WAVE_GLSL}
${HULL_MASK_GLSL}
uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uGlint;
uniform vec4 uLook;
uniform float uMasked;
varying vec3 vWorld;
varying float vDepth;
void main() {
  if (uMasked > 0.5 && insideHull(vWorld, -0.002)) discard;
  float depth = clamp(vDepth / uLook.x, 0.0, 1.0);
  vec3 colour = mix(uShallow, uDeep, pow(depth, 0.7));
  vec2 p = vWorld.xz * 3.1 + vec2(vWorld.y * 1.7);
  float caustic = sin(p.x + uSeaTime * 1.3) * sin(p.y * 1.3 - uSeaTime * 1.1) + sin((p.x + p.y) * 0.7 + uSeaTime * 0.8);
  colour += uGlint * max(caustic, 0.0) * 0.06 * (1.0 - depth);
  float rim = 1.0 - smoothstep(0.0, uLook.w, vDepth);
  colour = mix(colour, uGlint, rim * 0.6);
  float alpha = mix(uLook.y, uLook.z, depth);
  gl_FragColor = vec4(colour, max(alpha, rim * 0.8));
  #include <colorspace_fragment>
}
`;

const SURFACE_FRAGMENT = /* glsl */ `
${WAVE_GLSL}
${SKY_GLSL}
${HULL_MASK_GLSL}
uniform vec3 uShallow;
uniform vec2 uClarity;
varying vec3 vWorld;
void main() {
  if (insideHull(vWorld, -0.002)) discard;
  vec3 wave = seaWave(vWorld.xz, 0.0);
  vec3 normal = normalize(vec3(-wave.y, 1.0, -wave.z));
  vec3 view = normalize(cameraPosition - vWorld);
  float fresnel = 0.02 + 0.98 * pow(1.0 - max(dot(normal, view), 0.0), 5.0);
  vec3 reflected = reflect(-view, normal);
  reflected.y = abs(reflected.y);
  vec3 colour = mix(uShallow, skyColour(reflected), fresnel);
  gl_FragColor = vec4(colour, mix(uClarity.x, uClarity.y, fresnel));
  #include <colorspace_fragment>
}
`;

function surface(): BufferGeometry {
  const [x0, x1] = WATER_SECTION.x;
  const [z0, z1] = WATER_SECTION.z;
  const { along, across } = SECTION_LOOK.surface;
  const positions: number[] = [];
  const tops: number[] = [];
  const indices: number[] = [];
  for (let i = 0; i <= along; i += 1) {
    for (let j = 0; j <= across; j += 1) {
      positions.push(x0 + ((x1 - x0) * i) / along, 0, z0 + ((z1 - z0) * j) / across);
      tops.push(1);
      if (i < along && j < across) {
        const a = i * (across + 1) + j;
        const b = a + across + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aTop', new Float32BufferAttribute(tops, 1));
  geometry.setIndex(indices);
  return geometry;
}

function wall(
  from: readonly [number, number],
  to: readonly [number, number],
  samples: number,
): BufferGeometry {
  const positions: number[] = [];
  const tops: number[] = [];
  const indices: number[] = [];
  for (let step = 0; step <= samples; step += 1) {
    const share = step / samples;
    const x = from[0] + (to[0] - from[0]) * share;
    const z = from[1] + (to[1] - from[1]) * share;
    positions.push(x, -WATER_SECTION.depth, z, x, 0, z);
    tops.push(0, 1);
    if (step < samples) {
      const a = step * 2;
      indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setAttribute('aTop', new Float32BufferAttribute(tops, 1));
  geometry.setIndex(indices);
  return geometry;
}

function floor(): BufferGeometry {
  const [x0, x1] = WATER_SECTION.x;
  const [z0, z1] = WATER_SECTION.z;
  const y = -WATER_SECTION.depth;
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute([x0, y, z0, x1, y, z0, x0, y, z1, x1, y, z1], 3),
  );
  geometry.setAttribute('aTop', new Float32BufferAttribute([0, 0, 0, 0], 1));
  geometry.setIndex([0, 2, 1, 1, 2, 3]);
  return geometry;
}

function material(
  context: PartContext,
  uniforms: Record<string, unknown>,
  transparent: boolean,
): ShaderMaterial {
  const { depth, clear, murky, rim } = SECTION_LOOK;
  return registered(
    context,
    UNDIMMED_GROUP,
    new ShaderMaterial({
      uniforms: {
        ...uniforms,
        uSeaTime: WATER.uSeaTime,
        uSeaDrift: WATER.uSeaDrift,
        uWaves: WATER.uWaves,
        uShallow: { value: new Color(THEME.waterWall) },
        uDeep: { value: new Color(SECTION_LOOK.deep) },
        uGlint: { value: new Color(SECTION_LOOK.glint) },
        uLook: { value: [depth, transparent ? clear : 1, transparent ? murky : 1, rim] },
        uMasked: { value: transparent ? 0 : 1 },
      },
      vertexShader: VERTEX,
      fragmentShader: FRAGMENT,
      transparent,
      depthWrite: !transparent,
      side: DoubleSide,
      toneMapped: false,
    }),
  );
}

export class WaterSectionPart {
  readonly object = new Group();

  constructor(context: PartContext, hullMask: Record<string, unknown>) {
    const [x0, x1] = WATER_SECTION.x;
    const [z0, z1] = WATER_SECTION.z;
    const { samples } = SECTION_LOOK;
    const glass = mergeParts([
      wall([x0, z0], [x1, z0], samples.along),
      wall([x0, z0], [x0, z1], samples.across),
      wall([x1, z0], [x1, z1], samples.across),
    ]);
    const back = mergeParts([wall([x0, z1], [x1, z1], samples.along), floor()]);
    const glassMesh = new Mesh(context.tracker.track(glass), material(context, hullMask, true));
    const top = registered(
      context,
      UNDIMMED_GROUP,
      new ShaderMaterial({
        uniforms: {
          ...hullMask,
          ...skyUniforms(),
          uSeaTime: WATER.uSeaTime,
          uSeaDrift: WATER.uSeaDrift,
          uWaves: WATER.uWaves,
          uShallow: { value: new Color(THEME.waterWall) },
          uClarity: { value: [...SECTION_LOOK.surface.clarity] },
        },
        vertexShader: VERTEX,
        fragmentShader: SURFACE_FRAGMENT,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        toneMapped: false,
      }),
    );
    const topMesh = new Mesh(context.tracker.track(surface()), top);
    topMesh.renderOrder = SECTION_LOOK.renderOrder + 1;
    topMesh.frustumCulled = false;
    this.object.add(topMesh);
    const backMesh = new Mesh(context.tracker.track(back), material(context, hullMask, false));
    glassMesh.renderOrder = SECTION_LOOK.renderOrder;
    [glassMesh, backMesh].forEach((mesh) => (mesh.frustumCulled = false));
    this.object.add(backMesh, glassMesh);
    this.object.matrixAutoUpdate = false;
    this.object.visible = false;
  }

  place(frame: Matrix4, on: boolean): void {
    this.object.matrix.copy(frame);
    this.object.matrixWorldNeedsUpdate = true;
    this.object.visible = on;
  }
}
