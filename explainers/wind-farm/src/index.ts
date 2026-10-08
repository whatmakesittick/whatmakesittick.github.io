import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountWindFarmScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createWindFarmStore } from './state';
import type { WindFarmStoreState } from './state';
import { WIND_FARM_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  VIEW_TOGGLES,
  WIND_FARM_CHOICES,
  WIND_FARM_READOUTS,
  mountWindFarmUi,
} from './ui';

export default defineExplainer<WindFarmStoreState>({
  id: 'wind-farm',
  timeline: WIND_FARM_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createWindFarmStore(),
  dock: { choices: WIND_FARM_CHOICES, toggles: VIEW_TOGGLES },
  readouts: WIND_FARM_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountWindFarmScene,
  mountUi: mountWindFarmUi,
});
