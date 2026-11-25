import { BufferGeometry, Float32BufferAttribute, Mesh } from 'three';
import { GROUND_EXTENT_M, RIDGE_START_Z_M } from '../../constants';
import { backdropMaterial, colour } from './atmosphere';
import type { Backdrop } from './atmosphere';
import { ATMOSPHERE_GLSL, LIGHT_GLSL, NOISE_GLSL, OUTPUT_GLSL } from './glsl';

const RIDGE = {
  innerHalfM: 1200,
  outerHalfM: GROUND_EXTENT_M,
  innerColumnM: 10,
  outerColumnM: 60,
  rows: [
    RIDGE_START_Z_M,
    80,
    105,
    140,
    185,
    240,
    305,
    380,
    470,
    580,
    760,
    1100,
    1700,
    GROUND_EXTENT_M,
  ],
} as const;

function columnPositions(): number[] {
  const inner = Array.from(
    { length: Math.round((RIDGE.innerHalfM * 2) / RIDGE.innerColumnM) + 1 },
    (_, index) => -RIDGE.innerHalfM + index * RIDGE.innerColumnM,
  );
  const outerCount = Math.round((RIDGE.outerHalfM - RIDGE.innerHalfM) / RIDGE.outerColumnM);
  const outer = Array.from(
    { length: outerCount },
    (_, index) => RIDGE.innerHalfM + (index + 1) * RIDGE.outerColumnM,
  );
  return [...outer.map((x) => -x).reverse(), ...inner, ...outer];
}

const PALETTE = {
  scrub: { color: '#5f6b3e', intensity: 0.75 },
  dry: { color: '#a69462', intensity: 0.75 },
  rock: { color: '#9a8c78', intensity: 0.75 },
  trees: { color: '#2f3f28', intensity: 0.75 },
} as const;

const HEIGHT_GLSL = /* glsl */ `
const vec4 HILLS[5] = vec4[5](
  vec4(3.0, 0.4, 34.0, 0.0),
  vec4(7.0, 2.1, 22.0, 0.004),
  vec4(13.0, 4.0, 14.0, -0.006),
  vec4(29.0, 1.3, 8.0, 0.011),
  vec4(61.0, 5.2, 3.5, -0.017)
);

float ridgeHeight(float u, float z, float x) {
  float rise = smoothstep(62.0, 300.0, z);
  float taper = 1.0 - smoothstep(900.0, 1500.0, abs(x));
  float h = 40.0;
  for (int i = 0; i < 5; i++) {
    vec4 hill = HILLS[i];
    h += hill.z * sin(TAU * hill.x * u / WRAP + hill.y + hill.w * z);
  }
  return max(h, 4.0) * rise * taper * (0.6 + 0.4 * smoothstep(150.0, 450.0, z));
}
`;

const VERTEX = /* glsl */ `
${NOISE_GLSL}
${HEIGHT_GLSL}
uniform float uScroll;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  float u = roadU(world.x, uScroll);
  float step_ = 4.0;
  float h = ridgeHeight(u, world.z, world.x);
  float hx = ridgeHeight(u + step_, world.z, world.x + step_);
  float hz = ridgeHeight(u, world.z + step_, world.x);
  world.y += h;
  vNormal = normalize(vec3(h - hx, step_, h - hz));
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = /* glsl */ `
${NOISE_GLSL}
${ATMOSPHERE_GLSL}
${LIGHT_GLSL}
uniform float uScroll;
uniform vec3 uScrub;
uniform vec3 uDry;
uniform vec3 uRock;
uniform vec3 uTrees;
varying vec3 vWorld;
varying vec3 vNormal;
void main() {
  vec3 normal = normalize(vNormal);
  float u = roadU(vWorld.x, uScroll);
  float patches = cellNoise(vec2(u * 0.025, vWorld.z * 0.025), WRAP * 0.025);
  float speckle = cellNoise(vec2(u * 0.3125, vWorld.z * 0.3125), WRAP * 0.3125);
  float steep = 1.0 - normal.y;
  vec3 albedo = mix(uScrub, uDry, smoothstep(0.45, 0.75, patches));
  albedo = mix(albedo, uRock, smoothstep(0.25, 0.45, steep) * 0.7);
  float clusters = cellNoise(vec2(u * 0.0625, vWorld.z * 0.0625), WRAP * 0.0625);
  albedo = mix(albedo, uTrees, smoothstep(0.62, 0.8, speckle) * smoothstep(0.45, 0.7, clusters) * (1.0 - steep) * 0.7);
  vec3 colour = lit(albedo, normal, 1.0);
  gl_FragColor = vec4(hazed(colour, vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;

function ridgeGeometry(): BufferGeometry {
  const xs = columnPositions();
  const columns = xs.length;
  const positions: number[] = [];
  const index: number[] = [];
  RIDGE.rows.forEach((z) => xs.forEach((x) => positions.push(x, 0, z)));
  for (let row = 0; row < RIDGE.rows.length - 1; row += 1) {
    for (let column = 0; column < columns - 1; column += 1) {
      const a = row * columns + column;
      const b = a + columns;
      index.push(a, b, a + 1, a + 1, b, b + 1);
    }
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.setIndex(index);
  return geometry;
}

export function buildRidge(backdrop: Backdrop): Mesh {
  const material = backdropMaterial(
    backdrop,
    {
      uScrub: colour(PALETTE.scrub.color, PALETTE.scrub.intensity),
      uDry: colour(PALETTE.dry.color, PALETTE.dry.intensity),
      uRock: colour(PALETTE.rock.color, PALETTE.rock.intensity),
      uTrees: colour(PALETTE.trees.color, PALETTE.trees.intensity),
    },
    { vertexShader: VERTEX, fragmentShader: FRAGMENT },
  );
  const ridge = new Mesh(backdrop.context.tracker.track(ridgeGeometry()), material);
  ridge.name = 'ridge';
  ridge.frustumCulled = false;
  return ridge;
}
