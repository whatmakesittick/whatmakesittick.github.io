import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { PRESETS, createAssemblyState, createLiveReader, writeAssemblyState } from '../state';
import type { AssemblySource, Preset, ThrusterCarStore, ThrusterCarStoreState } from '../state';
import type { ThrusterCarController } from './controller';

export interface SceneTargets extends PresetTargets {
  car: Pick<ThrusterCarController, 'build' | 'setState' | 'views'>;
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

export function bindStore(store: ThrusterCarStore, targets: SceneTargets): () => void {
  const { car, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState(store.getState());
  const push = (state: AssemblySource) => car.setState(assemblyState.handOver(state));
  car.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<ThrusterCarStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: car.views,
      labels: labelVisibility,
      prepare: push,
      onView: (_view, state) => push(state),
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
