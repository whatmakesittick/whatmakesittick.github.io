import type { Material } from 'three';
import { toRadians } from '@core/math';
import { addPatch, glslFloat, inject } from './shaderChunks';

export interface PanelLayout {
  readonly seams: readonly number[];
  readonly from: number;
  readonly to: number;
  readonly lengthwise: readonly number[];
  readonly band?: readonly [number, number];
}

const LINE_METRES = 0.007;
const SEAM_SHADE = 0.42;
const BAND_TINT = [0.42, 0.47, 0.55] as const;
const BAND_EDGE = 0.012;
const BAND_EDGE_LIFT = 1.35;

export const FAN_COWL_PANELS: PanelLayout = {
  seams: [-1.62, -0.12],
  from: -1.62,
  to: 1.25,
  lengthwise: [toRadians(28), toRadians(-28), toRadians(180), toRadians(110), toRadians(-110)],
  band: [-1.42, -1.27],
};

export const SLEEVE_PANELS: PanelLayout = {
  seams: [1.62],
  from: 1.25,
  to: 2.07,
  lengthwise: [toRadians(28), toRadians(-28), toRadians(180)],
};

function seamTerm(coordinate: string, at: number): string {
  return `seam = max(seam, 1.0 - smoothstep(0.0, panelWidth(${coordinate}), abs(${coordinate} - ${glslFloat(at)})));`;
}

function lengthwiseTerm(angle: number): string {
  return `seam = max(seam, panelSpan * (1.0 - smoothstep(0.0, panelWidth(panelArc), abs(panelRadius * angleGap(panelAngle, ${glslFloat(angle)})))));`;
}

function bandTerms(band: readonly [number, number] | undefined): string {
  if (!band) return '';
  const [from, to] = band;
  return /* glsl */ `
float bandMask = smoothstep(${glslFloat(from)} - 0.003, ${glslFloat(from)} + 0.003, vPanel.x) * (1.0 - smoothstep(${glslFloat(to)} - 0.003, ${glslFloat(to)} + 0.003, vPanel.x));
float bandEdge = 1.0 - smoothstep(0.0, ${glslFloat(BAND_EDGE)}, abs(vPanel.x - ${glslFloat(to + BAND_EDGE * 1.5)}));
diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(${BAND_TINT.map((value) => glslFloat(value)).join(', ')}), bandMask);
diffuseColor.rgb *= 1.0 + bandEdge * ${glslFloat(BAND_EDGE_LIFT - 1)};
`;
}

export function applyPanels<M extends Material>(material: M, layout: PanelLayout, key: string): M {
  const terms = [
    ...layout.seams.map((at) => seamTerm('vPanel.x', at)),
    ...layout.lengthwise.map((angle) => lengthwiseTerm(angle)),
  ].join('\n');
  return addPatch(material, `ge9x-panels-${key}`, (shader) => {
    shader.vertexShader = inject(shader.vertexShader, '#include <common>', 'varying vec3 vPanel;');
    shader.vertexShader = inject(
      shader.vertexShader,
      '#include <begin_vertex>',
      'vPanel = position;',
    );
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <common>',
      /* glsl */ `
varying vec3 vPanel;
float panelWidth(float coordinate) {
  return max(${glslFloat(LINE_METRES)}, fwidth(coordinate) * 1.2);
}
float angleGap(float angle, float target) {
  float gap = angle - target;
  return gap - 6.2831853 * floor((gap + 3.1415927) / 6.2831853);
}
`,
    );
    shader.fragmentShader = inject(
      shader.fragmentShader,
      '#include <color_fragment>',
      /* glsl */ `
float panelAngle = atan(vPanel.z, vPanel.y);
float panelRadius = length(vPanel.yz);
float panelArc = panelAngle * panelRadius;
float panelSpan = step(${glslFloat(layout.from)}, vPanel.x) * step(vPanel.x, ${glslFloat(layout.to)});
float seam = 0.0;
${terms}
diffuseColor.rgb *= 1.0 - seam * ${glslFloat(SEAM_SHADE)};
${bandTerms(layout.band)}
`,
    );
  });
}
