import { describe, expect, it } from 'vitest';
import { bindViewToggles, createViewToggles } from '@core/ui/viewToggles';
import { VIEW_IDS } from '../ids';
import { createRunStore } from '../state';
import { PACE_CHOICES, VIEW_TOGGLES } from './dock';

describe('dock', () => {
  it('has one toggle per view with its own shortcut', () => {
    expect(VIEW_TOGGLES.map((toggle) => toggle.view)).toEqual([...VIEW_IDS]);
    const shortcuts = VIEW_TOGGLES.map((toggle) => toggle.shortcut);
    expect(new Set(shortcuts).size).toBe(shortcuts.length);
    VIEW_TOGGLES.forEach((toggle) => expect(toggle.icon).toContain('<'));
  });

  it('shows labels and follow pressed in the opening chapter', () => {
    const store = createRunStore();
    const group = createViewToggles(VIEW_TOGGLES);
    bindViewToggles(group, store, VIEW_TOGGLES);
    const pressed = (view: string) =>
      group.querySelector(`[data-view="${view}"]`)?.getAttribute('aria-pressed');
    expect(pressed('labels')).toBe('true');
    expect(pressed('follow')).toBe('true');
    expect(pressed('forces')).toBe('false');
  });

  it('chooses the pace from the store', () => {
    const [choice] = PACE_CHOICES;
    const store = createRunStore();
    expect(choice?.select(store.getState())).toBe('steady');
    choice?.apply(store.getState(), 'easy');
    expect(choice?.select(store.getState())).toBe('easy');
    expect(choice?.options.map((option) => option.labelKey)).toEqual([
      'controls.paceOptions.easy',
      'controls.paceOptions.steady',
      'controls.paceOptions.fast',
    ]);
  });
});
