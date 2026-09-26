import './style.css';
import { defineExplainer } from '@core/explainer';
import { mountHelicopterScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createHelicopterStore } from './state';
import type { HelicopterStoreState } from './state';
import { HELICOPTER_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  HELICOPTER_CHOICES,
  HELICOPTER_READOUTS,
  VIEW_TOGGLES,
  mountHelicopterUi,
} from './ui';

export default defineExplainer<HelicopterStoreState>({
  id: 'helicopter',
  timeline: HELICOPTER_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createHelicopterStore(),
  dock: { choices: HELICOPTER_CHOICES, toggles: VIEW_TOGGLES },
  readouts: HELICOPTER_READOUTS,
  actions: CHAPTER_ACTIONS,
  mountScene: mountHelicopterScene,
  mountUi: mountHelicopterUi,
});
