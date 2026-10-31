import type { MeshStandardMaterial, WebGLProgramParametersWithUniforms } from 'three';
import { createMaterial } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import type { Point } from '../../../ids';
import { registeredMaterial } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

export type RibAxis = 'tangent' | 'vertical';

export interface Ribs {
  readonly axis: RibAxis;
  readonly pitch: number;
  readonly crest: number;
  readonly flank: number;
  readonly tilt: number;
  readonly valley: number;
}

export interface Seams {
  readonly pitch: Point;
  readonly width: number;
  readonly dark: number;
}

export interface SurfacePattern {
  readonly name: string;
  readonly ribs?: Ribs;
  readonly seams?: Seams;
  readonly mottle?: number;
  readonly underside?: number;
}

const PROGRAM_PREFIX = 'dataCenterSurface';
const LIT_UNDERSIDE = 1;
const PLAIN = 0;
const NO_SEAMS: Seams = { pitch: [PLAIN, PLAIN, PLAIN], width: PLAIN, dark: PLAIN };
const UNIT_CELL_M = 1;

function float(value: number): string {
  return value.toFixed(5);
}

function vec3(values: readonly number[]): string {
  return `vec3(${values.map(float).join(', ')})`;
}

const VERTEX_HEAD = /* glsl */ `#include <common>
varying vec3 vSurfacePosition;
varying vec3 vSurfaceNormal;`;

const VERTEX_BODY = /* glsl */ `#include <begin_vertex>
mat4 surfaceModel = modelMatrix;
#ifdef USE_INSTANCING
surfaceModel = modelMatrix * instanceMatrix;
#endif
vSurfacePosition = (surfaceModel * vec4(transformed, 1.0)).xyz;
vSurfaceNormal = mat3(surfaceModel) * objectNormal;`;

const FRAGMENT_HEAD = /* glsl */ `#include <common>
varying vec3 vSurfacePosition;
varying vec3 vSurfaceNormal;
float surfaceHash(vec3 cell) {
  return fract(sin(dot(cell, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
float surfaceSeam(float coordinate, float pitch, float width) {
  if (pitch <= 0.0) return 0.0;
  float blur = max(fwidth(coordinate), 1e-5);
  float distanceToSeam = abs(fract(coordinate / pitch + 0.5) - 0.5) * pitch;
  float edge = 0.5 * max(width, blur);
  return (1.0 - smoothstep(0.5 * edge, edge, distanceToSeam)) * min(1.0, width / blur);
}`;

function ribChunk(ribs: Ribs): string {
  const tangent =
    ribs.axis === 'vertical'
      ? 'float ribAt = vSurfacePosition.y; vec3 ribTangent = vec3(0.0, 1.0, 0.0);'
      : `bool ribAlongX = abs(surfaceNormal.z) > abs(surfaceNormal.x);
float ribAt = ribAlongX ? vSurfacePosition.x : vSurfacePosition.z;
vec3 ribTangent = ribAlongX ? vec3(1.0, 0.0, 0.0) : vec3(0.0, 0.0, 1.0);`;
  const crest = float(ribs.crest);
  const flank = float(ribs.flank);
  return /* glsl */ `${tangent}
float ribPhase = fract(ribAt / ${float(ribs.pitch)});
float ribHeight = smoothstep(1.0 - ${flank}, 1.0, ribPhase) + 1.0 - smoothstep(${crest}, ${crest} + ${flank}, ribPhase);
float ribSlope = step(1.0 - ${flank}, ribPhase) - step(${crest}, ribPhase) * step(ribPhase, ${crest} + ${flank});
float ribFade = surfaceWall * (1.0 - smoothstep(0.1, 0.3, fwidth(ribAt) / ${float(ribs.pitch)}));
vec3 ribViewTangent = normalize((viewMatrix * vec4(ribTangent, 0.0)).xyz);
normal = normalize(normal - ribSlope * ${float(ribs.tilt)} * ribFade * ribViewTangent);
float ribValley = mix(1.0 - ${crest} - ${flank}, 1.0 - ribHeight, ribFade);
surfaceShade *= 1.0 - ${float(ribs.valley)} * ribValley * surfaceWall;`;
}

function fragmentBody(pattern: SurfacePattern): string {
  const seams = pattern.seams ?? NO_SEAMS;
  const [seamX, seamY, seamZ] = seams.pitch.map(float);
  const width = float(seams.width);
  return /* glsl */ `#include <normal_fragment_maps>
vec3 surfaceNormal = normalize(vSurfaceNormal);
float surfaceWall = 1.0 - abs(surfaceNormal.y);
float surfaceShade = 1.0;
${pattern.ribs ? ribChunk(pattern.ribs) : ''}
vec3 surfaceAcross = 1.0 - abs(surfaceNormal);
float surfaceSeams = max(max(
  surfaceSeam(vSurfacePosition.x, ${seamX}, ${width}) * surfaceAcross.x,
  surfaceSeam(vSurfacePosition.y, ${seamY}, ${width}) * surfaceAcross.y),
  surfaceSeam(vSurfacePosition.z, ${seamZ}, ${width}) * surfaceAcross.z);
surfaceShade *= 1.0 - ${float(seams.dark)} * surfaceSeams;
surfaceShade *= 1.0 - ${float(pattern.mottle ?? PLAIN)} * surfaceHash(floor(vSurfacePosition * surfaceAcross / ${vec3(seams.pitch.map((pitch) => pitch || UNIT_CELL_M))} + 0.5));
surfaceShade *= mix(1.0, ${float(pattern.underside ?? LIT_UNDERSIDE)}, step(0.5, -surfaceNormal.y));
diffuseColor.rgb *= surfaceShade;`;
}

function patch(shader: WebGLProgramParametersWithUniforms, pattern: SurfacePattern): void {
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', VERTEX_HEAD)
    .replace('#include <begin_vertex>', VERTEX_BODY);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', FRAGMENT_HEAD)
    .replace('#include <normal_fragment_maps>', fragmentBody(pattern));
}

export function patternedMaterial(
  context: PartContext,
  group: EmphasisGroup,
  finish: MaterialFinish,
  pattern: SurfacePattern,
): MeshStandardMaterial {
  const material = createMaterial(finish);
  material.onBeforeCompile = (shader) => patch(shader, pattern);
  material.customProgramCacheKey = () => `${PROGRAM_PREFIX}-${pattern.name}`;
  return registeredMaterial(context, group, material);
}
