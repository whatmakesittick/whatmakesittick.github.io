import type { AssemblyState, DetailId } from '../ids';
import { assemblyState, reverserTarget, spoolSpeeds, thrustShare } from '../model';
import type { EngineInputs, SpoolShares } from '../model';
import type { EngineState } from './store';

export type AssemblySource = Pick<
  EngineState,
  'phase' | 'playing' | 'thrust' | 'cutaway' | 'streams' | 'view'
>;

export function inputsOf(source: AssemblySource, detail: DetailId): EngineInputs {
  const { phase, playing, thrust, cutaway, streams, view } = source;
  return { phase, playing, thrust, cutaway, streams, view, detail };
}

export function spoolsNow(source: Pick<EngineState, 'thrust' | 'view'>): SpoolShares {
  return spoolSpeeds(source.thrust, reverserTarget(source.view.reverser));
}

export function thrustNow(source: Pick<EngineState, 'thrust' | 'view'>): number {
  return thrustShare(source.thrust, reverserTarget(source.view.reverser));
}

export function createAssemblyState(source: AssemblySource, detail: DetailId): AssemblyState {
  return assemblyState(inputsOf(source, detail));
}

export function writeAssemblyState(
  target: AssemblyState,
  source: AssemblySource,
  detail: DetailId,
): AssemblyState {
  const next = createAssemblyState(source, detail);
  const { reading } = target;
  Object.assign(target, next);
  target.reading = Object.assign(reading, next.reading);
  return target;
}
