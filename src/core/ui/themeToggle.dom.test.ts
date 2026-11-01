import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { initI18n } from '../i18n';
import { SCHEME_STORAGE_KEY } from '../scheme';
import { mountThemeToggle } from './themeToggle';

const TOGGLE = '<button type="button" data-theme-toggle></button>';

function mount(theme: 'dark' | 'light', storage: Storage = localStorage) {
  document.documentElement.dataset.theme = theme;
  document.body.innerHTML = TOGGLE;
  const reload = vi.fn();
  mountThemeToggle(document, { storage: () => storage, reload });
  const button = document.querySelector<HTMLButtonElement>('[data-theme-toggle]');
  if (!button) throw new Error('no toggle');
  return { button, reload };
}

describe('theme toggle', () => {
  beforeAll(async () => {
    await initI18n();
  });

  afterEach(() => {
    localStorage.clear();
    delete document.documentElement.dataset.theme;
  });

  it('offers the light theme on a dark page and stores it before reloading', () => {
    const { button, reload } = mount('dark');
    expect(button.getAttribute('aria-label')).toBe('Switch to the light theme');
    expect(button.title).toBe('Switch to the light theme');
    button.click();
    expect(localStorage.getItem(SCHEME_STORAGE_KEY)).toBe('light');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('offers the dark theme on a light page and keeps the label translatable', () => {
    const { button, reload } = mount('light');
    expect(button.getAttribute('aria-label')).toBe('Switch to the dark theme');
    expect(button.dataset.i18nAttr).toBe('aria-label:header.themeDark;title:header.themeDark');
    button.click();
    expect(localStorage.getItem(SCHEME_STORAGE_KEY)).toBe('dark');
    expect(reload).toHaveBeenCalledOnce();
  });

  it('does not reload when the choice cannot be stored', () => {
    const blocked = {
      setItem: () => {
        throw new Error('blocked');
      },
    } as unknown as Storage;
    const { button, reload } = mount('dark', blocked);
    button.click();
    expect(reload).not.toHaveBeenCalled();
  });
});
