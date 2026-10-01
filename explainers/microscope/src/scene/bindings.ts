import { shallow } from 'zustand/vanilla/shallow';
import { bindPresets } from '@core/scene/presetBinder';
import type { LabelPolicy, PresetTargets } from '@core/scene/presetBinder';
import { PRESETS } from '../state';
import type { CameraView, MicroscopeStore } from '../state';
import type { MicroscopeController } from './microscopeController';

export interface SceneTargets extends PresetTargets {
  microscope: MicroscopeController;
  labelVisibility: LabelPolicy;
}

type OpticsChoice = 'objective' | 'eyepiece';

const REFRAMED_VIEWS: Record<OpticsChoice, CameraView> = {
  objective: 'aperture',
  eyepiece: 'eyepiece',
};

function reframeOnChange(
  store: MicroscopeStore,
  microscope: MicroscopeController,
  choice: OpticsChoice,
): () => void {
  return store.subscribe(
    (state) => state[choice],
    () => {
      const camera = PRESETS[store.getState().preset].camera;
      if (camera === REFRAMED_VIEWS[choice]) microscope.views.frame(camera, true);
    },
  );
}

export function bindStore(store: MicroscopeStore, targets: SceneTargets): () => void {
  const { microscope, labelVisibility } = targets;
  microscope.build(store.getState());
  const unsubscribers = [
    bindPresets(targets, store, {
      presets: PRESETS,
      views: microscope.views,
      labels: labelVisibility,
      onView: (view) => microscope.applyView(view),
    }),
    store.subscribe(
      (state) => [state.objective, state.eyepiece, state.focus] as const,
      ([objective, eyepiece, focus]) => microscope.setOptics({ objective, eyepiece, focus }),
      { equalityFn: shallow },
    ),
    store.subscribe(
      (state) => state.wavelength,
      (wavelength) => microscope.setWavelength(wavelength),
    ),
    reframeOnChange(store, microscope, 'objective'),
    reframeOnChange(store, microscope, 'eyepiece'),
  ];
  return () => unsubscribers.forEach((unsubscribe) => unsubscribe());
}
