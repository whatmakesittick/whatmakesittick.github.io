import { afterEach, describe, expect, it } from 'vitest';
import { applyDockAb } from '../../widget/src/dockAb.ts';

afterEach(() => {
  document.body.innerHTML = '';
});

function dock(): void {
  document.body.innerHTML =
    '<div class="dock">' +
    '<button data-control="play" data-playing="false" aria-label="Play">' +
    '<svg class="icon icon-play"><path d="M8 5z"></path></svg>' +
    '<svg class="icon icon-pause"><rect></rect></svg></button>' +
    '<button class="toggle"><svg class="icon"><path></path></svg></button>' +
    '<button data-control="reset-camera" aria-label="Reset camera">' +
    '<svg class="icon" viewBox="0 0 24 24"><path d="M4 4h4"></path></svg></button>' +
    '</div>';
}

describe('dock A/B', () => {
  it('tags three buttons once and swaps the icons', async () => {
    dock();
    expect(applyDockAb(document)).toEqual(['text', 'bg', 'control toggle']);
    expect(applyDockAb(document)).toEqual([]);
    const play = document.querySelector<HTMLElement>('[data-control="play"]')!;
    expect(play.dataset.debug).toBe('text');
    expect(play.querySelector('svg')).toBeNull();
    expect(play.textContent).toBe('▶︎');
    expect(play.getAttribute('aria-label')).toBe('Play');
    play.dataset.playing = 'true';
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(play.textContent).toBe('❚❚');
    const reset = document.querySelector<HTMLElement>('[data-control="reset-camera"]')!;
    expect(reset.dataset.debug).toBe('bg');
    expect(reset.style.backgroundImage).toContain('data:image/svg+xml');
    expect(reset.querySelector('svg')!.style.display).toBe('none');
    expect(document.querySelector<HTMLElement>('.toggle')!.dataset.debug).toBe('control');
  });
});
