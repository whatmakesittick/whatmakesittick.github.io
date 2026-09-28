import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n, setLanguage } from '@core/i18n';
import en from '../../locales/en.json';
import ja from '../../locales/ja.json';
import zh from '../../locales/zh.json';
import { formatRigs } from './format';

const DEEP_WATER_RIGS = ['spar', 'semi', 'drillship'] as const;
const EAST_ASIAN_LIST_SEPARATOR = '、';

describe('rig list', () => {
  beforeAll(async () => {
    await initI18n({
      en: () => Promise.resolve(en),
      zh: () => Promise.resolve(zh),
      ja: () => Promise.resolve(ja),
    });
  });

  it.each([
    ['zh', zh],
    ['ja', ja],
  ] as const)('separates the rig names in %s', async (language, dictionary) => {
    await setLanguage(language);
    const names = DEEP_WATER_RIGS.map((rig) => dictionary.rigs[rig]);
    const text = formatRigs(DEEP_WATER_RIGS);
    expect(text).toContain(EAST_ASIAN_LIST_SEPARATOR);
    expect(text).not.toBe(names.join(''));
    expect(text).not.toBe(names.join(' '));
    names.forEach((name) => expect(text).toContain(name));
  });
});
