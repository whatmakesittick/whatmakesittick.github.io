import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountOilRigScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createOilRigStore } from './state';
import type { OilRigStoreState } from './state';
import { OIL_RIG_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  OIL_RIG_CHOICES,
  OIL_RIG_READOUTS,
  VIEW_TOGGLES,
  mountOilRigUi,
} from './ui';

export default defineExplainer<OilRigStoreState>({
  id: 'oil-rig',
  timeline: OIL_RIG_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createOilRigStore(),
  dock: { choices: OIL_RIG_CHOICES, toggles: VIEW_TOGGLES },
  readouts: OIL_RIG_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountOilRigScene,
  mountUi: mountOilRigUi,
});
