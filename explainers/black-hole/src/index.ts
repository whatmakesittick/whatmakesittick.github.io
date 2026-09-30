import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountBlackHoleScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createBlackHoleStore } from './state';
import type { BlackHoleStoreState } from './state';
import { BLACK_HOLE_TIMELINE } from './timeline';
import {
  BLACK_HOLE_CHOICES,
  BLACK_HOLE_READOUTS,
  CHAPTER_ACTIONS,
  VIEW_TOGGLES,
  mountBlackHoleUi,
} from './ui';

export default defineExplainer<BlackHoleStoreState>({
  id: 'black-hole',
  timeline: BLACK_HOLE_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createBlackHoleStore(),
  dock: { choices: BLACK_HOLE_CHOICES, toggles: VIEW_TOGGLES },
  readouts: BLACK_HOLE_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountBlackHoleScene,
  mountUi: mountBlackHoleUi,
});
