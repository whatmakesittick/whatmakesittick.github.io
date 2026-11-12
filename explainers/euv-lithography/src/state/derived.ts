import type { AssemblyState } from '../ids';
import { flashAt, insetAt, lightLeftAt, bounceCountAt, opticsOf, scanAt } from '../model';
import type { EuvState } from './store';

export type AssemblySource = Pick<EuvState, 'phase' | 'playing' | 'machine' | 'view'>;

export function writeAssemblyState(target: AssemblyState, source: AssemblySource): AssemblyState {
  const { phase, playing, machine } = source;
  target.phase = phase;
  target.playing = playing;
  target.machine = machine;
  target.optics = opticsOf(machine);
  Object.assign(target.flash, flashAt(phase, machine));
  target.light.left = lightLeftAt(phase);
  target.light.bounces = bounceCountAt(phase);
  target.inset = insetAt(phase);
  Object.assign(target.scan, scanAt(phase, machine));
  Object.assign(target.view, source.view);
  return target;
}

export function createAssemblyState(source: AssemblySource): AssemblyState {
  const empty = { flash: {}, light: {}, scan: {}, view: {} };
  return writeAssemblyState(empty as AssemblyState, source);
}
