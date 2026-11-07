import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountPianoScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createPianoStore } from './state';
import type { PianoStoreState } from './state';
import { PIANO_TIMELINE } from './timeline';
import { CHAPTER_ACTIONS, PIANO_CHOICES, PIANO_READOUTS, VIEW_TOGGLES, mountPianoUi } from './ui';

export default defineExplainer<PianoStoreState>({
  timeline: PIANO_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createPianoStore(),
  dock: { choices: PIANO_CHOICES, toggles: VIEW_TOGGLES },
  readouts: PIANO_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountPianoScene,
  mountUi: mountPianoUi,
});
