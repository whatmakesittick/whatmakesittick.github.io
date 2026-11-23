import { Mesh, PlaneGeometry, Vector4 } from 'three';
import {
  CENTRE_LINE_DASH_M,
  CENTRE_LINE_Z_M,
  DELINEATOR_HEIGHT_M,
  PATTERN_PERIODS_M,
  ROAD,
  WALL,
} from '../../../model/layout';
import { THEME } from '../../../theme';
import { DELINEATOR_Z_M, GROUND_EXTENT_M, KERB, LAMP_Z_M, LAYER } from '../../constants';
import { backdropMaterial, colour } from './atmosphere';
import type { Backdrop } from './atmosphere';
import { ATMOSPHERE_GLSL, LIGHT_GLSL, NOISE_GLSL, OUTPUT_GLSL } from './glsl';
import { LAMP, POST_OFFSETS } from './placement';

const WALL_FACE_Z_M = WALL.zM + WALL.thicknessM / 2;
const GROUND = { nearZ: WALL_FACE_Z_M, farZ: GROUND_EXTENT_M } as const;
const WALL_SHADE = { widthM: 1.1, strength: 0.85 } as const;
const POST_WIDTH_M = 0.1;

const PALETTE = {
  asphalt: { color: THEME.road, intensity: 0.85 },
  asphaltLight: { color: '#77736d', intensity: 0.9 },
  asphaltDark: { color: '#2e2e31', intensity: 0.9 },
  paint: { color: THEME.roadLine, intensity: 0.92 },
  footway: { color: '#b3aa9a', intensity: 0.8 },
  gravel: { color: '#a59a86', intensity: 0.75 },
  grass: { color: '#6b7f45', intensity: 0.7 },
  grassDry: { color: '#9d9058', intensity: 0.7 },
  grassDeep: { color: '#46603a', intensity: 0.7 },
  scrub: { color: '#6d7448', intensity: 0.7 },
} as const;

const VERTEX = /* glsl */ `
varying vec3 vWorld;
void main() {
  vec4 world = modelMatrix * vec4(position, 1.0);
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const FRAGMENT = /* glsl */ `
${NOISE_GLSL}
${ATMOSPHERE_GLSL}
${LIGHT_GLSL}
uniform float uScroll;
uniform vec4 uRoad;
uniform vec4 uPaintLines;
uniform vec4 uWallShade;
uniform vec4 uPosts;
uniform vec4 uLamps;
uniform vec3 uAsphalt;
uniform vec3 uAsphaltLight;
uniform vec3 uAsphaltDark;
uniform vec3 uPaint;
uniform vec3 uFootway;
uniform vec3 uGravel;
uniform vec3 uGrass;
uniform vec3 uGrassDry;
uniform vec3 uGrassDeep;
uniform vec3 uScrub;
varying vec3 vWorld;

float postShadow(float u, float z, vec4 post, float width) {
  vec2 dir = -normalize(uSunDir.xz);
  float along = (z - post.z) / dir.y;
  float reach = post.w * length(uSunDir.xz) / uSunDir.y;
  float base = u - along * dir.x;
  float nearest = post.y + floor((base - post.y) / post.x + 0.5) * post.x;
  float across = abs(base - nearest) * dir.y;
  float halfWidth = width * 0.5 + along * 0.006;
  float soft = 0.015 + along * 0.004;
  float edge = 1.0 - smoothstep(halfWidth - soft, halfWidth + soft, across);
  float ends = step(0.0, along) * (1.0 - smoothstep(reach - 0.4, reach + 0.4, along));
  return edge * ends * (1.0 - along / (reach * 3.0));
}

float band(float z, float from, float to, float aa) {
  return smoothstep(from - aa, from + aa, z) * (1.0 - smoothstep(to - aa, to + aa, z));
}

vec3 asphalt(float u, float z, out float polish) {
  float mottle = cellNoise(vec2(u * 0.8, z * 0.8), WRAP * 0.8);
  float fine = cellNoise(vec2(u * 6.0, z * 6.0), WRAP * 6.0);
  vec2 grainCell = floor(vec2(u * 40.0, z * 40.0));
  float grain = hash12(vec2(mod(grainCell.x, WRAP * 40.0), grainCell.y));
  float aa = smoothstep(0.25, 0.9, fwidth(u * 40.0));
  grain = mix(grain, 0.5, aa);
  float laneCentre = z < uRoad.z ? uRoad.x + 1.8 : uRoad.z + 1.8;
  float track = exp(-pow(abs(z - laneCentre) - 0.85, 2.0) / 0.05);
  polish = track;
  vec3 colour = mix(uAsphalt, uAsphaltDark, track * 0.35 + (1.0 - mottle) * 0.25);
  colour = mix(colour, uAsphaltLight, smoothstep(0.78, 0.98, grain) * 0.55 + fine * 0.12);
  colour *= 0.92 + grain * 0.12;
  float cell = floor(u / 24.0);
  float pick = hash12(vec2(mod(cell, WRAP / 24.0), 3.0));
  float local = u - cell * 24.0;
  float patchLength = 3.0 + pick * 6.0;
  float patchZ = uRoad.x + 0.6 + fract(pick * 13.7) * 3.4;
  float inPatch = step(0.62, pick) * band(local, 4.0, 4.0 + patchLength, 0.02) * band(z, patchZ, patchZ + 1.4, 0.02);
  colour = mix(colour, uAsphaltDark * 1.2 + grain * 0.03, inPatch * 0.75);
  return colour;
}

float paint(float u, float z) {
  float aa = max(fwidth(z), 0.004);
  float dash = step(mod(u, uPaintLines.x), uPaintLines.y);
  float centre = band(z, uPaintLines.z - uPaintLines.w * 0.5, uPaintLines.z + uPaintLines.w * 0.5, aa) * dash;
  float nearEdge = band(z, uRoad.x + 0.12, uRoad.x + 0.12 + uPaintLines.w, aa);
  float farEdge = band(z, uRoad.y - 0.12 - uPaintLines.w, uRoad.y - 0.12, aa);
  float wear = smoothstep(0.15, 0.45, cellNoise(vec2(u * 3.0, z * 9.0), WRAP * 3.0));
  return max(centre, max(nearEdge, farEdge)) * (0.55 + 0.45 * wear);
}

vec3 verge(float u, float z) {
  float low = cellNoise(vec2(u * 0.12, z * 0.12), WRAP * 0.12);
  float mid = cellNoise(vec2(u * 0.7, z * 0.7), WRAP * 0.7);
  float fine = cellNoise(vec2(u * 9.0, z * 9.0), WRAP * 9.0);
  vec3 grass = mix(uGrass, uGrassDry, smoothstep(0.45, 0.8, low));
  grass = mix(grass, uGrassDeep, smoothstep(0.55, 0.85, mid) * 0.7);
  grass *= 0.86 + fine * 0.26;
  grass = mix(grass, uScrub, smoothstep(30.0, 90.0, z));
  float gravel = 1.0 - smoothstep(uRoad.w + 0.35, uRoad.w + 0.7, z + (fine - 0.5) * 0.25);
  return mix(grass, uGravel * (0.85 + fine * 0.3), gravel);
}

void main() {
  vec3 ray = vWorld - cameraPosition;
  vec3 view = normalize(ray);
  float u = roadU(vWorld.x, uScroll);
  float z = vWorld.z;
  float polish = 0.0;
  vec3 albedo;
  float sheen;
  if (z < uRoad.x - 0.15) {
    float joint = smoothstep(0.012, 0.0, abs(fract(u) - 0.5) - 0.488);
    albedo = uFootway * (0.94 + cellNoise(vec2(u * 3.0, z * 3.0), WRAP * 3.0) * 0.12) * (1.0 - joint * 0.35);
    sheen = 0.08;
  } else if (z < uRoad.y) {
    albedo = asphalt(u, z, polish);
    float line = paint(u, z);
    albedo = mix(albedo, uPaint, line);
    sheen = 0.16 + polish * 0.18 + line * 0.15;
  } else {
    albedo = verge(u, z);
    sheen = 0.07;
  }
  float shade = postShadow(u, z, uPosts, ${POST_WIDTH_M.toFixed(2)});
  shade = max(shade, postShadow(u, z, uLamps, 0.15));
  float wallDistance = z - uWallShade.x;
  shade = max(shade, (1.0 - smoothstep(0.0, uWallShade.y, wallDistance)) * uWallShade.z);
  vec3 up = vec3(0.0, 1.0, 0.0);
  vec3 sun = sunTerm(up) * (1.0 - shade);
  vec3 colour = albedo * (sun + ambientTerm(up));
  float glint = pow(max(dot(reflect(view, up), uSunDir), 0.0), 40.0);
  colour += uSunLight * glint * sheen * 0.35 * (1.0 - shade);
  gl_FragColor = vec4(hazed(colour, vWorld), 1.0);
  ${OUTPUT_GLSL}
}
`;

export function buildGround(backdrop: Backdrop): Mesh {
  const depth = GROUND.farZ - GROUND.nearZ;
  const geometry = new PlaneGeometry(GROUND_EXTENT_M * 2, depth)
    .rotateX(-Math.PI / 2)
    .translate(0, 0, GROUND.nearZ + depth / 2);
  const uniforms = {
    uRoad: {
      value: new Vector4(ROAD.zMinM, ROAD.zMaxM, CENTRE_LINE_Z_M, ROAD.zMaxM + KERB.widthM),
    },
    uPaintLines: {
      value: new Vector4(
        PATTERN_PERIODS_M.centreLine,
        CENTRE_LINE_DASH_M,
        CENTRE_LINE_Z_M,
        ROAD.edgeLineM,
      ),
    },
    uWallShade: { value: new Vector4(GROUND.nearZ, WALL_SHADE.widthM, WALL_SHADE.strength, 0) },
    uPosts: {
      value: new Vector4(
        PATTERN_PERIODS_M.delineator,
        POST_OFFSETS.delineator,
        DELINEATOR_Z_M,
        DELINEATOR_HEIGHT_M,
      ),
    },
    uLamps: {
      value: new Vector4(PATTERN_PERIODS_M.lamp, POST_OFFSETS.lamp, LAMP_Z_M, LAMP.heightM),
    },
    uAsphalt: colour(PALETTE.asphalt.color, PALETTE.asphalt.intensity),
    uAsphaltLight: colour(PALETTE.asphaltLight.color, PALETTE.asphaltLight.intensity),
    uAsphaltDark: colour(PALETTE.asphaltDark.color, PALETTE.asphaltDark.intensity),
    uPaint: colour(PALETTE.paint.color, PALETTE.paint.intensity),
    uFootway: colour(PALETTE.footway.color, PALETTE.footway.intensity),
    uGravel: colour(PALETTE.gravel.color, PALETTE.gravel.intensity),
    uGrass: colour(PALETTE.grass.color, PALETTE.grass.intensity),
    uGrassDry: colour(PALETTE.grassDry.color, PALETTE.grassDry.intensity),
    uGrassDeep: colour(PALETTE.grassDeep.color, PALETTE.grassDeep.intensity),
    uScrub: colour(PALETTE.scrub.color, PALETTE.scrub.intensity),
  };
  const material = backdropMaterial(backdrop, uniforms, {
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
  });
  const ground = new Mesh(backdrop.context.tracker.track(geometry), material);
  ground.name = 'ground';
  ground.renderOrder = LAYER.ground;
  return ground;
}
