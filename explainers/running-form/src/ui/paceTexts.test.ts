import { describe, expect, it } from 'vitest';
import { PACE_IDS } from '../ids';
import { PACES, formatPaceKm } from '../model';
import en from '../../locales/en.json';

const LOCALES = import.meta.glob<{ controls: { paceOptions: Record<string, string> } }>(
  '../../locales/*.json',
  { eager: true, import: 'default' },
);

describe('pace option texts', () => {
  it.each(Object.entries(LOCALES))('write the model pace of each option in %s', (_, locale) => {
    PACE_IDS.forEach((id) => {
      expect(locale.controls.paceOptions[id]).toContain(formatPaceKm(PACES[id].speedMs));
    });
  });

  it('keep the paces quoted in the stride chapter', () => {
    const copy = en.sections.stride.p5;
    expect(copy).toContain(formatPaceKm(PACES.easy.speedMs));
    expect(copy).toContain(formatPaceKm(PACES.fast.speedMs));
  });
});
