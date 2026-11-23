import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import { PART_GROUPS } from '../ids';
import type { AssemblyState } from '../ids';
import { PRESETS, createAssemblyState, toAssemblyState } from '../state';
import type { Preset, RunStore, RunStoreState } from '../state';
import { cameraFor } from './cameraViews';
import type { RunController } from './controller';

export interface SceneTargets extends PresetTargets {
  run: Pick<RunController, 'build' | 'setState' | 'views'>;
  labelVisibility: LabelPolicy;
}

class DoubleBufferedAssemblyState {
  private heldByAssembly: AssemblyState;
  private free: AssemblyState;

  constructor(source: RunStoreState) {
    this.heldByAssembly = createAssemblyState(source);
    this.free = createAssemblyState(source);
  }

  handOver(state: RunStoreState): AssemblyState {
    const next = toAssemblyState(state, this.free);
    this.free = this.heldByAssembly;
    this.heldByAssembly = next;
    return next;
  }
}

function highlightedGroups(preset: Preset): readonly string[] {
  return [...new Set(preset.highlight.flatMap((part) => PART_GROUPS[part]))];
}

export async function bindStore(store: RunStore, targets: SceneTargets): Promise<() => void> {
  const { run, labelVisibility } = targets;
  const assemblyState = new DoubleBufferedAssemblyState(store.getState());
  const push = (state: RunStoreState) => run.setState(assemblyState.handOver(state));
  const looking = {
    frame: (camera: Preset['camera'], animate: boolean) =>
      run.views.frame(cameraFor(camera, store.getState().lookFrom), animate),
  };
  await run.build(assemblyState.handOver(store.getState()));
  push(store.getState());
  const unsubscribers = [
    store.subscribe(push),
    store.subscribe(
      (state) => state.lookFrom,
      (lookFrom, previous) => {
        const { camera } = PRESETS[store.getState().preset];
        if (cameraFor(camera, lookFrom) !== cameraFor(camera, previous)) {
          run.views.frame(cameraFor(camera, lookFrom), true);
        }
      },
    ),
    bindPresets<RunStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: looking,
      labels: labelVisibility,
      highlight: highlightedGroups,
      prepare: push,
      onView: (_view, state) => push(state),
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
