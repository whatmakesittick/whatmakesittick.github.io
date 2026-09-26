import type { Choice, ViewToggle } from '@core/explainer';
import { parseOption } from '@core/ui/parse';
import { ENGINE_LAYOUTS, ENGINE_TYPES } from '../model';
import type { EngineLayout } from '../model';
import type { EngineStoreState } from '../state';
import { ENGINE_TYPE_KEYS } from './format';

const LAYOUT_KEYS: Record<EngineLayout, string> = {
  single: 'engine.layouts.single',
  inline4: 'engine.layouts.inline4',
};

export const ENGINE_CHOICES: readonly Choice<EngineStoreState>[] = [
  {
    id: 'engine-type',
    labelKey: 'controls.fuel',
    shortcut: 'E',
    options: ENGINE_TYPES.map((type) => ({ value: type, labelKey: ENGINE_TYPE_KEYS[type] })),
    select: (state) => state.engineType,
    apply: (state, value) => state.setEngineType(parseOption(value, ENGINE_TYPES)),
  },
  {
    id: 'layout',
    labelKey: 'controls.cylinders',
    shortcut: 'M',
    options: ENGINE_LAYOUTS.map((layout) => ({ value: layout, labelKey: LAYOUT_KEYS[layout] })),
    select: (state) => state.layout,
    apply: (state, value) => state.setLayout(parseOption(value, ENGINE_LAYOUTS)),
  },
];

export const VIEW_TOGGLES: readonly ViewToggle[] = [
  {
    view: 'cutaway',
    shortcut: 'C',
    nameKey: 'controls.views.cutaway.name',
    shortKey: 'controls.views.cutaway.short',
    hintKey: 'controls.views.cutaway.hint',
    icon: '<rect x="4" y="4" width="16" height="16" rx="3" /><path class="icon-fill" d="M12 4h5a3 3 0 0 1 3 3v10a3 3 0 0 1-3 3h-5Z" />',
  },
  {
    view: 'gas',
    shortcut: 'G',
    nameKey: 'controls.views.gas.name',
    shortKey: 'controls.views.gas.short',
    hintKey: 'controls.views.gas.hint',
    icon: '<circle cx="8" cy="15" r="4" /><circle cx="15.5" cy="9" r="4.5" /><circle cx="17" cy="18" r="2" />',
  },
  {
    view: 'labels',
    shortcut: 'L',
    nameKey: 'controls.views.labels.name',
    shortKey: 'controls.views.labels.short',
    hintKey: 'controls.views.labels.hint',
    icon: '<path d="M3.5 11.5V4.5a1 1 0 0 1 1-1h7l9 9-8 8Z" /><circle cx="8" cy="8" r="1.6" />',
  },
  {
    view: 'flow',
    shortcut: 'F',
    nameKey: 'controls.views.flow.name',
    shortKey: 'controls.views.flow.short',
    hintKey: 'controls.views.flow.hint',
    icon: '<path d="M4 8h13M14 5l3 3-3 3M20 16H7M10 13l-3 3 3 3" />',
  },
];
