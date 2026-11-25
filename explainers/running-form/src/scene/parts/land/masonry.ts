import { BoxGeometry, Mesh, Vector4 } from 'three';
import type { BufferGeometry } from 'three';
import { ROAD, WALL } from '../../../model/layout';
import { THEME } from '../../../theme';
import { BEACH_TOP_M, GROUND_EXTENT_M, KERB, LAYER, PARAPET } from '../../constants';
import { shadowReachZ } from '../../sun';
import { backdropMaterial, colour } from './atmosphere';
import type { Backdrop } from './atmosphere';
import { LONG_SEGMENTS, denseNearOrigin } from './spacing';
import { ATMOSPHERE_GLSL, LIGHT_GLSL, NOISE_GLSL, OUTPUT_GLSL, WORLD_VERTEX } from './glsl';

interface MasonryLook {
  readonly block: readonly [length: number, course: number, mortar: number, stagger: number];
  readonly base: string;
  readonly light: string;
  readonly mortar: string;
  readonly shade: readonly [fromZ: number, widthM: number, strength: number];
}

const WALL_LOOK: MasonryLook = {
  block: [0.9, 0.34, 0.012, 1],
  base: '#73654f',
  light: '#9a876a',
  mortar: '#9a8e7c',
  shade: [0, 0, 0],
};

const COPING_LOOK: MasonryLook = {
  block: [1.2, 1, 0.01, 0],
  base: '#c8bea9',
  light: '#ddd3bf',
  mortar: '#8f877a',
  shade: [0, 0, 0],
};

const KERB_LOOK: MasonryLook = {
  block: [1, 1, 0.008, 0],
  base: THEME.kerb,
  light: '#b0ada6',
  mortar: '#5c5a56',
  shade: [PARAPET.faceZM, shadowReachZ(PARAPET.heightM), 1],
};

const COPING = { heightM: 0.07, overhangM: 0.05 } as const;
const KERB_DEPTH_M = 0.05;
const WET_LINE_M = BEACH_TOP_M + 0.25;

const FRAGMENT = /* glsl */ `
${NOISE_GLSL}
${ATMOSPHERE_GLSL}
${LIGHT_GLSL}
uniform float uScroll;
uniform vec4 uBlock;
uniform vec4 uShade;
uniform vec3 uBase;
uniform vec3 uLight;
uniform vec3 uMortar;
varying vec3 vWorld;
varying vec3 vNormal;

void main() {
  vec3 normal = normalize(vNormal);
  float u = roadU(vWorld.x, uScroll);
  float v = abs(normal.y) > 0.5 ? vWorld.z * 3.0 : vWorld.y;
  float row = floor(v / uBlock.y);
  float along = u / uBlock.x + hash12(vec2(row, 7.0)) * uBlock.w;
  float column = floor(along);
  float pick = hash12(vec2(mod(column, floor(WRAP / uBlock.x)), row));
  float split = 0.3 + 0.4 * fract(pick * 7.13);
  float local = fract(along);
  float second = step(split, local) * step(0.5, fract(pick * 3.7));
  float stone = hash12(vec2(mod(column, floor(WRAP / uBlock.x)) + second * 0.5, row + 0.5));
  float jointX = min(local, 1.0 - local);
  jointX = mix(jointX, min(jointX, abs(local - split)), step(0.5, fract(pick * 3.7)));
  vec2 inBlock = vec2(jointX * uBlock.x, fract(v / uBlock.y) * uBlock.y);
  float edge = min(inBlock.x, min(inBlock.y, uBlock.y - inBlock.y));
  float mortar = 1.0 - smoothstep(uBlock.z * 0.5, uBlock.z * 1.6, edge);
  float weather = cellNoise(vec2(u * 2.5, v * 2.5), WRAP * 2.5);
  float grain = hash12(floor(vec2(mod(u * 40.0, WRAP * 40.0), v * 40.0)));
  vec3 albedo = mix(uBase, uLight, stone * 0.85 + weather * 0.25) * (0.86 + 0.18 * grain);
  albedo *= 1.0 - smoothstep(0.03, 0.0, edge - uBlock.z) * 0.08;
  albedo = mix(albedo, uMortar, mortar * 0.8);
  float wet = 1.0 - smoothstep(${WET_LINE_M.toFixed(2)} - 0.1, ${WET_LINE_M.toFixed(2)} + 0.15, vWorld.y + (weather - 0.5) * 0.2);
  albedo *= 1.0 - wet * 0.35;
  float shade = uShade.z * (1.0 - smoothstep(0.0, uShade.y, vWorld.z - uShade.x)) * step(0.001, uShade.y);
  vec3 colour = lit(albedo, normal, 1.0 - shade);
  gl_FragColor = vec4(hazed(colour, vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;

function masonry(
  backdrop: Backdrop,
  look: MasonryLook,
  geometry: BufferGeometry,
  name: string,
): Mesh {
  const material = backdropMaterial(
    backdrop,
    {
      uBlock: { value: new Vector4(...look.block) },
      uShade: { value: new Vector4(...look.shade, 0) },
      uBase: colour(look.base),
      uLight: colour(look.light),
      uMortar: colour(look.mortar),
    },
    { vertexShader: WORLD_VERTEX, fragmentShader: FRAGMENT },
  );
  const mesh = new Mesh(backdrop.context.tracker.track(geometry), material);
  mesh.name = name;
  mesh.renderOrder = LAYER.ground;
  return mesh;
}

function box(width: number, height: number, depth: number, y: number, z: number): BufferGeometry {
  const geometry = new BoxGeometry(width, height, depth, LONG_SEGMENTS);
  geometry.translate(0, y, z);
  return denseNearOrigin(geometry, 'x', width / 2);
}

export function buildMasonry(backdrop: Backdrop): Mesh[] {
  const length = GROUND_EXTENT_M * 2;
  const wallTop = PARAPET.heightM - COPING.heightM;
  const wallHeight = wallTop - BEACH_TOP_M;
  const kerbHeight = KERB.heightM + KERB_DEPTH_M;
  const kerbY = KERB.heightM - kerbHeight / 2;
  return [
    masonry(
      backdrop,
      WALL_LOOK,
      box(length, wallHeight, WALL.thicknessM, BEACH_TOP_M + wallHeight / 2, WALL.zM),
      'seaWall',
    ),
    masonry(
      backdrop,
      COPING_LOOK,
      box(
        length,
        COPING.heightM,
        WALL.thicknessM + COPING.overhangM * 2,
        wallTop + COPING.heightM / 2,
        WALL.zM,
      ),
      'wallCoping',
    ),
    masonry(
      backdrop,
      KERB_LOOK,
      box(length, kerbHeight, KERB.widthM, kerbY, ROAD.zMinM - KERB.widthM / 2),
      'seaKerb',
    ),
    masonry(
      backdrop,
      KERB_LOOK,
      box(length, kerbHeight, KERB.widthM, kerbY, ROAD.zMaxM + KERB.widthM / 2),
      'landKerb',
    ),
  ];
}
