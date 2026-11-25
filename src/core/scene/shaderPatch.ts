import type { Material, WebGLProgramParametersWithUniforms } from 'three';

export type ShaderPatch = (
  shader: WebGLProgramParametersWithUniforms,
  renderer: Parameters<Material['onBeforeCompile']>[1],
) => void;

const patchedKeys = new WeakMap<Material, Set<string>>();

export function glslFloat(value: number, digits: number): string {
  return value.toFixed(digits);
}

export function chainShaderPatch<M extends Material>(
  material: M,
  key: string,
  patch: ShaderPatch,
): M {
  const applied = patchedKeys.get(material) ?? new Set<string>();
  if (applied.has(key)) return material;
  applied.add(key);
  patchedKeys.set(material, applied);
  const compile = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    patch(shader, renderer);
  };
  material.customProgramCacheKey = () => `${cacheKey()}|${key}`;
  material.needsUpdate = true;
  return material;
}
