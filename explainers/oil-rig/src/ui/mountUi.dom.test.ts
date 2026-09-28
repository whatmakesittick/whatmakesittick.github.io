import { beforeAll, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import chapters from '../../chapters.html?raw';
import en from '../../locales/en.json';
import { createOilRigStore } from '../state';
import { mountOilRigUi } from '.';

function readout(id: string): string | null | undefined {
  return document.querySelector(`[data-readout="${id}"]`)?.textContent;
}

describe('chapter widgets', () => {
  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  it('mounts on the chapters markup and stops updating once disposed', () => {
    document.body.innerHTML = chapters;
    const store = createOilRigStore({ phase: 2500 });
    const dispose = mountOilRigUi(document, store);
    const before = readout('string-length');
    store.getState().setPhase(3000);
    const moved = readout('string-length');
    expect(moved).not.toBe(before);
    dispose();
    store.getState().setPhase(3500);
    expect(readout('string-length')).toBe(moved);
  });
});
