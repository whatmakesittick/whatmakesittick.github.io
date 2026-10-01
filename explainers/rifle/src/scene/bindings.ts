import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { DEFAULT_VIEW, PRESETS, cycleOf } from '../state';
import type { Preset, RifleState, RifleStore, RifleStoreState } from '../state';
import type { RifleController } from './controller';

export interface SceneTargets extends PresetTargets {
  rifle: RifleController;
  labelVisibility: LabelPolicy;
}

function blankState(): AssemblyState {
  const { ms, shot, motion } = cycleOf({ phase: 0, gasPort: 'open' });
  return { time: ms, shot, motion, gasPort: 'open', playing: false, view: DEFAULT_VIEW };
}

function copyInto(target: AssemblyState, state: RifleState): AssemblyState {
  const { ms, shot, motion } = cycleOf(state);
  target.time = ms;
  target.shot = shot;
  target.motion = motion;
  target.gasPort = state.gasPort;
  target.playing = state.playing;
  target.view = state.view;
  return target;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly = blankState();
  private free = blankState();

  handOver(state: RifleState): AssemblyState {
    const next = copyInto(this.free, state);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

export function bindStore(store: RifleStore, targets: SceneTargets): () => void {
  const { rifle, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState();
  const push = (state: RifleState) => rifle.setState(assemblyState.handOver(state));
  rifle.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<RifleStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: rifle.views,
      labels: labelVisibility,
      prepare: push,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
