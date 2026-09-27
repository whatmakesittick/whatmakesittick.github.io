import './style.css';
import { defineExplainer } from '@core/explainer';
import { mountSewingScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createSewingStore } from './state';
import type { SewingStoreState } from './state';
import { SEWING_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  SEWING_CHOICES,
  SEWING_READOUTS,
  VIEW_TOGGLES,
  mountSewingUi,
} from './ui';

export default defineExplainer<SewingStoreState>({
  id: 'sewing-machine',
  timeline: SEWING_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createSewingStore(),
  dock: { choices: SEWING_CHOICES, toggles: VIEW_TOGGLES },
  readouts: SEWING_READOUTS,
  actions: CHAPTER_ACTIONS,
  mountScene: mountSewingScene,
  mountUi: mountSewingUi,
});
