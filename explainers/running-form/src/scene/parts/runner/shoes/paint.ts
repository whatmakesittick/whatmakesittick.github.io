import { createGarmentPatcher, paintCall } from '@core/figure/body/garmentShader';
import { SHOE_OVERLAY_ROUGHNESS } from '../finishes';
import { UPPER_BACK_M } from './design';
import { UPPER_FIELDS } from './upper';
import { glslFloat } from '@core/scene/shaderPatch';

export const SHOE_EXTENTS = 'shoeExtents';

export const OVERLAY = {
  tongue: 0,
  eyestay: 1,
  laces: 2,
  heelCounter: 3,
  toeBumper: 4,
} as const;

export const LACES = {
  fromM: 0.052,
  toM: 0.128,
  halfM: 0.0115,
  eyestayM: 0.011,
  periodM: 0.0118,
  barM: 0.0033,
} as const;

export const HEEL_COUNTER = { frontM: 0.018, backHeightM: 0.05, slope: 0.3 } as const;
export const TOE_BUMPER = { fromM: 0.166, heightM: 0.011 } as const;

const GLSL_DIGITS = 5;

function glsl(value: number): string {
  return glslFloat(value, GLSL_DIGITS);
}

const X = 'vGarments.x';
const H = 'vGarments.y';
const LAT = 'abs(vGarments.z)';

const LACE_SPAN = `min(${X} - ${glsl(LACES.fromM)}, ${glsl(LACES.toM)} - ${X})`;
const TONGUE = `min(${LACE_SPAN}, ${glsl(LACES.halfM)} - ${LAT})`;
const EYESTAY = `min(${LACE_SPAN} + ${glsl(LACES.eyestayM / 2)}, min(${LAT} - ${glsl(LACES.halfM)}, ${glsl(LACES.halfM + LACES.eyestayM)} - ${LAT}))`;
const LACE_BARS = `${glsl(LACES.barM)} - abs(fract((${X} - ${glsl(LACES.fromM)}) / ${glsl(LACES.periodM)}) - 0.5) * ${glsl(LACES.periodM)}`;
const HEEL = `min(${glsl(HEEL_COUNTER.frontM)} - ${X}, ${glsl(HEEL_COUNTER.backHeightM)} - (${X} - ${glsl(UPPER_BACK_M)}) * ${glsl(HEEL_COUNTER.slope)} - ${H})`;
const TOE = `min(${X} - ${glsl(TOE_BUMPER.fromM)}, ${glsl(TOE_BUMPER.heightM)} - ${H})`;

const PAINT = [
  paintCall(OVERLAY.tongue, TONGUE),
  paintCall(OVERLAY.eyestay, EYESTAY),
  paintCall(OVERLAY.laces, `min(${TONGUE}, ${LACE_BARS})`),
  paintCall(OVERLAY.heelCounter, HEEL),
  paintCall(OVERLAY.toeBumper, TOE),
].join('\n');

export const applyShoePaint = createGarmentPatcher({
  attributes: { distances: UPPER_FIELDS, extents: SHOE_EXTENTS },
  roughness: SHOE_OVERLAY_ROUGHNESS,
  paint: PAINT,
  cacheKey: 'runnerShoe',
});
