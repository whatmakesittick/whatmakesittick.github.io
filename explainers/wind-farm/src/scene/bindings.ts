import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { PRESETS, createAssemblyState, writeAssemblyState } from '../state';
import type { AssemblySource, Preset, WindFarmStore, WindFarmStoreState } from '../state';
import type { WindFarmController } from './controller';

export interface SceneTargets extends PresetTargets {
  windFarm: Pick<WindFarmController, 'build' | 'setState' | 'views'>;
  labelVisibility: LabelPolicy;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly: AssemblyState;
  private free: AssemblyState;

  constructor(source: AssemblySource) {
    this.heldByAssembly = createAssemblyState(source);
    this.free = createAssemblyState(source);
  }

  handOver(source: AssemblySource): AssemblyState {
    const next = writeAssemblyState(this.free, source);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

export function bindStore(store: WindFarmStore, targets: SceneTargets): () => void {
  const { windFarm, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState(store.getState());
  const push = (state: AssemblySource) => windFarm.setState(assemblyState.handOver(state));
  windFarm.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<WindFarmStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: windFarm.views,
      labels: labelVisibility,
      prepare: push,
      onView: (_view, state) => push(state),
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
