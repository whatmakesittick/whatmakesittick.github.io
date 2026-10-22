import { Color, Vector4 } from 'three';

export const SKYLINE_GLSL = /* glsl */ `
uniform vec4 uSkyline;
uniform vec4 uCity;
uniform vec3 uSkylineColour;

float skyHash(float value) {
  return fract(sin(value * 127.1) * 43758.5453);
}

float skyNoise(float value) {
  float cell = floor(value);
  float share = smoothstep(0.0, 1.0, fract(value));
  return mix(skyHash(cell), skyHash(cell + 1.0), share);
}

float cover(float inside, float aa) {
  return clamp(0.5 + inside / max(aa, 1e-6), 0.0, 1.0);
}

float box(vec2 p, float halfWidth, float top, vec2 aa) {
  return min(cover(halfWidth - abs(p.x), aa.x), cover(top - p.y, aa.y));
}

float tapered(vec2 p, float halfWidth, float top, float taper, vec2 aa) {
  float width = halfWidth * (1.0 - taper * clamp(p.y / top, 0.0, 1.0));
  return box(p, width, top, aa);
}

float pearl(vec2 p, float unit, vec2 aa) {
  float column = box(p, unit * 0.25, unit * 9.5, aa);
  float low = cover(unit * 1.1 - length(p - vec2(0.0, unit * 2.6)), aa.y);
  float high = cover(unit * 0.75 - length(p - vec2(0.0, unit * 6.3)), aa.y);
  float legs = box(p, unit * 0.9 * (1.0 - clamp(p.y / (unit * 2.0), 0.0, 1.0)), unit * 2.0, aa);
  return max(max(column, legs), max(low, high));
}

float jinMao(vec2 p, float unit, vec2 aa) {
  float steps = floor(clamp(p.y / unit, 0.0, 7.0));
  float body = box(p, unit * (0.9 - steps * 0.08), unit * 7.4, aa);
  return max(body, box(p, unit * 0.08, unit * 8.6, aa));
}

float city(float azimuth, float up, vec2 aa) {
  float offset = azimuth - uCity.x;
  if (abs(offset) > uCity.y * 1.3) return 0.0;
  float unit = uCity.z;
  float cell = floor(offset / (unit * 1.6));
  float local = offset - (cell + 0.5) * unit * 1.6;
  float edge = 1.0 - smoothstep(uCity.y * 0.4, uCity.y * 1.3, abs(offset));
  float height = unit * (1.5 + 5.0 * skyHash(cell + 3.0)) * edge;
  float blocks = box(vec2(local, up), unit * (0.45 + 0.3 * skyHash(cell)), height, aa);
  vec2 p = vec2(offset, up);
  float tower = tapered(p - vec2(unit * 1.2, 0.0), unit * 0.85, unit * 13.5, 0.55, aa);
  float bottle = tapered(p - vec2(unit * 3.4, 0.0), unit * 0.95, unit * 10.5, 0.62, aa);
  float pagoda = jinMao(p - vec2(unit * 5.0, 0.0), unit, aa);
  float pearlTower = pearl(p - vec2(-unit * 2.6, 0.0), unit, aa);
  return max(max(blocks, tower), max(max(bottle, pagoda), pearlTower));
}

float suburbLayer(float azimuth, float up, float cellWidth, float seed, float density, vec2 size, vec2 aa) {
  float cell = floor(azimuth / cellWidth);
  float local = azimuth - (cell + 0.5) * cellWidth;
  float chance = skyNoise(azimuth * 7.0 + seed) * 0.6 + skyHash(cell + seed) * 0.4;
  float present = step(1.0 - density, chance);
  float height = size.x + size.y * pow(skyHash(cell + seed * 3.1), 3.0);
  float width = cellWidth * (0.22 + 0.22 * skyHash(cell + seed * 1.7));
  return present * box(vec2(local - width * 0.4 * (skyHash(cell + seed) - 0.5), up), width, height, aa);
}

float suburbs(float azimuth, float up, vec2 aa) {
  vec2 size = uSkyline.xy;
  float low = suburbLayer(azimuth, up, uSkyline.z, 0.0, 0.4, size, aa);
  float tall = suburbLayer(azimuth, up, uSkyline.z * 2.7, 17.0, 0.22, size * vec2(1.6, 2.4), aa);
  return max(low, tall);
}

vec3 skyline(vec3 sky, vec3 direction) {
  float up = direction.y;
  if (up < -0.002 || up > uCity.z * 16.0) return sky;
  float azimuth = atan(direction.z, direction.x);
  vec2 aa = vec2(fwidth(azimuth), fwidth(up));
  float far = city(azimuth, up, aa) * uCity.w;
  float low = suburbs(azimuth, up, aa) * uSkyline.w;
  float haze = 1.0 - smoothstep(0.0, uCity.z * 14.0, up) * 0.35;
  return mix(sky, uSkylineColour, max(far, low) * haze);
}
`;

export const SKYLINE = {
  colour: '#a9b4bd',
  suburbs: { base: 0.0012, rise: 0.0055, cell: 0.0047, strength: 0.16 },
  city: { azimuth: -2.86, halfWidth: 0.075, unit: 0.0034, strength: 0.42 },
} as const;

export function skylineUniforms() {
  const { suburbs, city } = SKYLINE;
  return {
    uSkyline: { value: new Vector4(suburbs.base, suburbs.rise, suburbs.cell, suburbs.strength) },
    uCity: { value: new Vector4(city.azimuth, city.halfWidth, city.unit, city.strength) },
    uSkylineColour: { value: new Color(SKYLINE.colour) },
  };
}
