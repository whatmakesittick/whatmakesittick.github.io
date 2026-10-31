import type { CoolingId, LoadId } from '../ids';
import { FAN_SHARE } from './constants';

export function fanShareAt(cooling: CoolingId, load: LoadId): number {
  return FAN_SHARE[cooling][load];
}
