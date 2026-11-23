import type { Color, Material, Texture, WebGLProgramParametersWithUniforms } from 'three';

export const HEM_LINE_WIDTH = 0.0025;
export const HEM_LINE_SHADE = 0.78;

export interface GarmentLabelShader {
  readonly attribute: string;
  readonly garment: number;
  readonly coverGap: string;
  readonly side: string;
}

export interface GarmentShaderOptions {
  readonly attributes: { readonly distances: string; readonly extents: string };
  readonly roughness: readonly number[];
  readonly paint: string;
  readonly label?: GarmentLabelShader;
  readonly cacheKey?: string;
}

export type GarmentPatcher = <M extends Material>(
  material: M,
  colors: Color[],
  label?: Texture,
) => M;

const DEFAULT_CACHE_KEY = 'garments';

export function paintCall(garment: number, gap: string): string {
  return `garmentPaint(diffuseColor.rgb, garmentRough, ${garment}, ${gap});`;
}

function vertexHead({ attributes, label }: GarmentShaderOptions): string {
  return /* glsl */ `
attribute vec4 ${attributes.distances};
attribute vec4 ${attributes.extents};
${label ? `attribute vec2 ${label.attribute};` : ''}
varying vec4 vGarments;
varying vec4 vGarmentExtents;
varying vec2 vGarmentLabel;
`;
}

function vertexBody({ attributes, label }: GarmentShaderOptions): string {
  return /* glsl */ `
vGarments = ${attributes.distances};
vGarmentExtents = ${attributes.extents};
${label ? `vGarmentLabel = ${label.attribute};` : ''}
`;
}

function fragmentHead({ roughness }: GarmentShaderOptions): string {
  const list = roughness.map((value) => value.toFixed(3)).join(', ');
  return /* glsl */ `
uniform vec3 uGarment[${roughness.length}];
varying vec4 vGarments;
varying vec4 vGarmentExtents;
const float GARMENT_ROUGHNESS[${roughness.length}] = float[${roughness.length}](${list});

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
}

function labelHead(label: GarmentLabelShader): string {
  return /* glsl */ `
uniform sampler2D uGarmentLabel;
varying vec2 vGarmentLabel;

void garmentLabelPaint(inout vec3 colour, inout float rough, float capGap) {
  float leftSide = step(0.0, ${label.side});
  vec2 at = vec2(mix(vGarmentLabel.x, 1.0 - vGarmentLabel.x, leftSide), vGarmentLabel.y);
  vec2 inside = step(vec2(0.0), at) * step(at, vec2(1.0));
  float ink = texture2D(uGarmentLabel, at).a * inside.x * inside.y * garmentCover(capGap);
  colour = mix(colour, uGarment[${label.garment}], ink);
  rough = mix(rough, GARMENT_ROUGHNESS[${label.garment}], ink);
}
`;
}

function fragmentPaint(options: GarmentShaderOptions, withLabel: boolean): string {
  const base = `
float garmentRough = roughness;
${options.paint}
`;
  if (!withLabel || !options.label) return base;
  return `${base}
garmentLabelPaint(diffuseColor.rgb, garmentRough, ${options.label.coverGap});
`;
}

const FRAGMENT_ROUGHNESS = /* glsl */ `
roughnessFactor = garmentRough;
`;

function inject(source: string, anchor: string, addition: string): string {
  if (!source.includes(anchor)) throw new Error(`Shader anchor missing: ${anchor}`);
  return source.replace(anchor, `${anchor}\n${addition}`);
}

function garmentShader(
  options: GarmentShaderOptions,
  shader: WebGLProgramParametersWithUniforms,
  colors: Color[],
  label?: Texture,
): void {
  shader.uniforms.uGarment = { value: colors };
  const withLabel = Boolean(label && options.label);
  if (label) shader.uniforms.uGarmentLabel = { value: label };
  const head = withLabel && options.label ? labelHead(options.label) : '';
  shader.vertexShader = inject(shader.vertexShader, '#include <common>', vertexHead(options));
  shader.vertexShader = inject(shader.vertexShader, '#include <begin_vertex>', vertexBody(options));
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <common>',
    fragmentHead(options) + head,
  );
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <color_fragment>',
    fragmentPaint(options, withLabel),
  );
  shader.fragmentShader = inject(
    shader.fragmentShader,
    '#include <roughnessmap_fragment>',
    FRAGMENT_ROUGHNESS,
  );
}

export function createGarmentPatcher(options: GarmentShaderOptions): GarmentPatcher {
  const patched = new WeakSet<Material>();
  const key = options.cacheKey ?? DEFAULT_CACHE_KEY;
  return (material, colors, label) => {
    if (patched.has(material)) return material;
    patched.add(material);
    const compile = material.onBeforeCompile.bind(material);
    const cacheKey = material.customProgramCacheKey.bind(material);
    material.onBeforeCompile = (shader, renderer) => {
      compile(shader, renderer);
      garmentShader(options, shader, colors, label);
    };
    material.customProgramCacheKey = () => `${cacheKey()}|${key}${label ? '|label' : ''}`;
    material.needsUpdate = true;
    return material;
  };
}
