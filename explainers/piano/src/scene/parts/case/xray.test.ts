import { describe, expect, it } from 'vitest';
import { BoxGeometry, Mesh, MeshStandardMaterial, PerspectiveCamera, Scene } from 'three';
import type { WebGLProgramParametersWithUniforms, WebGLRenderer } from 'three';
import type { Point } from '../../../ids';
import { CASE, JACK_Z, PLAYED_KEY, cutX } from '../../../model';
import { createCut, setCut } from '../cut';
import { stateAt } from '../keyboard/testState';
import { CaseXray } from './xray';

const KEY = PLAYED_KEY.middle;
const SIDE_VIEW: Point = [cutX(KEY) - 1.2, 0.8, JACK_Z + 0.3];
const FAR_LOW: Point = [cutX(KEY) - 8, 0.8, JACK_Z];
const OVERHEAD: Point = [cutX(KEY) - 0.5, CASE.rimTop + 0.6, JACK_Z];
const SHADER_SOURCE = '#include <common>\n#include <clipping_planes_fragment>';

function rig(lineUp = false, close = 0) {
  const cut = createCut();
  setCut(cut, true, cutX(KEY));
  const xray = new CaseXray(cut, { value: close });
  const material = new MeshStandardMaterial();
  const mesh = new Mesh(new BoxGeometry(), material);
  xray.watch(mesh);
  xray.setState(stateAt(0, { view: { lineUp } }));
  const shader = {
    uniforms: {},
    vertexShader: SHADER_SOURCE,
    fragmentShader: SHADER_SOURCE,
  } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, {} as WebGLRenderer);
  const dissolveSeenFrom = (eye: Point): number => {
    const camera = new PerspectiveCamera();
    camera.position.set(...eye);
    mesh.onBeforeRender(
      {} as WebGLRenderer,
      new Scene(),
      camera,
      mesh.geometry,
      material,
      null as never,
    );
    return (shader.uniforms.uCaseXray as { value: number }).value;
  };
  return { material, shader, dissolveSeenFrom };
}

describe('case x-ray', () => {
  it('dissolves the case when the camera looks at the action from the side', () => {
    expect(rig().dissolveSeenFrom(SIDE_VIEW)).toBe(1);
  });

  it('keeps the case whole from above the rim and from far away', () => {
    const { dissolveSeenFrom } = rig();
    expect(dissolveSeenFrom(OVERHEAD)).toBe(0);
    expect(dissolveSeenFrom(FAR_LOW)).toBe(0);
  });

  it('dissolves the case from anywhere while a close view is framed', () => {
    expect(rig(false, 1).dissolveSeenFrom(OVERHEAD)).toBe(1);
  });

  it('keeps the case dissolved through the line-up', () => {
    expect(rig(true).dissolveSeenFrom(FAR_LOW)).toBe(1);
  });

  it('discards case pixels in its own shader variant', () => {
    const { material, shader } = rig();
    expect(shader.fragmentShader).toContain('uCaseXray');
    expect(material.customProgramCacheKey()).toContain('case-xray');
  });
});
