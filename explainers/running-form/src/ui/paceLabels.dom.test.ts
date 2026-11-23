import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { translateDom } from '@core/i18n/dom';
import { mountPaceLabels } from './paceLabels';
import { PACE_CHOICES } from './dock';
import { createChoice } from '@core/ui/choices';
import { initTestLocale } from './testing';

describe('pace labels in the dock', () => {
  let dispose: () => void;
  let group: HTMLElement;

  beforeAll(() => initTestLocale());

  beforeEach(() => {
    document.body.innerHTML = '<div class="dock"></div><div class="gauge"></div>';
    group = createChoice(PACE_CHOICES[0]!);
    document.querySelector('.dock')?.append(group);
    translateDom(document);
    dispose = mountPaceLabels(document.querySelector<HTMLElement>('.gauge') as HTMLElement);
  });

  afterEach(() => dispose());

  const labels = () => [...group.querySelectorAll('button')].map((button) => button.textContent);

  it('fills each option with its pace per kilometre', () => {
    expect(labels()).toEqual(['Easy, 6:40 per km', 'Steady, 4:46 per km', 'Fast, 3:42 per km']);
  });

  it('fills them again after the page is translated again', async () => {
    translateDom(document);
    await Promise.resolve();
    expect(labels()).toEqual(['Easy, 6:40 per km', 'Steady, 4:46 per km', 'Fast, 3:42 per km']);
  });

  it('does nothing without a dock', () => {
    dispose();
    document.body.innerHTML = '<div class="gauge"></div>';
    expect(() => mountPaceLabels(document.querySelector('.gauge') as HTMLElement)()).not.toThrow();
  });
});
