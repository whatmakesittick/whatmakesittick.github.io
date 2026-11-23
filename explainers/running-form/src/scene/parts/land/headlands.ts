import type { BufferAttribute } from 'three';
import { Color, InstancedMesh, SphereGeometry, Vector3 } from 'three';
import { SCROLL_WRAP_M } from '../../../model/layout';
import { SEA_LEVEL_M } from '../../constants';
import { backdropMaterial, colour } from './atmosphere';
import type { Backdrop } from './atmosphere';
import { ATMOSPHERE_GLSL, LIGHT_GLSL, OUTPUT_GLSL } from './glsl';
import { seededRandom } from './placement';
import { ScrollingInstances } from './strip';
import type { StripItem, StripWindow } from './strip';

const FAR_WINDOW: StripWindow = {
  behindM: SCROLL_WRAP_M / 2,
  aheadM: SCROLL_WRAP_M / 2,
  fadeM: 520,
  periodM: SCROLL_WRAP_M,
};

interface Layer {
  readonly count: number;
  readonly z: readonly [number, number];
  readonly width: readonly [number, number];
  readonly depth: readonly [number, number];
  readonly heightShare: readonly [number, number];
  readonly tone: string;
}

const MAX_RISE = Math.tan((5 * Math.PI) / 180);

const LAYERS: readonly Layer[] = [
  {
    count: 3,
    z: [-640, -720],
    width: [380, 700],
    depth: [160, 260],
    heightShare: [0.55, 0.9],
    tone: '#3f4a45',
  },
  {
    count: 4,
    z: [-1100, -1250],
    width: [520, 900],
    depth: [240, 380],
    heightShare: [0.6, 1],
    tone: '#4f5a5c',
  },
  {
    count: 5,
    z: [-2250, -2450],
    width: [700, 1200],
    depth: [300, 500],
    heightShare: [0.55, 1],
    tone: '#66707a',
  },
  {
    count: 3,
    z: [-1700, -2100],
    width: [70, 220],
    depth: [60, 140],
    heightShare: [0.12, 0.25],
    tone: '#4a5452',
  },
  {
    count: 5,
    z: [650, 900],
    width: [600, 1100],
    depth: [300, 500],
    heightShare: [1.2, 2.2],
    tone: '#4d5a3f',
  },
  {
    count: 5,
    z: [1400, 1800],
    width: [800, 1300],
    depth: [400, 600],
    heightShare: [1.4, 2.6],
    tone: '#69705f',
  },
];

const SEED = 41;
const MOUND = { width: 28, height: 10, lump: 0.16 } as const;

const VERTEX = /* glsl */ `
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTone;
void main() {
  vec4 world = modelMatrix * instanceMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  vNormal = normalize(mat3(modelMatrix * instanceMatrix) * normal);
  vTone = instanceColor;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = /* glsl */ `
${ATMOSPHERE_GLSL}
${LIGHT_GLSL}
uniform float uSeaLevel;
uniform vec3 uFoot;
varying vec3 vWorld;
varying vec3 vNormal;
varying vec3 vTone;
void main() {
  vec3 normal = normalize(vNormal);
  float base = 1.0 - smoothstep(0.0, 25.0, vWorld.y - uSeaLevel);
  vec3 albedo = mix(vTone, uFoot, base * 0.6);
  vec3 colour = lit(albedo, normal, 0.35);
  gl_FragColor = vec4(hazed(colour, vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;

function moundGeometry(): SphereGeometry {
  const random = seededRandom(SEED + 1);
  const geometry = new SphereGeometry(1, MOUND.width, MOUND.height, 0, Math.PI * 2, 0, Math.PI / 2);
  const position = geometry.getAttribute('position') as BufferAttribute;
  const vertex = new Vector3();
  for (let index = 0; index < position.count; index += 1) {
    vertex.fromBufferAttribute(position, index);
    if (vertex.y > 1e-3) vertex.multiplyScalar(1 + (random() - 0.5) * MOUND.lump);
    position.setXYZ(index, vertex.x, Math.max(vertex.y, 0), vertex.z);
  }
  geometry.computeVertexNormals();
  return geometry;
}

function between(random: () => number, [from, to]: readonly [number, number]): number {
  return from + (to - from) * random();
}

interface FarItem extends StripItem {
  readonly tone: string;
}

function farItems(): FarItem[] {
  const random = seededRandom(SEED);
  return LAYERS.flatMap((layer) =>
    Array.from({ length: layer.count }, (_, index): FarItem => {
      const z = between(random, layer.z);
      const height = Math.abs(z) * MAX_RISE * between(random, layer.heightShare);
      return {
        x: ((index + random() * 0.6) / layer.count) * SCROLL_WRAP_M,
        y: SEA_LEVEL_M,
        z,
        scale: new Vector3(
          between(random, layer.width) / 2,
          height,
          between(random, layer.depth) / 2,
        ),
        turn: (random() - 0.5) * 0.4,
        tone: layer.tone,
      };
    }),
  );
}

export function buildHeadlands(backdrop: Backdrop): {
  mesh: InstancedMesh;
  mover: ScrollingInstances;
} {
  const items = farItems();
  const material = backdropMaterial(
    backdrop,
    { uSeaLevel: { value: SEA_LEVEL_M }, uFoot: colour('#8a8577', 0.9) },
    { vertexShader: VERTEX, fragmentShader: FRAGMENT },
  );
  const mesh = new InstancedMesh(
    backdrop.context.tracker.track(moundGeometry()),
    material,
    items.length,
  );
  const tone = new Color();
  items.forEach((item, index) => mesh.setColorAt(index, tone.set(item.tone).multiplyScalar(0.6)));
  mesh.name = 'headlands';
  mesh.frustumCulled = false;
  return { mesh, mover: new ScrollingInstances([{ mesh }], items, FAR_WINDOW) };
}
