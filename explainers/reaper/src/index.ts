import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountReaperScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createReaperStore } from './state';
import type { ReaperStoreState } from './state';
import { REAPER_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  REAPER_CHOICES,
  REAPER_READOUTS,
  VIEW_TOGGLES,
  mountReaperUi,
} from './ui';

export default defineExplainer<ReaperStoreState>({
  id: 'reaper',
  timeline: REAPER_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createReaperStore(),
  dock: { choices: REAPER_CHOICES, toggles: VIEW_TOGGLES },
  readouts: REAPER_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountReaperScene,
  mountUi: mountReaperUi,
});
