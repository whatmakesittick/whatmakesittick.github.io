import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { PRESETS, createAssemblyState, toAssemblyState } from '../state';
import type { Preset, SwimStore, SwimStoreState } from '../state';
import type { SwimController } from './controller';

export interface SceneTargets extends PresetTargets {
  swim: Pick<SwimController, 'build' | 'setState' | 'views'>;
  labelVisibility: LabelPolicy;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly: AssemblyState;
  private free: AssemblyState;

  constructor(source: SwimStoreState) {
    this.heldByAssembly = createAssemblyState(source);
    this.free = createAssemblyState(source);
  }

  handOver(state: SwimStoreState): AssemblyState {
    const next = toAssemblyState(state, state.phase, state.playing, this.free);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

export async function bindStore(store: SwimStore, targets: SceneTargets): Promise<() => void> {
  const { swim, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState(store.getState());
  const push = (state: SwimStoreState) => swim.setState(assemblyState.handOver(state));
  await swim.build(assemblyState.handOver(store.getState()));
  push(store.getState());
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<SwimStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: swim.views,
      labels: labelVisibility,
      prepare: push,
      onView: (_view, state) => push(state),
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
