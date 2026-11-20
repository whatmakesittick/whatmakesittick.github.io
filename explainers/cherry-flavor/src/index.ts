import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountCherryFlavorScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createFlavorStore } from './state';
import type { FlavorStoreState } from './state';
import { BITE_TIMELINE } from './timeline';
import { CHAPTER_ACTIONS, FLAVOR_READOUTS, SCALE_CHOICES, VIEW_TOGGLES, mountFlavorUi } from './ui';

export default defineExplainer<FlavorStoreState>({
  timeline: BITE_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createFlavorStore(),
  dock: { choices: SCALE_CHOICES, toggles: VIEW_TOGGLES },
  readouts: FLAVOR_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountCherryFlavorScene,
  mountUi: mountFlavorUi,
});
