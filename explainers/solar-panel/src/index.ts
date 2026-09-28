import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountSolarPanelScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createSolarPanelStore } from './state';
import type { SolarPanelStoreState } from './state';
import { SOLAR_PANEL_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  SOLAR_PANEL_CHOICES,
  SOLAR_PANEL_READOUTS,
  VIEW_TOGGLES,
  mountSolarPanelUi,
} from './ui';

export default defineExplainer<SolarPanelStoreState>({
  id: 'solar-panel',
  timeline: SOLAR_PANEL_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createSolarPanelStore(),
  dock: { choices: SOLAR_PANEL_CHOICES, toggles: VIEW_TOGGLES },
  readouts: SOLAR_PANEL_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountSolarPanelScene,
  mountUi: mountSolarPanelUi,
});
