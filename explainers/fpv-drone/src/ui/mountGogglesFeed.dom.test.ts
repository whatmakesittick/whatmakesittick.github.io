import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { initI18n } from '@core/i18n';
import en from '../../locales/en.json';
import { createFpvStore } from '../state';
import type { FpvStore } from '../state';
import { mountGogglesFeed } from './mountGogglesFeed';

const STAGE = '<section data-stage><div id="scene"></div></section>';

function feed(): HTMLElement | null {
  return document.querySelector<HTMLElement>('#scene .goggles-feed');
}

describe('goggles feed', () => {
  let store: FpvStore;
  let dispose: () => void;

  beforeAll(() => initI18n({ en: () => Promise.resolve(en) }));

  beforeEach(() => {
    document.body.innerHTML = STAGE;
    store = createFpvStore({ playing: false, phase: 0 });
    dispose = mountGogglesFeed(document, store);
  });

  afterEach(() => dispose());

  it('stays hidden from readers and inactive outside the goggles chapter', () => {
    expect(feed()?.getAttribute('aria-hidden')).toBe('true');
    expect(feed()?.dataset.active).toBe('false');
  });

  it('marks the picture as the goggles view in the chapter flown from the camera', () => {
    store.getState().applyPreset('limits');
    expect(feed()?.dataset.active).toBe('true');
    expect(feed()?.textContent).toBe(`${en.goggles.caption}${en.controls.videoOptions.analogue}`);
    store.getState().applyPreset('power');
    expect(feed()?.dataset.active).toBe('false');
  });

  it('names the video system the pilot picked', () => {
    store.getState().setVideo('digital');
    expect(feed()?.dataset.video).toBe('digital');
    expect(feed()?.textContent).toContain(en.controls.videoOptions.digital);
  });

  it('leaves the stage as it found it and mounts nothing without a scene', () => {
    dispose();
    expect(feed()).toBeNull();
    document.body.innerHTML = '';
    dispose = mountGogglesFeed(document, store);
    expect(document.querySelector('.goggles-feed')).toBeNull();
  });
});
