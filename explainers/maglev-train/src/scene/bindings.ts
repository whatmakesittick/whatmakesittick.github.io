import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { PRESETS, createAssemblyState, createLiveReader, writeAssemblyState } from '../state';
import type { AssemblySource, MaglevTrainStore, MaglevTrainStoreState, Preset } from '../state';
import type { MaglevTrainController } from './controller';

export interface SceneTargets extends PresetTargets {
  train: Pick<MaglevTrainController, 'build' | 'setState' | 'views'>;
  labelVisibility: LabelPolicy;
}

class DoubleBufferedAssemblyState {
  private readonly read = createLiveReader();
  private heldByAssembly: AssemblyState;
  private free: AssemblyState;

  constructor(source: AssemblySource) {
    this.heldByAssembly = createAssemblyState(source, this.read);
    this.free = createAssemblyState(source, this.read);
  }

  handOver(source: AssemblySource): AssemblyState {
    const next = writeAssemblyState(this.free, source, this.read);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

export function bindStore(store: MaglevTrainStore, targets: SceneTargets): () => void {
  const { train, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState(store.getState());
  const push = (state: AssemblySource) => train.setState(assemblyState.handOver(state));
  train.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<MaglevTrainStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: train.views,
      labels: labelVisibility,
      prepare: push,
      onView: (_view, state) => push(state),
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
