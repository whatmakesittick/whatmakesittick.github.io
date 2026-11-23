import { createGarmentPatcher, paintCall } from '@core/figure/body/garmentShader';
import { GARMENT, GARMENT_ROUGHNESS } from '../finishes';
import { CAP_LABEL_ATTRIBUTE } from './capLabel';
import { SHORTS, SINGLET, SOCKS } from './cut';

export const GARMENT_ATTRIBUTES = { distances: 'garments', extents: 'garmentExtents' } as const;

const HAIR_EDGE = { from: -0.0015, to: 0.0035, cover: 0.94 } as const;

function glsl(value: number): string {
  return value.toFixed(4);
}

const SINGLET_GAP = 'vGarments.x';
const ARMHOLE = 'vGarments.y';
const SHORTS_GAP = 'vGarments.z';
const SOCK_GAP = 'vGarments.w';
const CAP_GAP = 'vGarmentExtents.x';
const HAIR_GAP = 'vGarmentExtents.y';
const SIDE_X = 'vGarmentExtents.w';
const PANEL = 'vRunnerExtra.y';
const LEG_HEM = 'vRunnerExtra.z';

const TRIM = `min(${SINGLET_GAP}, ${glsl(SINGLET.trimM)} - ${ARMHOLE})`;

const HAIR = /* glsl */ `
{
  float hairCover = smoothstep(${glsl(HAIR_EDGE.from)}, ${glsl(HAIR_EDGE.to)}, ${HAIR_GAP});
  diffuseColor.rgb = mix(diffuseColor.rgb, uGarment[${GARMENT.hair}], hairCover * ${glsl(HAIR_EDGE.cover)});
  garmentRough = mix(garmentRough, GARMENT_ROUGHNESS[${GARMENT.hair}], hairCover);
}
`;

const PAINT = [
  paintCall(GARMENT.sock, SOCK_GAP),
  paintCall(GARMENT.sockCuff, `min(${SOCK_GAP}, ${glsl(SOCKS.cuffM)} - ${SOCK_GAP})`),
  paintCall(GARMENT.shorts, SHORTS_GAP),
  paintCall(GARMENT.waistband, `min(${SHORTS_GAP}, ${glsl(SHORTS.waistbandM)} + ${SINGLET_GAP})`),
  paintCall(GARMENT.piping, `min(${SHORTS_GAP}, ${glsl(SHORTS.pipingM)} - ${LEG_HEM})`),
  paintCall(GARMENT.singlet, SINGLET_GAP),
  paintCall(GARMENT.sidePanel, `min(${SINGLET_GAP}, ${PANEL})`),
  paintCall(GARMENT.trimRight, `min(${TRIM}, -${SIDE_X})`),
  paintCall(GARMENT.trimLeft, `min(${TRIM}, ${SIDE_X})`),
  HAIR,
  paintCall(GARMENT.cap, CAP_GAP),
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
