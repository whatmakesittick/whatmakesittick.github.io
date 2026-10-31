import type { AssemblyState } from '../ids';
import { jouleAt } from '../model';
import { coolantAt } from '../model/cooling';
import { rackReading } from '../model/power';
import type { DataCenterState } from './store';

export type AssemblySource = Pick<
  DataCenterState,
  'phase' | 'playing' | 'cooling' | 'load' | 'outageToken' | 'view'
>;

export function writeAssemblyState(target: AssemblyState, source: AssemblySource): AssemblyState {
  const { phase, playing, cooling, load } = source;
  target.phase = phase;
  target.playing = playing;
  target.cooling = cooling;
  target.load = load;
  Object.assign(target.joule, jouleAt(phase, cooling));
  Object.assign(target.rack, rackReading(cooling, load));
  Object.assign(target.coolant, coolantAt(cooling, load));
  target.outage.token = source.outageToken;
  Object.assign(target.view, source.view);
  return target;
}

export function createAssemblyState(source: AssemblySource): AssemblyState {
  const empty = { joule: {}, rack: {}, coolant: {}, outage: {}, view: {} };
  return writeAssemblyState(empty as AssemblyState, source);
}
