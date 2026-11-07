import type { MaterialFinish } from '@core/scene/materials';
import { FINISHES } from '../../finishes';

const REFLECTION = 2.6;

export const GLOSS = {
  case: { ...FINISHES.caseGloss, envMapIntensity: REFLECTION },
  rim: { ...FINISHES.rimGloss, envMapIntensity: REFLECTION },
} as const satisfies Record<string, MaterialFinish>;
