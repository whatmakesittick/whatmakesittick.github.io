import { Matrix4, Vector2, Vector4 } from 'three';
import type { Point } from '../../../ids';
import { WATER_SECTION } from '../../../model/layout';
import { SECTION_LOOK } from '../../constants';

export interface SectionUniforms {
  uSection: { value: Matrix4 };
  uSectionBox: { value: Vector4 };
  uSectionDepth: { value: Vector2 };
}

export function sectionUniforms(): SectionUniforms {
  const [x0, x1] = WATER_SECTION.x;
  const [z0, z1] = WATER_SECTION.z;
  return {
    uSection: { value: new Matrix4() },
    uSectionBox: { value: new Vector4(x0, x1, z0, z1) },
    uSectionDepth: { value: new Vector2(SECTION_LOOK.depth, 0) },
  };
}

export function sectionFrame(position: Point, heading: number, target: Matrix4): Matrix4 {
  return target.makeRotationY(-heading).setPosition(position[0], 0, position[2]);
}

export function placeSection(uniforms: SectionUniforms, frame: Matrix4, on: boolean): void {
  uniforms.uSection.value.copy(frame).invert();
  uniforms.uSectionDepth.value.y = on ? 1 : 0;
}

const [LOW, HIGH] = SECTION_LOOK.elevation.map((degrees) => Math.tan((degrees * Math.PI) / 180));
const [SIDE_FROM, SIDE_TO] = SECTION_LOOK.side;
const SOFT = SECTION_LOOK.soft;

export const SECTION_GLSL = /* glsl */ `
uniform mat4 uSection;
uniform vec4 uSectionBox;
uniform vec2 uSectionDepth;

float sectionFade() {
  if (uSectionDepth.y < 0.5) return 0.0;
  vec3 c = (uSection * vec4(cameraPosition, 1.0)).xyz;
  vec2 centre = vec2(uSectionBox.x + uSectionBox.y, uSectionBox.z + uSectionBox.w) * 0.5;
  float rise = c.y / max(length(c.xz - centre), 0.001);
  return (1.0 - smoothstep(${LOW.toFixed(4)}, ${HIGH.toFixed(4)}, rise)) * (1.0 - smoothstep(${SIDE_FROM.toFixed(2)}, ${SIDE_TO.toFixed(2)}, c.z));
}

float edgeIn(float value, vec2 span, float soft) {
  return smoothstep(0.0, soft, min(value - span.x, span.y - value));
}

float throughFace(vec3 c, vec3 d, bool alongX, float plane, float outside, vec2 span) {
  float start = alongX ? c.x : c.z;
  float step = alongX ? d.x : d.z;
  if (outside * (start - plane) <= 0.0 || outside * step >= 0.0) return 0.0;
  float t = (plane - start) / step;
  vec3 hit = c + d * t;
  if (t <= 1.0 || hit.y >= 0.0) return 0.0;
  return edgeIn(alongX ? hit.z : hit.x, span, ${SOFT.toFixed(2)}) * edgeIn(hit.y, vec2(-uSectionDepth.x, ${SOFT.toFixed(2)}), ${SOFT.toFixed(2)});
}

float sectionCut(vec3 world) {
  float fade = sectionFade();
  if (fade <= 0.0) return 0.0;
  vec3 p = (uSection * vec4(world, 1.0)).xyz;
  vec3 c = (uSection * vec4(cameraPosition, 1.0)).xyz;
  vec3 d = p - c;
  vec4 b = uSectionBox;
  float top = edgeIn(p.x, b.xy, ${SOFT.toFixed(2)}) * step(b.z, p.z) * step(p.z, b.w);
  float faces = max(throughFace(c, d, false, b.z, -1.0, b.xy), max(throughFace(c, d, true, b.x, -1.0, b.zw), throughFace(c, d, true, b.y, 1.0, b.zw)));
  return fade * max(top, faces);
}
`;
