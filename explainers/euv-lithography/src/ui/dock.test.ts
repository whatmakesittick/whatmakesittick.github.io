import { describe, expect, it } from 'vitest';
import en from '../../locales/en.json';
import { DOCK_VIEW_IDS, MACHINE_IDS } from '../ids';
import { createEuvStore } from '../state';
import { EUV_CHOICES, VIEW_TOGGLES } from './dock';

const SHORTCUTS = ['B', 'L', 'C', 'I', 'F'];

describe('euv dock', () => {
  it('offers one machine choice with three options', () => {
    expect(EUV_CHOICES.map((choice) => choice.id)).toEqual(['machine']);
    const [machine] = EUV_CHOICES;
    expect(machine.options.map((option) => option.value)).toEqual([...MACHINE_IDS]);
    expect(machine.options).toHaveLength(3);
  });

  it('selects and applies the machine', () => {
    const store = createEuvStore();
    const [machine] = EUV_CHOICES;
    machine.apply(store.getState(), 'exe5000');
    expect(machine.select(store.getState())).toBe('exe5000');
  });

  it('toggles beam, labels, cutaway, insets and follow with their keys', () => {
    expect(VIEW_TOGGLES.map((toggle) => toggle.view)).toEqual([...DOCK_VIEW_IDS]);
    expect(VIEW_TOGGLES.map((toggle) => toggle.shortcut)).toEqual(SHORTCUTS);
  });

  it('has an English name, short label and hint for every toggle', () => {
    VIEW_TOGGLES.forEach(({ view, nameKey, shortKey, hintKey }) => {
      const texts = en.controls.views[view as keyof typeof en.controls.views];
      expect(nameKey).toBe(`controls.views.${view}.name`);
      expect(shortKey).toBe(`controls.views.${view}.short`);
      expect(hintKey).toBe(`controls.views.${view}.hint`);
      expect(texts.name).toBeTruthy();
      expect(texts.short).toBeTruthy();
      expect(texts.hint).toBeTruthy();
    });
  });
});
