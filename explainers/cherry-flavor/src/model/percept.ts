import type { FlavorId, OdorantLevels, PerceptId, SmellId } from '../ids';
import { IN_MOUTH_S, SWALLOW_S } from './bite';
import { closestSmell } from './odorants';

export const NOTICE = { smell: 0.0225, sweet: 0.15 } as const;

function beforeBite(noseShare: number, pinched: boolean): PerceptId {
  if (pinched) return 'nothing';
  return noseShare >= NOTICE.smell ? 'smell' : 'nothing';
}

function whileChewing(noseShare: number, sweet: number, pinched: boolean): PerceptId {
  if (pinched) return 'pinched';
  if (noseShare >= NOTICE.smell) return 'flavor';
  return sweet >= NOTICE.sweet ? 'sweet' : 'cold';
}

function afterSwallow(noseShare: number, pinched: boolean): PerceptId {
  return !pinched && noseShare >= NOTICE.smell ? 'aftertaste' : 'gone';
}

export function perceptAt(
  seconds: number,
  noseShare: number,
  sweet: number,
  pinched: boolean,
): PerceptId {
  if (seconds < IN_MOUTH_S) return beforeBite(noseShare, pinched);
  if (seconds < SWALLOW_S) return whileChewing(noseShare, sweet, pinched);
  return afterSwallow(noseShare, pinched);
}

export function smellOf(flavor: FlavorId, desk: Readonly<OdorantLevels>): SmellId {
  return flavor === 'desk' ? closestSmell(desk) : flavor;
}
