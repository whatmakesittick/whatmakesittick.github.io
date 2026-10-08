import { Color, Vector3, Vector4 } from 'three';
import { SKY_DOME } from './constants';

export const DISTANT_LAND = /* glsl */ `
uniform vec3 uGround;
uniform vec3 uWarm;
uniform vec3 uWood;
uniform vec4 uFields;
uniform vec4 uWoods;
uniform vec3 uDetail;

const vec2 HASH_STEP = vec2(127.1, 311.7);
const float HASH_SCALE = 43758.5453;
const float TONE_SEED = 0.5;

float landHash(vec2 cell) {
  return fract(sin(dot(cell, HASH_STEP)) * HASH_SCALE);
}

float landNoise(vec2 point) {
  vec2 cell = floor(point);
  vec2 share = smoothstep(0.0, 1.0, fract(point));
  return mix(
    mix(landHash(cell), landHash(cell + vec2(1.0, 0.0)), share.x),
    mix(landHash(cell + vec2(0.0, 1.0)), landHash(cell + vec2(1.0, 1.0)), share.x),
    share.y
  );
}

vec3 distantLand(vec2 point) {
  vec2 axis = vec2(cos(uFields.w), sin(uFields.w));
  vec2 cells = vec2(dot(point, axis), dot(point, vec2(-axis.y, axis.x))) / uFields.x;
  float detail = 1.0 - smoothstep(uDetail.x, uDetail.y, length(fwidth(cells)));
  vec2 cell = floor(cells);
  vec3 field = mix(uGround, uWarm, step(1.0 - uFields.z, landHash(cell)));
  field *= 1.0 + (landHash(cell + TONE_SEED) - TONE_SEED) * uFields.y;
  vec2 woods = point / uWoods.x;
  float cover = mix(landNoise(woods), landNoise(woods * uWoods.z), uWoods.w);
  float wood = smoothstep(uWoods.y, uWoods.y + uDetail.z, cover);
  vec3 average = mix(uGround, uWarm, uFields.z);
  return mix(average, mix(field, uWood, wood), detail);
}
`;

export function distantLandUniforms() {
  const { colour, warm, wood, fields, woods, detail } = SKY_DOME.ground;
  return {
    uGround: { value: new Color(colour) },
    uWarm: { value: new Color(warm) },
    uWood: { value: new Color(wood) },
    uFields: { value: new Vector4(fields.size, fields.tone, fields.warmShare, fields.angle) },
    uWoods: { value: new Vector4(woods.cell, woods.threshold, woods.octave, woods.octaveShare) },
    uDetail: { value: new Vector3(detail.from, detail.to, woods.edge) },
  };
}
