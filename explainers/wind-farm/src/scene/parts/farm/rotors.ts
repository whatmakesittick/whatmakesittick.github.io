import type { Material } from 'three';
import { ROTOR_TILT } from './turbineConstants';

const MIN_FACING = ROTOR_TILT.minFacing.toFixed(3);
const TILT_VERTEX = `mat4 rotorFrame = modelMatrix * instanceMatrix;
vec3 rotorEye = normalize(transpose(mat3(rotorFrame)) * (cameraPosition - rotorFrame[3].xyz));
float rotorFacing = abs(rotorEye.x);
if (rotorFacing < ${MIN_FACING}) {
  vec2 rotorAcross = normalize(rotorEye.yz);
  float rotorTilt = acos(rotorFacing) - acos(${MIN_FACING});
  float rotorSpan = dot(transformed.yz, rotorAcross);
  transformed.yz += rotorAcross * rotorSpan * (cos(rotorTilt) - 1.0);
  transformed.x -= sign(rotorEye.x) * rotorSpan * sin(rotorTilt);
}
#include <project_vertex>`;

export function tiltTowardEye(material: Material, cacheKey: string): void {
  const compile = material.onBeforeCompile.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', TILT_VERTEX);
  };
  material.customProgramCacheKey = () => cacheKey;
}
