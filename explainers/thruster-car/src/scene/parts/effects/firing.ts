import type { AssemblyState, NozzleId } from '../../../ids';

export type FiringState = Pick<AssemblyState, 'nozzles' | 'tank'>;

export function firingThrust(state: FiringState, id: NozzleId): number {
  return state.tank.empty ? 0 : Math.max(state.nozzles[id], 0);
}
