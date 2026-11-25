import { createGarmentPatcher, paintCall } from '@core/figure/body/garmentShader';
import { GARMENT, GARMENT_ROUGHNESS } from '../finishes';
import { CAP_LABEL_ATTRIBUTE } from './capLabel';
import { SHORTS, SINGLET, SOCKS } from './cut';
import { glslFloat } from '@core/scene/shaderPatch';

export const GARMENT_ATTRIBUTES = { distances: 'garments', extents: 'garmentExtents' } as const;

const HAIR_EDGE = { from: -0.0015, to: 0.0035, cover: 0.94 } as const;
const CONTACT = { shortsM: 0.016, shorts: 0.22, singletM: 0.012, singlet: 0.16 } as const;
const CAP_SEAM = {
  panelRad: Math.PI / 3,
  halfWidthRad: 0.011,
  fromM: 0.008,
  toM: 0.085,
  fadeM: 0.012,
  shade: 0.3,
} as const;
const BRIM_SHADE = {
  reachM: 0.058,
  fromM: 0.004,
  frontFrom: 0.35,
  frontTo: 0.8,
  amount: 0.38,
} as const;

const GLSL_DIGITS = 4;

function glsl(value: number): string {
  return glslFloat(value, GLSL_DIGITS);
}

const WAIST_GAP = 'vGarments.x';
const ARMHOLE = 'vGarments.y';
const SHORTS_GAP = 'vGarments.z';
const SOCK_GAP = 'vGarments.w';
const CAP_GAP = 'vGarmentExtents.x';
const HAIR_GAP = 'vGarmentExtents.y';
const SIDE_X = 'vGarmentExtents.w';
const HEAD_SIN = 'vRunnerCloth.y';
const HEAD_COS = 'vRunnerCloth.z';
const PANEL = 'vRunnerExtra.y';
const LEG_HEM = 'vRunnerExtra.z';
const NECK = 'vRunnerExtra.w';
const SINGLET_GAP = `min(${WAIST_GAP}, min(${ARMHOLE}, ${NECK}))`;

const TRIM = `min(${SINGLET_GAP}, ${glsl(SINGLET.trimM)} - ${ARMHOLE})`;

const HAIR = /* glsl */ `
{
  float hairCover = smoothstep(${glsl(HAIR_EDGE.from)}, ${glsl(HAIR_EDGE.to)}, ${HAIR_GAP});
  diffuseColor.rgb = mix(diffuseColor.rgb, uGarment[${GARMENT.hair}], hairCover * ${glsl(HAIR_EDGE.cover)});
  garmentRough = mix(garmentRough, GARMENT_ROUGHNESS[${GARMENT.hair}], hairCover);
}
`;

function contactShade(gap: string, reachM: number, amount: number): string {
  return `diffuseColor.rgb *= 1.0 - ${glsl(amount)} * (1.0 - garmentCover(${gap})) * smoothstep(${glsl(-reachM)}, 0.0, ${gap});`;
}

const BRIM_SHADOW = /* glsl */ `
{
  float underBrim = (1.0 - garmentCover(${CAP_GAP})) * smoothstep(${glsl(-BRIM_SHADE.reachM)}, ${glsl(-BRIM_SHADE.fromM)}, ${CAP_GAP});
  float facing = smoothstep(${glsl(BRIM_SHADE.frontFrom)}, ${glsl(BRIM_SHADE.frontTo)}, ${HEAD_COS});
  diffuseColor.rgb *= 1.0 - ${glsl(BRIM_SHADE.amount)} * underBrim * facing;
}
`;

const CAP_PANELS = /* glsl */ `
{
  float azimuth = atan(${HEAD_SIN}, ${HEAD_COS});
  float around = mod(azimuth, ${glsl(CAP_SEAM.panelRad)});
  float off = min(around, ${glsl(CAP_SEAM.panelRad)} - around);
  float seam = 1.0 - smoothstep(${glsl(CAP_SEAM.halfWidthRad)}, ${glsl(CAP_SEAM.halfWidthRad)} + fwidth(azimuth) + 1e-4, off);
  float crown = smoothstep(${glsl(CAP_SEAM.fromM)}, ${glsl(CAP_SEAM.fromM + CAP_SEAM.fadeM)}, ${CAP_GAP})
    * (1.0 - smoothstep(${glsl(CAP_SEAM.toM - CAP_SEAM.fadeM)}, ${glsl(CAP_SEAM.toM)}, ${CAP_GAP}));
  diffuseColor.rgb *= 1.0 - ${glsl(CAP_SEAM.shade)} * seam * crown * garmentCover(${CAP_GAP});
}
`;

const PAINT = [
  paintCall(GARMENT.sock, SOCK_GAP),
  paintCall(GARMENT.sockCuff, `min(${SOCK_GAP}, ${glsl(SOCKS.cuffM)} - ${SOCK_GAP})`),
  paintCall(GARMENT.shorts, SHORTS_GAP),
  paintCall(GARMENT.waistband, `min(${SHORTS_GAP}, ${glsl(SHORTS.waistbandM)} + ${WAIST_GAP})`),
  paintCall(GARMENT.piping, `min(${SHORTS_GAP}, ${glsl(SHORTS.pipingM)} - ${LEG_HEM})`),
  contactShade(SHORTS_GAP, CONTACT.shortsM, CONTACT.shorts),
  paintCall(GARMENT.singlet, SINGLET_GAP),
  paintCall(GARMENT.sidePanel, `min(${SINGLET_GAP}, ${PANEL})`),
  paintCall(GARMENT.trimRight, `min(${TRIM}, -${SIDE_X})`),
  paintCall(GARMENT.trimLeft, `min(${TRIM}, ${SIDE_X})`),
  contactShade(SINGLET_GAP, CONTACT.singletM, CONTACT.singlet),
  HAIR,
  BRIM_SHADOW,
  paintCall(GARMENT.cap, CAP_GAP),
  CAP_PANELS,
].join('\n');

export const applyGarments = createGarmentPatcher({
  attributes: GARMENT_ATTRIBUTES,
  roughness: GARMENT_ROUGHNESS,
  paint: PAINT,
  label: {
    attribute: CAP_LABEL_ATTRIBUTE,
    garment: GARMENT.capLogo,
    coverGap: CAP_GAP,
    side: SIDE_X,
  },
  cacheKey: 'runnerGarments',
});
