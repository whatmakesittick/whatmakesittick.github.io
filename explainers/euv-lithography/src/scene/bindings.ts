import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import type { AssemblyState, CameraView } from '../ids';
import { phaseAt } from '../model';
import { PRESETS, createAssemblyState, writeAssemblyState } from '../state';
import type { AssemblySource, EuvState, EuvStore, EuvStoreState, Preset } from '../state';
import { CHASE_VIEW } from './cameraViews';
import type { EuvController, ViewFramer } from './controller';

export interface SceneTargets extends PresetTargets {
  euv: Pick<EuvController, 'build' | 'setState' | 'views'>;
  labelVisibility: LabelPolicy;
}

type CameraSource = Pick<EuvState, 'preset' | 'view'>;

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

function followingFramer(store: EuvStore, views: ViewFramer): ViewFramer {
  return {
    frame: (view, animate, variant) => {
      const following = store.getState().view.follow;
      views.frame(following ? CHASE_VIEW : view, animate, variant);
    },
  };
}

function reframeChaseByPhase(store: EuvStore, views: ViewFramer): () => void {
  return store.subscribe(
    (state) => phaseAt(state.phase),
    () => {
      if (store.getState().view.follow) views.frame(CHASE_VIEW, true);
    },
  );
}

export async function bindStore(store: EuvStore, targets: SceneTargets): Promise<() => void> {
  const { euv, labelVisibility } = targets;
  const handOver = doubleBuffered(store.getState());
  const push = (state: AssemblySource) => euv.setState(handOver(state));
  let following = store.getState().view.follow;
  const onView = (view: EuvState['view'], state: EuvState) => {
    push(state);
    if (view.follow === following) return;
    following = view.follow;
    euv.views.frame(cameraFor(state), true);
  };
  await euv.build(handOver(store.getState()));
  const unsubscribers = [
    store.subscribe(push),
    reframeChaseByPhase(store, euv.views),
    bindPresets<EuvStoreState, Preset>(targets, store, {
      presets: PRESETS,
      views: followingFramer(store, euv.views),
      labels: labelVisibility,
      prepare: push,
      onView,
    }),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
