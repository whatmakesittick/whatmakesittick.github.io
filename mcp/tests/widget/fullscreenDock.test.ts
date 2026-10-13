import { describe, expect, it } from 'vitest';
import { fullscreenDockCss, SITE_COMPACT_MAX_WIDTH } from '../../widget/src/fullscreenDock.ts';

describe('fullscreenDockCss', () => {
  it('keys the site phone dock rules to the viewport, inside the fullscreen dock slot only', () => {
    expect(fullscreenDockCss('.dock{gap:8px}')).toBe(
      `@media (max-width: ${SITE_COMPACT_MAX_WIDTH}px){.wmit.is-fs .dock-slot[data-embed-ui]{.dock{gap:8px}}}`,
    );
  });
});
