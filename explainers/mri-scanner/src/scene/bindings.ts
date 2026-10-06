import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState } from '../ids';
import { PRESETS, createAssemblyState, writeAssemblyState } from '../state';
import type { AssemblySource, MriScannerStore, MriScannerStoreState, Preset } from '../state';
import type { MriScannerController } from './controller';

export interface SceneTargets extends PresetTargets {
  mriScanner: Pick<MriScannerController, 'build' | 'setState' | 'views'>;
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
    const next = writeAssemblyState(this.carryPicture(this.free), source);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }

  private carryPicture(target: AssemblyState): AssemblyState {
    target.picture = this.heldByAssembly.picture;
    target.pictureVersion = this.heldByAssembly.pictureVersion;
    return target;
  }
}

export function bindStore(store: MriScannerStore, targets: SceneTargets): () => void {
  const { mriScanner, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState(store.getState());
  const push = (state: AssemblySource) => mriScanner.setState(assemblyState.handOver(state));
  mriScanner.build(assemblyState.handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    bindPresets<MriScannerStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: mriScanner.views,
      labels: labelVisibility,
      prepare: push,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
