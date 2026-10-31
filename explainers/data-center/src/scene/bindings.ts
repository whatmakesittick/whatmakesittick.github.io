import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState, CameraView } from '../ids';
import { phaseAt } from '../model';
import { PRESETS, createAssemblyState, writeAssemblyState } from '../state';
import type {
  AssemblySource,
  DataCenterState,
  DataCenterStore,
  DataCenterStoreState,
  Preset,
} from '../state';
import { CHASE_VIEW } from './cameraViews';
import type { DataCenterController, ViewFramer } from './controller';

export interface SceneTargets extends PresetTargets {
  dataCenter: Pick<DataCenterController, 'build' | 'setState' | 'views'>;
  labelVisibility: LabelPolicy;
}

type CameraSource = Pick<DataCenterState, 'preset' | 'view'>;

export function cameraFor({ preset, view }: CameraSource): CameraView {
  return view.follow ? CHASE_VIEW : PRESETS[preset].camera;
}

function doubleBuffered(source: AssemblySource): (next: AssemblySource) => AssemblyState {
  let heldByAssembly = createAssemblyState(source);
  let free = createAssemblyState(source);
  return (next) => {
    const state = writeAssemblyState(free, next);
    free = heldByAssembly;
    heldByAssembly = state;
    return state;
  };
}

function followingFramer(store: DataCenterStore, views: ViewFramer): ViewFramer {
  return {
    frame: (view, animate, variant) => {
      const following = store.getState().view.follow;
      views.frame(following ? CHASE_VIEW : view, animate, variant);
    },
  };
}

function reframeChaseByPhase(store: DataCenterStore, views: ViewFramer): () => void {
  return store.subscribe(
    (state) => phaseAt(state.phase),
    () => {
      if (store.getState().view.follow) views.frame(CHASE_VIEW, true);
    },
  );
}

export function bindStore(store: DataCenterStore, targets: SceneTargets): () => void {
  const { dataCenter, labelVisibility } = targets;
  const handOver = doubleBuffered(store.getState());
  const push = (state: AssemblySource) => dataCenter.setState(handOver(state));
  let following = store.getState().view.follow;
  const onView = (view: DataCenterState['view'], state: DataCenterState) => {
    push(state);
    if (view.follow === following) return;
    following = view.follow;
    dataCenter.views.frame(cameraFor(state), true);
  };
  dataCenter.build(handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    reframeChaseByPhase(store, dataCenter.views),
    bindPresets<DataCenterStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: followingFramer(store, dataCenter.views),
      labels: labelVisibility,
      prepare: push,
      onView,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
