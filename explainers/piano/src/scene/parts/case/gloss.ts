import type { MaterialFinish } from '@core/scene/materials';
import { FINISHES } from '../../finishes';

const REFLECTION = 1.25;
const POLISH = 0.05;

export const GLOSS = {
  case: { ...FINISHES.caseGloss, envMapIntensity: REFLECTION, roughness: POLISH },
  rim: { ...FINISHES.rimGloss, envMapIntensity: REFLECTION, roughness: POLISH },
} as const satisfies Record<string, MaterialFinish>;
