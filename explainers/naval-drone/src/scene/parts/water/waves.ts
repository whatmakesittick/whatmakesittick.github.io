import { Vector2, Vector4 } from 'three';
import { GRAVITY } from '../../../model/scale';
import { WAVES } from '../../constants';

export interface WaterUniforms {
  uSeaTime: { value: number };
  uSeaDrift: { value: Vector2 };
  uWaves: { value: Vector4[] };
  uFoamLevel: { value: number };
}

const SIGNIFICANT_TO_SIGMA = 4;
const ENERGY_TO_AMPLITUDE = 2;

export function waveVectors(waveHeight: number): Vector4[] {
  const sigma = waveHeight / SIGNIFICANT_TO_SIGMA;
  const scale = WAVES.lengthPerMetre * Math.max(waveHeight, WAVES.minHeight) ** WAVES.lengthPower;
  return WAVES.components.map(({ length, angle, share }) => {
    const wavelength = length * scale;
    const k = (2 * Math.PI) / wavelength;
    const direction = WAVES.direction + angle;
    return new Vector4(
      Math.cos(direction) * k,
      Math.sin(direction) * k,
      Math.sqrt(GRAVITY * k),
      sigma * Math.sqrt(ENERGY_TO_AMPLITUDE * share),
    );
  });
}

export function createWaterUniforms(): WaterUniforms {
  return {
    uSeaTime: { value: 0 },
    uSeaDrift: { value: new Vector2() },
    uWaves: { value: waveVectors(WAVES.defaultHeight) },
    uFoamLevel: { value: 0 },
  };
}

export const WATER = createWaterUniforms();

export function resetWater(waveHeight: number): void {
  WATER.uSeaTime.value = 0;
  WATER.uSeaDrift.value.set(0, 0);
  WATER.uWaves.value = waveVectors(waveHeight);
}

export function seaHeightAt(
  x: number,
  z: number,
  uniforms: WaterUniforms = WATER,
  components: number = WAVES.components.length,
): number {
  const px = x + uniforms.uSeaDrift.value.x;
  const pz = z + uniforms.uSeaDrift.value.y;
  const time = uniforms.uSeaTime.value;
  return uniforms.uWaves.value.slice(0, components).reduce((height, wave, index) => {
    const phase = wave.x * px + wave.y * pz - wave.z * time + index * WAVES.phaseStep;
    const k = Math.hypot(wave.x, wave.y);
    return height + wave.w * Math.cos(phase) + 0.5 * k * wave.w * wave.w * Math.cos(2 * phase);
  }, 0);
}

export const WAVE_GLSL = /* glsl */ `
uniform float uSeaTime;
uniform vec2 uSeaDrift;
uniform vec4 uWaves[${WAVES.components.length}];

vec3 seaWave(vec2 at, float fade) {
  vec2 p = at + uSeaDrift;
  vec3 result = vec3(0.0);
  for (int i = 0; i < ${WAVES.components.length}; i++) {
    vec4 w = uWaves[i];
    float k = length(w.xy);
    float keep = 1.0 - smoothstep(1.0, 2.2, fade * k);
    float phase = dot(w.xy, p) - w.z * uSeaTime + float(i) * ${WAVES.phaseStep.toFixed(4)};
    float a = w.w * keep;
    float second = 0.5 * k * a * a;
    result.x += a * cos(phase) + second * cos(2.0 * phase);
    float slope = -(a * sin(phase) + 2.0 * second * sin(2.0 * phase));
    result.yz += slope * w.xy;
  }
  return result;
}

float seaHeight(vec2 at) {
  return seaWave(at, 0.0).x;
}
`;
