import { describe, expect, it } from 'vitest';
import { bindViewToggles, createViewToggles } from '@core/ui/viewToggles';
import { createSwimStore } from '../state';
import { VIEW_TOGGLES } from './dock';

describe('dock toggles', () => {
  it('shows the underwater toggle pressed in the opening stroke chapter', () => {
    const store = createSwimStore();
    const group = createViewToggles(VIEW_TOGGLES);
    bindViewToggles(group, store, VIEW_TOGGLES);
    const toggle = group.querySelector('[data-view="underwater"]');
    expect(store.getState().preset).toBe('stroke');
    expect(toggle?.getAttribute('aria-pressed')).toBe('true');
  });
});
