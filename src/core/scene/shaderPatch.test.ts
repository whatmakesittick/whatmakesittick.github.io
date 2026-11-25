import { describe, expect, it, vi } from 'vitest';
import { MeshStandardMaterial } from 'three';
import { chainShaderPatch, glslFloat } from './shaderPatch';

const compileShader = (material: MeshStandardMaterial): void =>
  material.onBeforeCompile({ uniforms: {} } as never, {} as never);

describe('chainShaderPatch', () => {
  it('runs the previous hook before the new patch', () => {
    const material = new MeshStandardMaterial();
    const order: string[] = [];
    material.onBeforeCompile = () => order.push('previous');
    chainShaderPatch(material, 'a', () => order.push('patch'));
    compileShader(material);
    expect(order).toEqual(['previous', 'patch']);
  });

  it('chains cache keys in order', () => {
    const material = new MeshStandardMaterial();
    material.customProgramCacheKey = () => 'base';
    chainShaderPatch(material, 'first', vi.fn());
    chainShaderPatch(material, 'second', vi.fn());
    expect(material.customProgramCacheKey()).toBe('base|first|second');
  });

  it('ignores a repeated key on the same material', () => {
    const material = new MeshStandardMaterial();
    const patch = vi.fn();
    chainShaderPatch(material, 'same', patch);
    chainShaderPatch(material, 'same', patch);
    compileShader(material);
    expect(patch).toHaveBeenCalledTimes(1);
    expect(material.customProgramCacheKey().match(/\|same/g)).toHaveLength(1);
  });

  it('marks the material for update', () => {
    const material = new MeshStandardMaterial();
    const version = material.version;
    chainShaderPatch(material, 'a', vi.fn());
    expect(material.version).toBeGreaterThan(version);
  });
});

describe('glslFloat', () => {
  it('formats with the given digits', () => {
    expect(glslFloat(0.5, 3)).toBe('0.500');
    expect(glslFloat(1 / 3, 5)).toBe('0.33333');
  });
});
