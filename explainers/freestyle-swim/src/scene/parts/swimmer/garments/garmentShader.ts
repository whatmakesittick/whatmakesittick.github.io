import type { Color, Material, Texture, WebGLProgramParametersWithUniforms } from 'three';
import { GARMENT_ROUGHNESS } from '../../../finishes';
import { LABEL_ATTRIBUTE } from './label';
import { BAND, CAP, STRAP } from './regions';

export const GARMENT_ATTRIBUTES = { distances: 'garments', extents: 'garmentExtents' } as const;

const STRAP_GARMENT = 3;
const HEM_LINE_WIDTH = 0.0025;
const HEM_LINE_SHADE = 0.78;
function glsl(value: number): string {
  return value.toFixed(4);
}

const ROUGHNESS = GARMENT_ROUGHNESS.map((value) => value.toFixed(3)).join(', ');

const VERTEX_HEAD = /* glsl */ `
attribute vec4 ${GARMENT_ATTRIBUTES.distances};
attribute vec4 ${GARMENT_ATTRIBUTES.extents};
attribute vec2 ${LABEL_ATTRIBUTE};
varying vec4 vGarments;
varying vec4 vGarmentExtents;
varying vec2 vGarmentLabel;
`;

const VERTEX_BODY = /* glsl */ `
vGarments = ${GARMENT_ATTRIBUTES.distances};
vGarmentExtents = ${GARMENT_ATTRIBUTES.extents};
vGarmentLabel = ${LABEL_ATTRIBUTE};
`;

const FRAGMENT_HEAD = /* glsl */ `
uniform vec3 uGarment[${GARMENT_ROUGHNESS.length}];
varying vec4 vGarments;
varying vec4 vGarmentExtents;
const float GARMENT_ROUGHNESS[${GARMENT_ROUGHNESS.length}] = float[${GARMENT_ROUGHNESS.length}](${ROUGHNESS});

float garmentCover(float gap) {
  return clamp(gap / max(fwidth(gap), 1e-5) + 0.5, 0.0, 1.0);
}

void garmentPaint(inout vec3 colour, inout float rough, int garment, float gap) {
  float cover = garmentCover(gap);
  float hem = 1.0 - garmentCover(gap - ${HEM_LINE_WIDTH});
  vec3 paint = uGarment[garment] * mix(1.0, ${HEM_LINE_SHADE}, hem);
  colour = mix(colour, paint, cover);
  rough = mix(rough, GARMENT_ROUGHNESS[garment], cover);
}
`;

const FRAGMENT_LABEL_HEAD = /* glsl */ `
uniform sampler2D uGarmentLabel;
varying vec2 vGarmentLabel;

void garmentLabelPaint(inout vec3 colour, inout float rough, float capGap) {
  float leftSide = step(0.0, vGarments.z);
  vec2 at = vec2(mix(vGarmentLabel.x, 1.0 - vGarmentLabel.x, leftSide), vGarmentLabel.y);
  vec2 inside = step(vec2(0.0), at) * step(at, vec2(1.0));
  float ink = texture2D(uGarmentLabel, at).a * inside.x * inside.y * garmentCover(capGap);
  colour = mix(colour, uGarment[${STRAP_GARMENT}], ink);
  rough = mix(rough, GARMENT_ROUGHNESS[${STRAP_GARMENT}], ink);
}
`;

const FRAGMENT_LABEL_COLOR = /* glsl */ `
garmentLabelPaint(diffuseColor.rgb, garmentRough, vGarments.y);
`;

const FRAGMENT_COLOR = /* glsl */ `
float garmentRough = roughness;
garmentPaint(diffuseColor.rgb, garmentRough, 0, vGarments.x);
garmentPaint(diffuseColor.rgb, garmentRough, 1, vGarments.y);
garmentPaint(diffuseColor.rgb, garmentRough, 2, min(${glsl(CAP.stripeHalfWidth)} - abs(vGarments.z), vGarments.y));
garmentPaint(diffuseColor.rgb, garmentRough, 3, min(${glsl(STRAP.halfWidth)} - abs(vGarments.w), vGarmentExtents.x));
garmentPaint(diffuseColor.rgb, garmentRough, 4, min(${glsl(BAND.halfWidth)} - abs(vGarmentExtents.y), vGarmentExtents.z));
`;

const FRAGMENT_ROUGHNESS = /* glsl */ `
roughnessFactor = garmentRough;
`;

const patched = new WeakSet<Material>();

function inject(source: string, anchor: string, addition: string, after = false): string {
  if (!source.includes(anchor)) throw new Error(`Shader anchor missing: ${anchor}`);
  return source.replace(anchor, after ? `${anchor}\n${addition}` : `${addition}\n${anchor}`);
}

function garmentShader(
  shader: WebGLProgramParametersWithUniforms,
  colors: Color[],
  label?: Texture,
): void {
  shader.uniforms.uGarment = { value: colors };
  if (label) shader.uniforms.uGarmentLabel = { value: label };
  const { vertexShader, fragmentShader } = shader;
  shader.vertexShader = inject(vertexShader, '#include <common>', VERTEX_HEAD, true);
  shader.vertexShader = inject(shader.vertexShader, '#include <begin_vertex>', VERTEX_BODY, true);
  const head = label ? FRAGMENT_HEAD + FRAGMENT_LABEL_HEAD : FRAGMENT_HEAD;
  const paint = label ? FRAGMENT_COLOR + FRAGMENT_LABEL_COLOR : FRAGMENT_COLOR;
  shader.fragmentShader = inject(fragmentShader, '#include <common>', head, true);
  shader.fragmentShader = inject(shader.fragmentShader, '#include <color_fragment>', paint, true);
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <roughnessmap_fragment>',
    FRAGMENT_ROUGHNESS,
    true,
  );
}

export function applyGarments<M extends Material>(
  material: M,
  colors: Color[],
  label?: Texture,
): M {
  if (patched.has(material)) return material;
  patched.add(material);
  const compile = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    garmentShader(shader, colors, label);
  };
  material.customProgramCacheKey = () => `${cacheKey()}|garments${label ? '|label' : ''}`;
  material.needsUpdate = true;
  return material;
}
