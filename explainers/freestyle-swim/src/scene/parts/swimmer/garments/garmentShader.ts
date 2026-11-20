import type { Color, Material, WebGLProgramParametersWithUniforms } from 'three';
import { GARMENT_ROUGHNESS } from '../../../finishes';
import { BAND, CAP, STRAP } from './regions';

export const GARMENT_ATTRIBUTES = { distances: 'garments', extents: 'garmentExtents' } as const;

const HEM_LINE_WIDTH = 0.0025;
const HEM_LINE_SHADE = 0.78;
function glsl(value: number): string {
  return value.toFixed(4);
}

const ROUGHNESS = GARMENT_ROUGHNESS.map((value) => value.toFixed(3)).join(', ');

const VERTEX_HEAD = /* glsl */ `
attribute vec4 ${GARMENT_ATTRIBUTES.distances};
attribute vec4 ${GARMENT_ATTRIBUTES.extents};
varying vec4 vGarments;
varying vec4 vGarmentExtents;
`;

const VERTEX_BODY = /* glsl */ `
vGarments = ${GARMENT_ATTRIBUTES.distances};
vGarmentExtents = ${GARMENT_ATTRIBUTES.extents};
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

function garmentShader(shader: WebGLProgramParametersWithUniforms, colors: Color[]): void {
  shader.uniforms.uGarment = { value: colors };
  const { vertexShader, fragmentShader } = shader;
  shader.vertexShader = inject(vertexShader, '#include <common>', VERTEX_HEAD, true);
  shader.vertexShader = inject(shader.vertexShader, '#include <begin_vertex>', VERTEX_BODY, true);
  shader.fragmentShader = inject(fragmentShader, '#include <common>', FRAGMENT_HEAD, true);
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <color_fragment>',
    FRAGMENT_COLOR,
    true,
  );
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <roughnessmap_fragment>',
    FRAGMENT_ROUGHNESS,
    true,
  );
}

export function applyGarments<M extends Material>(material: M, colors: Color[]): M {
  if (patched.has(material)) return material;
  patched.add(material);
  const compile = material.onBeforeCompile.bind(material);
  const cacheKey = material.customProgramCacheKey.bind(material);
  material.onBeforeCompile = (shader, renderer) => {
    compile(shader, renderer);
    garmentShader(shader, colors);
  };
  material.customProgramCacheKey = () => `${cacheKey()}|garments`;
  material.needsUpdate = true;
  return material;
}
