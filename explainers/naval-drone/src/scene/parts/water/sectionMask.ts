import { Matrix4, Vector2, Vector4 } from 'three';
import type { Point } from '../../../ids';
import { WATER_SECTION } from '../../../model/layout';

export interface SectionUniforms {
  uSection: { value: Matrix4 };
  uSectionBox: { value: Vector4 };
  uSectionDepth: { value: Vector2 };
}

export function sectionUniforms(): SectionUniforms {
  return {
    uSection: { value: new Matrix4() },
    uSectionBox: {
      value: new Vector4(
        WATER_SECTION.x[0],
        WATER_SECTION.x[1],
        WATER_SECTION.z[0],
        WATER_SECTION.z[1],
      ),
    },
    uSectionDepth: { value: new Vector2(WATER_SECTION.depth, 0) },
  };
}

export function sectionFrame(position: Point, heading: number, target: Matrix4): Matrix4 {
  return target.makeRotationY(-heading).setPosition(position[0], 0, position[2]);
}

export function placeSection(uniforms: SectionUniforms, frame: Matrix4, on: boolean): void {
  uniforms.uSection.value.copy(frame).invert();
  uniforms.uSectionDepth.value.y = on ? 1 : 0;
}

export const SECTION_GLSL = /* glsl */ `
uniform mat4 uSection;
uniform vec4 uSectionBox;
uniform vec2 uSectionDepth;

bool insideSection(vec3 world) {
  if (uSectionDepth.y < 0.5) return false;
  vec3 p = (uSection * vec4(world, 1.0)).xyz;
  if (p.x > uSectionBox.x && p.x < uSectionBox.y && p.z > uSectionBox.z && p.z < uSectionBox.w) return true;
  vec3 c = (uSection * vec4(cameraPosition, 1.0)).xyz;
  vec3 d = p - c;
  vec3 safe = vec3(abs(d.x) < 1e-6 ? 1e-6 : d.x, abs(d.y) < 1e-6 ? -1e-6 : d.y, abs(d.z) < 1e-6 ? 1e-6 : d.z);
  vec3 lo = vec3(uSectionBox.x, -uSectionDepth.x, uSectionBox.z);
  vec3 hi = vec3(uSectionBox.y, 0.0, uSectionBox.w);
  vec3 t0 = (lo - c) / safe;
  vec3 t1 = (hi - c) / safe;
  vec3 near = min(t0, t1);
  vec3 far = max(t0, t1);
  float enter = max(max(near.x, near.y), near.z);
  float leave = min(min(far.x, far.y), far.z);
  return leave > enter && enter > 1.0;
}
`;
