import { describe, expect, it } from 'vitest';
import { BoxGeometry, Mesh } from 'three';
import type { WebGLProgramParametersWithUniforms, WebGLRenderer, Color } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { partMaterial } from '../context';
import type { PartContext } from '../context';
import { createCut } from '../cut';
import { CloseFinish } from './closeFinish';
import { ACTION_FINISHES } from './finishes';

const SOURCE =
  '#include <common>\n#include <roughnessmap_fragment>\n#include <normal_fragment_maps>';

function compiled() {
  const materials = new MaterialLibrary();
  const context = { materials, cut: createCut() } as unknown as PartContext;
  const material = partMaterial(context, 'wippen', ACTION_FINISHES.wippen);
  new CloseFinish({ value: 1 }, materials).cover(new Mesh(new BoxGeometry(), material));
  const shader = {
    uniforms: {},
    vertexShader: SOURCE,
    fragmentShader: SOURCE,
  } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, {} as WebGLRenderer);
  return shader;
}

describe('close finish', () => {
  it('shades each face of the played action by where it faces in the close views', () => {
    const shader = compiled();
    expect(shader.fragmentShader).toContain('faceShade');
    expect(shader.uniforms.uCloseFinish).toEqual({ value: 1 });
  });

  it('lightens the wippen toward a maple tone', () => {
    const tint = (compiled().uniforms.uCloseTint as { value: Color }).value;
    [tint.r, tint.g, tint.b].forEach((channel) => expect(channel).toBeGreaterThan(1));
  });
});
