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

function doubleBuffered(source: AssemblySource): (next: AssemblySource) => AssemblyState {
  const read = createLiveReader();
  let heldByAssembly = createAssemblyState(source, read);
  let free = createAssemblyState(source, read);
  return (next) => {
    const state = writeAssemblyState(free, next, read);
    free = heldByAssembly;
    heldByAssembly = state;
    return state;
  };
}

export function bindStore(store: MaglevTrainStore, targets: SceneTargets): () => void {
  const { train, labelVisibility } = targets;
  const handOver = doubleBuffered(store.getState());
  const push = (state: AssemblySource) => train.setState(handOver(state));
  train.build(handOver(store.getState()));
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
