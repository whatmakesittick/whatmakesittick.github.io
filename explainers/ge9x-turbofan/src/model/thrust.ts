import { coldDirection } from './streams';
import { spoolSpeeds } from './spools';

export const COLD_WEIGHT = 0.8;
export const HOT_WEIGHT = 0.2;

export function thrustShare(lever: number, reverserDeploy: number): number {
  const { fan } = spoolSpeeds(lever, reverserDeploy);
  return fan * fan * (COLD_WEIGHT * coldDirection(reverserDeploy) + HOT_WEIGHT);
}
