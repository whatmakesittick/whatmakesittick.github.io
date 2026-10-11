import { describe, expect, it } from 'vitest';
import { chapterOutline } from './chapterOutline.ts';

const CHAPTERS = `
<section class="chapter" data-preset="overview">
  <h2 data-i18n="sections.overview.title"></h2>
  <p data-i18n-html="sections.overview.p1"></p>
  <div class="range-widget"><p data-i18n="sections.overview.hint"></p></div>
  <p data-i18n="sections.overview.p2"></p>
  <p data-i18n="controls.note"></p>
</section>
<section class="aside"></section>
<section class="chapter" data-preset="magnet">
  <p data-i18n-html="sections.magnet.p1"></p>
</section>`;

describe('chapterOutline', () => {
  it('lists the chapters in order with their own paragraph keys', () => {
    expect(chapterOutline(CHAPTERS)).toEqual([
      { id: 'overview', paragraphs: ['sections.overview.p1', 'sections.overview.p2'] },
      { id: 'magnet', paragraphs: ['sections.magnet.p1'] },
    ]);
  });
});
