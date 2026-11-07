const GLSL_DIGITS = 4;

export function glslFloat(value: number, digits = GLSL_DIGITS): string {
  return value.toFixed(digits);
}

export function inject(source: string, anchor: string, addition: string): string {
  return source.replace(anchor, `${anchor}\n${addition}`);
}
