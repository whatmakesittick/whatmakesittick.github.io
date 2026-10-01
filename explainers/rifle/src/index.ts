import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountRifleScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createRifleStore } from './state';
import type { RifleStoreState } from './state';
import { RIFLE_TIMELINE } from './timeline';
import { CHAPTER_ACTIONS, RIFLE_CHOICES, RIFLE_READOUTS, VIEW_TOGGLES, mountRifleUi } from './ui';

export default defineExplainer<RifleStoreState>({
  id: 'rifle',
  timeline: RIFLE_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createRifleStore(),
  dock: { choices: RIFLE_CHOICES, toggles: VIEW_TOGGLES },
  readouts: RIFLE_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountRifleScene,
  mountUi: mountRifleUi,
});
