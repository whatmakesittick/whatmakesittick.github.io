const GLSL_DIGITS = 4;

export const DITHER_NOISE = /* glsl */ `
#ifndef DITHER_NOISE
#define DITHER_NOISE
float ditherNoise(vec2 pixel) {
  return fract(52.9829189 * fract(dot(pixel, vec2(0.06711056, 0.00583715))));
}
#endif
`;

export function glslFloat(value: number, digits = GLSL_DIGITS): string {
  return value.toFixed(digits);
}

export function inject(source: string, anchor: string, addition: string): string {
  return source.replace(anchor, `${anchor}\n${addition}`);
}
