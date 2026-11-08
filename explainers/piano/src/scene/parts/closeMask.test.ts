import { describe, expect, it } from 'vitest';
import { BoxGeometry, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import type { Intersection, WebGLProgramParametersWithUniforms, WebGLRenderer } from 'three';
import { CloseMask, keepsCloseHit } from './closeMask';

const SOURCE =
  '#include <common>\n#include <project_vertex>\n#include <clipping_planes_fragment>\n#include <color_fragment>';
const INSIDE = new Vector3(0, 0, 0);
const OUTSIDE = new Vector3(1, 0, 0);

function masked(amount: number) {
  const material = new MeshStandardMaterial();
  const mesh = new Mesh(new BoxGeometry(), material);
  const close = { value: amount };
  const mask = new CloseMask(close);
  mask.keep({ min: [-0.5, -0.5, -0.5], max: [0.5, 0.5, 0.5] });
  mask.cover(mesh);
  const hit = (point: Vector3) =>
    keepsCloseHit({ object: mesh, point, distance: 0 } as Intersection);
  return { material, close, hit };
}

describe('close mask', () => {
  it('dissolves what lies outside the kept box as the close look comes in', () => {
    const { material } = masked(1);
    const shader = {
      uniforms: {},
      vertexShader: SOURCE,
      fragmentShader: SOURCE,
    } as unknown as WebGLProgramParametersWithUniforms;
    material.onBeforeCompile(shader, {} as WebGLRenderer);
    expect(shader.fragmentShader).toContain('discard');
    expect(shader.vertexShader).toContain('vCloseWorld');
    expect(shader.uniforms.uCloseAmount).toEqual({ value: 1 });
  });

  it('lets label rays pass only where the part has dissolved', () => {
    const { close, hit } = masked(1);
    expect(hit(OUTSIDE)).toBe(false);
    expect(hit(INSIDE)).toBe(true);
    close.value = 0;
    expect(hit(OUTSIDE)).toBe(true);
  });
});
