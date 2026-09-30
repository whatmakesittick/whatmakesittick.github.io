import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountBlackHoleScene } from './scene';
import { PRESETS, createBlackHoleStore } from './state';
import { BLACK_HOLE_TIMELINE } from './timeline';
import { VIEW_TOGGLES } from './ui';

export default defineExplainer({
  id: 'black-hole',
  timeline: BLACK_HOLE_TIMELINE,
  presets: PRESETS,
  parts: {},
  createStore: () => createBlackHoleStore(),
  dock: { choices: [], toggles: VIEW_TOGGLES },
  readouts: [],
  scene: SCENE_OPTIONS,
  mountScene: mountBlackHoleScene,
});
