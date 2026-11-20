import { Color, Vector2 } from 'three';
import type { IUniform, Intersection, Material, Vector3 } from 'three';
import { isMesh } from '@core/scene/occlusion';
import { AXIS_HEIGHT_M } from '../../model/scale';
import { CUT, LOOK } from '../constants';
import { addPatch, glslColor, glslFloat, hasPatch, inject } from './shaderChunks';

export type CutDepth = 'shell' | 'core';

export interface CutUniforms {
  readonly uCutHalf: IUniform<number>;
  readonly uCoreHalf: IUniform<number>;
  readonly uShellCentre: IUniform<Vector2>;
  readonly uCoreCentre: IUniform<Vector2>;
  readonly uCapColor: IUniform<Color>;
}

export const CUT_CENTRES: Readonly<Record<CutDepth, number>> = {
  shell: CUT.centre,
  core: CUT.coreCentre,
};

const CUT_KEY = 'ge9x-cut';
export const CUT_ANGLE_GLSL = /* glsl */ `
uniform vec2 uCutCentre;
float cutAngleAt(vec3 world) {
  float dy = world.y - ${glslFloat(AXIS_HEIGHT_M)};
  float along = world.z * uCutCentre.x + dy * uCutCentre.y;
  float across = dy * uCutCentre.x - world.z * uCutCentre.y;
  return atan(across, along);
}
`;

const VERTEX_HEAD = /* glsl */ `
varying vec3 vCutWorld;
`;

const VERTEX_BODY = /* glsl */ `
vec4 cutWorld = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
cutWorld = instanceMatrix * cutWorld;
#endif
vCutWorld = (modelMatrix * cutWorld).xyz;
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform float uCutHalf;
uniform vec3 uCapColor;
varying vec3 vCutWorld;
${CUT_ANGLE_GLSL}
`;

const FRAGMENT_CLIP = /* glsl */ `
float cutSigned = cutAngleAt(vCutWorld);
if (uCutHalf > 0.0 && abs(cutSigned) < uCutHalf) discard;
`;

const FRAGMENT_CAP = /* glsl */ `
if (uCutHalf > 0.0) {
  float cutRadius = length(vec2(vCutWorld.y - ${glslFloat(AXIS_HEIGHT_M)}, vCutWorld.z));
  float cutRim = (abs(cutSigned) - uCutHalf) * cutRadius;
  if (!gl_FrontFacing) {
    if (diffuseColor.a < ${glslFloat(CUT.capOpacityFloor)}) discard;
    gl_FragColor.rgb = uCapColor * (cutSigned > 0.0 ? 1.0 : ${glslFloat(CUT.lowerFaceShade)});
  } else if (cutRim < ${glslFloat(CUT.rimMetres)}) {
    gl_FragColor.rgb = mix(gl_FragColor.rgb, ${glslColor(LOOK.cutRim)}, ${glslFloat(CUT.rimMix)});
  }
}
`;

interface CutPatch {
  readonly half: IUniform<number>;
  readonly depth: CutDepth;
}

const patched = new WeakMap<Material, CutPatch>();

export function createCutUniforms(capColor: string): CutUniforms {
  return {
    uCutHalf: { value: 0 },
    uCoreHalf: { value: 0 },
    uShellCentre: { value: centreVector(CUT_CENTRES.shell) },
    uCoreCentre: { value: centreVector(CUT_CENTRES.core) },
    uCapColor: { value: new Color(capColor) },
  };
}

export function cutHalfAngle(open: number): number {
  return open * CUT.halfAngle;
}

export function coreHalfAngle(open: number): number {
  return open * CUT.coreHalfAngle;
}

export function halfUniform(cut: CutUniforms, depth: CutDepth): IUniform<number> {
  return depth === 'core' ? cut.uCoreHalf : cut.uCutHalf;
}

export function centreUniform(cut: CutUniforms, depth: CutDepth): IUniform<Vector2> {
  return depth === 'core' ? cut.uCoreCentre : cut.uShellCentre;
}

function centreVector(angle: number): Vector2 {
  return new Vector2(Math.cos(angle), Math.sin(angle));
}

export function applyCut<M extends Material>(material: M, cut: CutUniforms, depth: CutDepth): M {
  const existing = patched.get(material);
  if (existing && existing.depth !== depth) {
    throw new Error(`Material ${material.uuid} is cut at two depths`);
  }
  if (hasPatch(material, CUT_KEY)) return material;
  const half = halfUniform(cut, depth);
  patched.set(material, { half, depth });
  return addPatch(material, CUT_KEY, (shader) => {
    shader.uniforms.uCutHalf = half;
    shader.uniforms.uCutCentre = centreUniform(cut, depth);
    shader.uniforms.uCapColor = cut.uCapColor;
    shader.vertexShader = inject(shader.vertexShader, '#include <common>', VERTEX_HEAD);
    shader.vertexShader = inject(shader.vertexShader, '#include <project_vertex>', VERTEX_BODY);
    shader.fragmentShader = inject(shader.fragmentShader, '#include <common>', FRAGMENT_HEAD);
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <clipping_planes_fragment>',
      FRAGMENT_CLIP,
    );
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <opaque_fragment>',
      FRAGMENT_CAP,
    );
  });
}

export function cutAngleOf(point: Vector3, centre = CUT.centre): number {
  const dy = point.y - AXIS_HEIGHT_M;
  const cos = Math.cos(centre);
  const sin = Math.sin(centre);
  return Math.atan2(dy * cos - point.z * sin, point.z * cos + dy * sin);
}

export function isCutAway(point: Vector3, half: number, centre = CUT.centre): boolean {
  return half > 0 && Math.abs(cutAngleOf(point, centre)) < half;
}

export function keepsCutHit({ object, point }: Intersection): boolean {
  if (!isMesh(object) || Array.isArray(object.material)) return true;
  const patch = patched.get(object.material);
  return !patch || !isCutAway(point, patch.half.value, CUT_CENTRES[patch.depth]);
}
