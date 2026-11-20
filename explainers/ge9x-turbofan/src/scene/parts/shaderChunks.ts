import { Color } from 'three';
import type { Material, WebGLProgramParametersWithUniforms, WebGLRenderer } from 'three';

const GLSL_DIGITS = 4;

export function glslFloat(value: number, digits = GLSL_DIGITS): string {
  return value.toFixed(digits);
}

export function glslColor(hex: string): string {
  const { r, g, b } = new Color(hex);
  return `vec3(${glslFloat(r)}, ${glslFloat(g)}, ${glslFloat(b)})`;
}

export function inject(source: string, anchor: string, addition: string): string {
  if (!source.includes(anchor)) throw new Error(`Shader anchor ${anchor} is missing`);
  return source.replace(anchor, `${anchor}\n${addition}`);
}

export type ShaderPatch = (shader: WebGLProgramParametersWithUniforms) => void;

const patches = new WeakMap<Material, Set<string>>();

export function hasPatch(material: Material, key: string): boolean {
  return patches.get(material)?.has(key) ?? false;
}

export function addPatch<M extends Material>(material: M, key: string, patch: ShaderPatch): M {
  const keys = patches.get(material) ?? new Set<string>();
  if (keys.has(key)) return material;
  keys.add(key);
  patches.set(material, keys);
  const compile = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (
    shader: WebGLProgramParametersWithUniforms,
    renderer: WebGLRenderer,
  ) => {
    compile(shader, renderer);
    patch(shader);
  };
  material.customProgramCacheKey = () => `${cacheKey()}|${key}`;
  material.needsUpdate = true;
  return material;
}
