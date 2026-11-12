import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { PRESETS, createAssemblyState, createLiveReader, writeAssemblyState } from '../state';
import type { AssemblySource, PianoStore, PianoStoreState, Preset } from '../state';
import type { PianoController } from './controller';

export interface SceneTargets extends PresetTargets {
  piano: Pick<PianoController, 'build' | 'setState' | 'views'>;
  labelVisibility: LabelPolicy;
}

function doubleBuffered(source: AssemblySource): (next: AssemblySource) => AssemblyState {
  const read = createLiveReader();
  let heldByAssembly = createAssemblyState(source, read);
  let free = createAssemblyState(source, read);
  return (next) => {
    const state = writeAssemblyState(next, free, read);
    free = heldByAssembly;
    heldByAssembly = state;
    return state;
  };
}

export async function bindStore(store: PianoStore, targets: SceneTargets): Promise<() => void> {
  const { piano, labelVisibility } = targets;
  const handOver = doubleBuffered(store.getState());
  const push = (state: AssemblySource) => piano.setState(handOver(state));
  await piano.build(handOver(store.getState()));
  push(store.getState());
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<PianoStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: piano.views,
      labels: labelVisibility,
      prepare: push,
      onView: (_view, state) => push(state),
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
