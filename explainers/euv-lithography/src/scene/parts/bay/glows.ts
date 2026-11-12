import {
  AdditiveBlending,
  Color,
  InstancedMesh,
  Matrix4,
  PlaneGeometry,
  Quaternion,
  ShaderMaterial,
  UniformsLib,
  UniformsUtils,
  Vector3,
} from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { BAY_TONES } from '../../../theme';
import { registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { stripSpots } from './ceiling';
import type { StripSpot } from './ceiling';
import { CEILING_Y, HALL, HALO, HERO, POOL, STRIP } from './dims';
import type { Footprint } from './dims';
import { GLOW } from './finishes';

const GLOW_VERTEX = /* glsl */ `
varying vec2 vUv;
varying vec3 vTint;
#include <fog_pars_vertex>
void main() {
  vUv = uv;
  vTint = vec3(1.0);
  vec4 local = vec4(position, 1.0);
  #ifdef USE_INSTANCING
    local = instanceMatrix * local;
  #endif
  #ifdef USE_INSTANCING_COLOR
    vTint = instanceColor;
  #endif
  vec4 mvPosition = modelViewMatrix * local;
  gl_Position = projectionMatrix * mvPosition;
  #include <fog_vertex>
}
`;

const GLOW_FRAGMENT = /* glsl */ `
varying vec2 vUv;
varying vec3 vTint;
#include <fog_pars_fragment>
void main() {
  vec2 offset = (vUv - 0.5) * 2.0;
  float fall = clamp(1.0 - dot(offset, offset), 0.0, 1.0);
  vec3 colour = vTint * fall * fall;
  #ifdef USE_FOG
    colour *= 1.0 - smoothstep(fogNear, fogFar, vFogDepth);
  #endif
  gl_FragColor = vec4(colour, 1.0);
  #include <colorspace_fragment>
}
`;

const POLYGON_OFFSET = -2;
const DOWN = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), Math.PI / 2);
const UP = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -Math.PI / 2);

interface Glow {
  matrix: Matrix4;
  colour: Color;
}

function overlapsHero(x: number, halfLength: number): boolean {
  return x + halfLength > HERO.minX && x - halfLength < HERO.maxX;
}

function clampedDepth(z: number, rect: Footprint): number {
  const room = Math.min(z - rect.minZ, rect.maxZ - z) - POOL.edge;
  return Math.min(POOL.depth, room * 2);
}

function pool({ x, z }: StripSpot, colour: Color): Glow | null {
  if (Math.abs(z) < HERO.maxZ && overlapsHero(x, POOL.length / 2)) return null;
  const depth = clampedDepth(z, HALL);
  if (depth <= 0) return null;
  const matrix = new Matrix4().compose(
    new Vector3(x, POOL.lift, z),
    UP,
    new Vector3(POOL.length, depth, 1),
  );
  return { matrix, colour };
}

function halo({ x, z }: StripSpot, colour: Color): Glow {
  const matrix = new Matrix4().compose(
    new Vector3(x, CEILING_Y - HALO.drop, z),
    DOWN,
    new Vector3(HALO.length, HALO.depth, 1),
  );
  return { matrix, colour };
}

function glows(): Glow[] {
  const poolColour = new Color(BAY_TONES.pool).multiplyScalar(GLOW.pool);
  const haloColour = new Color(BAY_TONES.lamp).multiplyScalar(GLOW.halo);
  const pools = stripSpots(POOL.reach)
    .map((spot) => pool(spot, poolColour))
    .filter((found): found is Glow => found !== null);
  const halos = stripSpots(STRIP.reach).map((spot) => halo(spot, haloColour));
  return [...pools, ...halos];
}

function glowMaterial(context: PartContext): ShaderMaterial {
  return registeredMaterial(
    context,
    UNDIMMED_GROUP,
    new ShaderMaterial({
      vertexShader: GLOW_VERTEX,
      fragmentShader: GLOW_FRAGMENT,
      uniforms: UniformsUtils.clone(UniformsLib.fog),
      fog: true,
      transparent: true,
      depthWrite: false,
      blending: AdditiveBlending,
      polygonOffset: true,
      polygonOffsetFactor: POLYGON_OFFSET,
      polygonOffsetUnits: POLYGON_OFFSET,
    }),
  );
}

export function buildGlows(context: PartContext): InstancedMesh {
  const list = glows();
  const mesh = context.tracker.track(
    new InstancedMesh(
      context.tracker.track(new PlaneGeometry(1, 1)),
      glowMaterial(context),
      list.length,
    ),
  );
  list.forEach(({ matrix, colour }, index) => {
    mesh.setMatrixAt(index, matrix);
    mesh.setColorAt(index, colour);
  });
  mesh.instanceMatrix.needsUpdate = true;
  mesh.computeBoundingSphere();
  mesh.name = 'glows';
  return mesh;
}
