import './style.css';
import { defineExplainer } from '@core/explainer';
import { SCENE_OPTIONS, mountMriScannerScene } from './scene';
import { PART_INFO } from './scene/partInfo';
import { PRESETS, createMriScannerStore } from './state';
import type { MriScannerStoreState } from './state';
import { MRI_SCANNER_TIMELINE } from './timeline';
import {
  CHAPTER_ACTIONS,
  MRI_SCANNER_CHOICES,
  MRI_SCANNER_READOUTS,
  VIEW_TOGGLES,
  mountMriScannerUi,
} from './ui';

export default defineExplainer<MriScannerStoreState>({
  id: 'mri-scanner',
  timeline: MRI_SCANNER_TIMELINE,
  presets: PRESETS,
  parts: PART_INFO,
  createStore: () => createMriScannerStore(),
  dock: { choices: MRI_SCANNER_CHOICES, toggles: VIEW_TOGGLES },
  readouts: MRI_SCANNER_READOUTS,
  actions: CHAPTER_ACTIONS,
  scene: SCENE_OPTIONS,
  mountScene: mountMriScannerScene,
  mountUi: mountMriScannerUi,
});
