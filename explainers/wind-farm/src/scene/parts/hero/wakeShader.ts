import type { WebGLProgramParametersWithUniforms } from 'three';
import { ROTOR_RADIUS_M, WAKE_DECAY } from '../../../model/constants';
import { HUB } from './constants';

export interface WakeUniforms {
  readonly wakeLength: { value: number };
  readonly wakeFlow: { value: number };
}

const glsl = (value: number) => value.toFixed(4);

const VERTEX_HEAD = `
uniform float wakeLength;
varying float vWakeAlong;
varying float vWakeAngle;
varying float vWakeFacing;
`;

const VERTEX_BEGIN = `
float wakeRadius = ${glsl(ROTOR_RADIUS_M)} + ${glsl(WAKE_DECAY)} * position.x * wakeLength;
vec3 transformed = vec3(
  ${glsl(HUB[0])} + position.x * wakeLength,
  ${glsl(HUB[1])} + wakeRadius * position.y,
  ${glsl(HUB[2])} + wakeRadius * position.z
);
vec3 wakeNormal = normalize(vec3(-${glsl(WAKE_DECAY)}, position.y, position.z));
vWakeAlong = position.x;
vWakeAngle = atan(position.z, position.y);
`;

const VERTEX_FACING = `
vWakeFacing = abs(dot(normalize(normalMatrix * wakeNormal), normalize(-mvPosition.xyz)));
`;

const FRAGMENT_HEAD = `
uniform float wakeLength;
uniform float wakeFlow;
varying float vWakeAlong;
varying float vWakeAngle;
varying float vWakeFacing;
`;

const FRAGMENT_FADE = `
float wakeFade = smoothstep(0.0, 0.05, vWakeAlong) * pow(1.0 - vWakeAlong, 1.5);
float wakeEdge = smoothstep(0.02, 0.8, vWakeFacing);
float wakeBands = 0.65 + 0.35 * sin(6.2832 * (vWakeAlong * wakeLength / 70.0 - wakeFlow));
float wakeSwirl = 0.8 + 0.2 * sin(vWakeAngle * 6.0 + vWakeAlong * 9.0 - wakeFlow * 2.0);
diffuseColor.a *= wakeFade * wakeEdge * wakeBands * wakeSwirl;
`;

export function wakeShader(uniforms: WakeUniforms) {
  return (shader: WebGLProgramParametersWithUniforms): void => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = (VERTEX_HEAD + shader.vertexShader)
      .replace('#include <begin_vertex>', VERTEX_BEGIN)
      .replace('#include <project_vertex>', `#include <project_vertex>\n${VERTEX_FACING}`);
    shader.fragmentShader = (FRAGMENT_HEAD + shader.fragmentShader).replace(
      '#include <opaque_fragment>',
      `${FRAGMENT_FADE}\n#include <opaque_fragment>`,
    );
  };
}
