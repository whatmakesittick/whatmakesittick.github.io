import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { initI18n, setLanguage } from '../i18n';
import { translateDom } from '../i18n/dom';
import { mountStageExpansion, stageShortcuts } from './stageExpansion';
import type { StageExpansion } from './stageExpansion';

const PAGE = `
  <div class="page">
    <section class="stage" data-stage>
      <div id="scene"></div>
      <button type="button" data-control="expand" aria-pressed="false"></button>
    </section>
    <main class="prose"></main>
  </div>
`;
const VIEWPORT_WIDTH = 1024;
const SCROLLBAR_WIDTH = 15;
const READING_POSITION = 640;
const EXPAND_LABEL = 'Show the model full screen';
const COLLAPSE_LABEL = 'Back to the article';
const EXPANDED_ATTRIBUTE = 'data-stage-expanded';

let stage: StageExpansion;
let fullscreenElement: Element | null = null;

function button(): HTMLButtonElement {
  const element = document.querySelector<HTMLButtonElement>('[data-control="expand"]');
  if (!element) throw new Error('No expand button');
  return element;
}

function stageElement(): HTMLElement {
  const element = document.querySelector<HTMLElement>('[data-stage]');
  if (!element) throw new Error('No stage');
  return element;
}

function setFullscreenElement(element: Element | null): void {
  fullscreenElement = element;
  document.dispatchEvent(new Event('fullscreenchange'));
}

function stubFullscreenApi(request: () => Promise<void>): void {
  Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: true });
  stageElement().requestFullscreen = vi.fn(request);
  document.exitFullscreen = vi.fn(() => {
    setFullscreenElement(null);
    return Promise.resolve();
  });
}

function grantFullscreen(): Promise<void> {
  setFullscreenElement(stageElement());
  return Promise.resolve();
}

function scrollAway(): void {
  window.scrollTo({ top: 0, behavior: 'instant' });
}

function bodyStyle(property: string): string {
  return document.body.style.getPropertyValue(property);
}

describe('stage expansion', () => {
  beforeAll(async () => {
    Object.defineProperty(document, 'fullscreenElement', {
      configurable: true,
      get: () => fullscreenElement,
    });
    Object.defineProperty(document.documentElement, 'clientWidth', {
      configurable: true,
      get: () => VIEWPORT_WIDTH - SCROLLBAR_WIDTH,
    });
    await initI18n({ en: () => Promise.resolve({}), uk: () => Promise.resolve({}) });
  });

  beforeEach(async () => {
    await setLanguage('en');
    Object.defineProperty(document, 'fullscreenEnabled', { configurable: true, value: undefined });
    Object.defineProperty(window, 'innerWidth', { configurable: true, value: VIEWPORT_WIDTH });
    fullscreenElement = null;
    document.body.innerHTML = PAGE;
    window.scrollTo({ top: READING_POSITION, behavior: 'instant' });
    stage = mountStageExpansion(document);
  });

  afterEach(() => stage.dispose());

  it('starts collapsed with the expand label', () => {
    expect(stage.expanded).toBe(false);
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(button().getAttribute('aria-label')).toBe(EXPAND_LABEL);
    expect(button().title).toBe(EXPAND_LABEL);
    expect(document.documentElement.hasAttribute(EXPANDED_ATTRIBUTE)).toBe(false);
  });

  it('pins the stage and locks the page where the Fullscreen API is missing', () => {
    const listener = vi.fn();
    stage.onChange(listener);
    button().click();

    expect(stage.expanded).toBe(true);
    expect(listener).toHaveBeenCalledWith(true);
    expect(button().getAttribute('aria-pressed')).toBe('true');
    expect(button().getAttribute('aria-label')).toBe(COLLAPSE_LABEL);
    expect(document.documentElement.hasAttribute(EXPANDED_ATTRIBUTE)).toBe(true);
    expect(bodyStyle('position')).toBe('fixed');
    expect(bodyStyle('top')).toBe(`-${READING_POSITION}px`);
    expect(bodyStyle('padding-right')).toBe(`${SCROLLBAR_WIDTH}px`);
  });

  it('restores the reading position and focus on collapse', () => {
    const listener = vi.fn();
    stage.onChange(listener);
    button().click();
    scrollAway();
    button().click();

    expect(stage.expanded).toBe(false);
    expect(listener).toHaveBeenLastCalledWith(false);
    expect(window.scrollY).toBe(READING_POSITION);
    expect(bodyStyle('position')).toBe('');
    expect(bodyStyle('top')).toBe('');
    expect(document.activeElement).toBe(button());
    expect(button().getAttribute('aria-pressed')).toBe('false');
    expect(document.documentElement.hasAttribute(EXPANDED_ATTRIBUTE)).toBe(false);
  });

  it('keeps the label translated after a language change', async () => {
    button().click();
    await setLanguage('uk');
    translateDom(document);
    expect(button().getAttribute('aria-label')).toBe('Повернутися до статті');
  });

  it('closes on Escape and toggles on X', () => {
    const keys = stageShortcuts(stage);
    expect(keys.escape()).toBe(false);
    expect(keys.x()).toBe(true);
    expect(stage.expanded).toBe(true);
    expect(keys.escape()).toBe(true);
    expect(stage.expanded).toBe(false);
  });

  it('asks for full screen and collapses once the browser has left it', async () => {
    stubFullscreenApi(grantFullscreen);
    button().click();
    expect(stageElement().requestFullscreen).toHaveBeenCalledWith({ navigationUI: 'hide' });
    expect(stage.expanded).toBe(true);

    scrollAway();
    button().click();
    await vi.waitFor(() => expect(stage.expanded).toBe(false));
    expect(document.exitFullscreen).toHaveBeenCalledOnce();
    expect(window.scrollY).toBe(READING_POSITION);
    expect(document.activeElement).toBe(button());
  });

  it('follows the browser when it leaves full screen on its own', () => {
    stubFullscreenApi(grantFullscreen);
    button().click();
    scrollAway();
    setFullscreenElement(null);

    expect(stage.expanded).toBe(false);
    expect(window.scrollY).toBe(READING_POSITION);
    expect(document.exitFullscreen).not.toHaveBeenCalled();
  });

  it('stays pinned when the browser refuses full screen', async () => {
    stubFullscreenApi(() => Promise.reject(new TypeError('Permissions check failed')));
    button().click();
    await Promise.resolve();
    expect(stage.expanded).toBe(true);
    expect(bodyStyle('position')).toBe('fixed');

    button().click();
    expect(stage.expanded).toBe(false);
    expect(document.exitFullscreen).not.toHaveBeenCalled();
  });

  it('leaves full screen that arrives after the reader collapsed', async () => {
    let grant: () => void = () => {};
    stubFullscreenApi(() => new Promise((resolve) => (grant = resolve)));
    button().click();
    button().click();
    setFullscreenElement(stageElement());
    grant();

    await vi.waitFor(() => expect(document.exitFullscreen).toHaveBeenCalledOnce());
    expect(stage.expanded).toBe(false);
  });

  it('lets go of the page and the button on dispose', () => {
    button().click();
    stage.dispose();
    expect(document.documentElement.hasAttribute(EXPANDED_ATTRIBUTE)).toBe(false);
    expect(bodyStyle('position')).toBe('');

    button().click();
    expect(stage.expanded).toBe(false);
  });
});
