import { BackSide, CanvasTexture, Color, DoubleSide, Group, Mesh } from 'three';
import { RepeatWrapping, ShaderMaterial, SphereGeometry, Vector4 } from 'three';
import type { Material, Matrix4 } from 'three';
import { lerp } from '@core/math';
import { createMaterial } from '@core/scene/materials';
import type { Extent } from '@core/scene/regions';
import { GANTRY, SUBSTATION_YARD, boxSpan } from '../../../model';
import { THEME } from '../../../theme';
import { FINISHES } from '../../finishes';
import { SITE_GROUP, namedGroup, placement, registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';
import { GRASS_Y, YARD_Y } from './constants';
import type { PieceBuilder } from './kit';
import { adder, strut } from './substationKit';

type Rect = Readonly<Record<'x' | 'z', Extent>>;
type Surface = 'grass' | 'road' | 'gravel';
export type FenceLine = readonly number[];

const HALF_M = 900;
const SLAB_BOTTOM_Y = GRASS_Y - 0.04;
const GATE_CLEARANCE_M = 0.5;
const EDGE = { inset: 0.25, width: 0.12, height: 0.05 };
const EDGE_PAINT = { color: '#d6d3c8', roughness: 0.8 } as const;
const DOME = { segments: 24, renderOrder: -1000 };
const SKY_COLOURS = { uTop: THEME.sky, uHorizon: THEME.fog, uGlow: '#e4e7e8' };
const MOTTLES: Readonly<Record<Surface, readonly number[]>> = {
  grass: [0.42, 0.08, 0.55, 3.1],
  road: [0.1, 0.07, 0, 0.7],
  gravel: [0.16, 0.16, 0, 0.45],
};
const FENCE = { height: 2.4, pitch: 3, post: 0.07, rail: 0.04, low: 0.08, panel: 2.27 };
const MESH = { tile: 0.6, pixels: 64, cells: 8 };
const PANEL = { color: '#80878e', roughness: 0.5, metalness: 0.5, opacity: 0.85 } as const;
const SEE_THROUGH = { transparent: true, depthWrite: false, side: DoubleSide } as const;
const YARD = boxSpan(SUBSTATION_YARD);
const ROAD: Rect = { x: [-HALF_M, 25], z: [-20.1, -15.1] };
const PERIMETER: Rect = { x: [-100, 48], z: [-36, 30] };
const GENERATOR_YARD: Rect = { x: [-33, ROAD.x[1]], z: [-29.5, ROAD.z[0]] };

export const SUBSTATION: Rect = { x: [GANTRY.base[0] - 2.5, YARD.x[1]], z: YARD.z };
export const SUBSTATION_GATE: Extent = [-58, -54];
const SPUR: Rect = { x: SUBSTATION_GATE, z: [ROAD.z[1], SUBSTATION.z[0]] };

const NOISE = /* glsl */ `#include <common>
varying vec2 vSiteXZ;
uniform vec4 uMottle;
float siteHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float siteNoise(vec2 p) { vec2 i = floor(p), u = smoothstep(0.0, 1.0, fract(p)); return mix(mix(siteHash(i), siteHash(i + vec2(1, 0)), u.x), mix(siteHash(i + vec2(0, 1)), siteHash(i + 1.0), u.x), u.y); }`;

const TONE = /* glsl */ `#include <color_fragment>
float siteBroad = siteNoise(vSiteXZ / 61.0) * 0.6 + siteNoise(vSiteXZ / 17.0) * 0.4 - 0.5;
float siteDry = smoothstep(0.5, 0.85, siteNoise(vSiteXZ / 150.0 + 7.0)) * uMottle.z;
diffuseColor.rgb *= (1.0 + siteBroad * uMottle.x + (siteNoise(vSiteXZ / uMottle.w) - 0.5) * uMottle.y) * mix(vec3(1.0), vec3(1.16, 1.08, 0.78), siteDry);`;

const WORLD = /* glsl */ `#include <begin_vertex>
vSiteXZ = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xz;`;

const SKY_VERTEX = /* glsl */ `varying vec3 vSkyDirection;
void main() { vSkyDirection = position; gl_Position = (projectionMatrix * vec4(mat3(viewMatrix) * position, 1.0)).xyww; }`;

const SKY_FRAGMENT = /* glsl */ `uniform vec3 uTop, uHorizon, uGlow;
varying vec3 vSkyDirection;
void main() {
  float up = normalize(vSkyDirection).y;
  gl_FragColor = vec4(mix(mix(uHorizon, uTop, 1.0 - exp(-max(up, 0.0) * 5.0)), uGlow, (1.0 - smoothstep(0.0, 0.14, abs(up))) * 0.45), 1.0);
  #include <colorspace_fragment>
}`;

export function mottled(context: PartContext, group: EmphasisGroup, surface: Surface): Material {
  const material = createMaterial(FINISHES[surface]);
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uMottle = { value: new Vector4().fromArray(MOTTLES[surface]) };
    const vertex = `varying vec2 vSiteXZ;\n${shader.vertexShader}`;
    shader.vertexShader = vertex.replace('#include <begin_vertex>', WORLD);
    const fragment = shader.fragmentShader.replace('#include <common>', NOISE);
    shader.fragmentShader = fragment.replace('#include <color_fragment>', TONE);
  };
  material.customProgramCacheKey = () => 'dataCenterMottle';
  return registeredMaterial(context, group, material);
}

export function slab({ x, z }: Rect, top: number, bottom = SLAB_BOTTOM_Y): Matrix4 {
  const size = [x[1] - x[0], top - bottom, z[1] - z[0]] as const;
  return placement([(x[0] + x[1]) / 2, (top + bottom) / 2, (z[0] + z[1]) / 2], size);
}

function sky(context: PartContext): Mesh {
  const uniforms = Object.fromEntries(
    Object.entries(SKY_COLOURS).map(([name, colour]) => [name, { value: new Color(colour) }]),
  );
  const shading = { vertexShader: SKY_VERTEX, fragmentShader: SKY_FRAGMENT, uniforms };
  const material = new ShaderMaterial({ ...shading, side: BackSide, toneMapped: false });
  material.depthTest = material.depthWrite = false;
  registeredMaterial(context, SITE_GROUP, material);
  const dome = new Mesh(new SphereGeometry(1, DOME.segments, DOME.segments / 2), material);
  context.tracker.track(dome.geometry);
  dome.frustumCulled = false;
  dome.renderOrder = DOME.renderOrder;
  return dome;
}

function meshTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = MESH.pixels;
  const paint = canvas.getContext('2d');
  if (paint) {
    paint.strokeStyle = '#fff';
    for (let offset = -MESH.pixels; offset <= MESH.pixels; offset += MESH.pixels / MESH.cells) {
      paint.moveTo(offset, 0);
      paint.lineTo(offset + MESH.pixels, MESH.pixels);
      paint.moveTo(offset, MESH.pixels);
      paint.lineTo(offset + MESH.pixels, 0);
    }
    paint.stroke();
  }
  const texture = new CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = RepeatWrapping;
  return texture;
}

export function fence(context: PartContext, group: EmphasisGroup, lines: FenceLine[]): Group {
  const parent = new Group();
  const runs = lines.flatMap((line) =>
    Array.from({ length: line.length / 2 - 1 }, (_, run) => line.slice(run * 2, run * 2 + 4)),
  );
  const bays = runs.flatMap(([x0, z0, x1, z1]) => {
    const count = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / FENCE.pitch);
    const spot = (share: number) => [lerp(x0, x1, share), lerp(z0, z1, share)];
    const ends = (bay: number) => [...spot(bay / count), ...spot((bay + 1) / count)];
    return Array.from({ length: count }, (_, bay) => ends(bay));
  });
  const [low, top] = [GRASS_Y + FENCE.low, GRASS_Y + FENCE.height];
  const posts = [...bays, ...lines.map((line) => line.slice(-2))].map(([x, z]) =>
    strut([x, GRASS_Y, z], [x, top, z], FENCE.post),
  );
  const rails = bays.flatMap(([x0, z0, x1, z1]) =>
    [low, top].map((y) => strut([x0, y, z0], [x1, y, z1], FENCE.rail)),
  );
  const panels = bays.map(([x0, z0, x1, z1]) => {
    const centre = [(x0 + x1) / 2, low + FENCE.panel / 2, (z0 + z1) / 2] as const;
    const size = [Math.hypot(x1 - x0, z1 - z0), FENCE.panel, 1] as const;
    return placement(centre, size, Math.atan2(z0 - z1, x1 - x0));
  });
  const texture = context.tracker.track(meshTexture());
  texture.repeat.set(FENCE.pitch / MESH.tile, FENCE.panel / MESH.tile);
  const material = createMaterial({ ...PANEL, ...SEE_THROUGH, alphaMap: texture });
  const add = adder(context, group, parent);
  add('fence', 'round', [...posts, ...rails]);
  add(registeredMaterial(context, group, material), 'panel', panels);
  return parent;
}

function perimeter(): FenceLine[] {
  const [[west, east], [north, south]] = [PERIMETER.x, PERIMETER.z];
  const [gateNorth, gateSouth] = [ROAD.z[0] - GATE_CLEARANCE_M, ROAD.z[1] + GATE_CLEARANCE_M];
  return [[west, gateNorth, west, north, east, north, east, south, west, south, west, gateSouth]];
}

function edgeLines(): Matrix4[] {
  const line = (from: number, to: number, z: number) =>
    placement([(from + to) / 2, YARD_Y, z], [to - from, EDGE.height, EDGE.width]);
  const [north, south] = [ROAD.z[0] + EDGE.inset, ROAD.z[1] - EDGE.inset];
  const [[west, east], [gateWest, gateEast]] = [ROAD.x, SUBSTATION_GATE];
  return [line(west, east, north), line(west, gateWest, south), line(gateEast, east, south)];
}

export const buildSite: PieceBuilder = (context, root) => {
  const group = namedGroup(SITE_GROUP, root);
  const add = adder(context, SITE_GROUP, group);
  const surface = (name: Surface) => mottled(context, SITE_GROUP, name);
  const ground: Rect = { x: [-HALF_M, HALF_M], z: [-HALF_M, HALF_M] };
  group.add(sky(context), fence(context, SITE_GROUP, perimeter()));
  add(surface('grass'), 'box', [slab(ground, GRASS_Y)]);
  add(surface('road'), 'box', [slab(ROAD, YARD_Y), slab(SPUR, YARD_Y)]);
  add(surface('gravel'), 'box', [slab(GENERATOR_YARD, YARD_Y)]);
  add(EDGE_PAINT, 'box', edgeLines());
  return {};
};
