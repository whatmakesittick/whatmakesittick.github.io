import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountAtpSynthaseScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createAtpSynthaseStore } from './state';
import type { AtpSynthaseStoreState } from './state';
import { ATP_TIMELINE } from './timeline';
import {
  ATP_SYNTHASE_CHOICES,
  ATP_SYNTHASE_READOUTS,
  CHAPTER_ACTIONS,
  VIEW_TOGGLES,
  mountAtpSynthaseUi,
} from './ui';

export default defineExplainer<AtpSynthaseStoreState>({
  id: 'atp-synthase',
  timeline: ATP_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createAtpSynthaseStore(),
  dock: { choices: ATP_SYNTHASE_CHOICES, toggles: VIEW_TOGGLES },
  readouts: ATP_SYNTHASE_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountAtpSynthaseScene,
  mountUi: mountAtpSynthaseUi,
});
