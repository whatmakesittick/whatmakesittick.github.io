import { afterEach, describe, expect, it, vi } from 'vitest';
import { followSystemTextSize } from './textSize';

function stubDevice(touchPoints: number, supported: boolean, bodySize: string) {
  vi.spyOn(navigator, 'maxTouchPoints', 'get').mockReturnValue(touchPoints);
  vi.stubGlobal('CSS', { supports: () => supported });
  vi.spyOn(window, 'getComputedStyle').mockReturnValue({
    fontSize: bodySize,
  } as CSSStyleDeclaration);
}

describe('followSystemTextSize', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    document.documentElement.style.fontSize = '';
  });

  it('scales the root font by the system text size on touch devices', () => {
    stubDevice(5, true, '23px');
    followSystemTextSize();
    expect(document.documentElement.style.fontSize).toMatch(/^135\.29\d*%$/);
  });

  it('keeps the default size when the system text size is the default', () => {
    stubDevice(5, true, '17px');
    followSystemTextSize();
    expect(document.documentElement.style.fontSize).toBe('100%');
  });

  it('ignores desktops, where the system body font is fixed', () => {
    stubDevice(0, true, '13px');
    followSystemTextSize();
    expect(document.documentElement.style.fontSize).toBe('');
  });

  it('ignores browsers without the system body font', () => {
    stubDevice(5, false, '16px');
    followSystemTextSize();
    expect(document.documentElement.style.fontSize).toBe('');
  });

  it('removes its probe element', () => {
    stubDevice(5, true, '19px');
    followSystemTextSize();
    expect(document.documentElement.querySelector('i')).toBeNull();
  });
});
