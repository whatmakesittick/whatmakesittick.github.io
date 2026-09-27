import { Color } from 'three';
import { describe, expect, it } from 'vitest';
import { Highlighter } from './highlight';
import { MaterialLibrary, STRUCTURE_GROUP, UNDIMMED_GROUP } from './materials';

const SETTLED_SECONDS = 10;
const FINISH = { color: '#cc3333' };

function settle(highlighter: Highlighter): void {
  highlighter.update(SETTLED_SECONDS);
  highlighter.update(SETTLED_SECONDS);
}

describe('Highlighter', () => {
  it('dims every group except the highlighted parts', () => {
    const library = new MaterialLibrary();
    const highlighter = new Highlighter(library, ['wing', 'tail', STRUCTURE_GROUP]);
    highlighter.setHighlight(['wing']);
    settle(highlighter);
    expect(library.emphasisOf('wing')).toBe(1);
    expect(library.emphasisOf('tail')).toBe(0);
    expect(library.emphasisOf(STRUCTURE_GROUP)).toBe(0);
  });

  it('brings every group back when nothing is highlighted', () => {
    const library = new MaterialLibrary();
    const highlighter = new Highlighter(library, ['wing', 'tail']);
    highlighter.setHighlight(['wing']);
    settle(highlighter);
    highlighter.setHighlight([]);
    settle(highlighter);
    expect(library.emphasisOf('tail')).toBe(1);
  });

  it('reports whether a frame changed any emphasis', () => {
    const highlighter = new Highlighter(new MaterialLibrary(), ['wing', 'tail']);
    highlighter.setHighlight(['wing']);
    expect(highlighter.update(SETTLED_SECONDS)).toBe(true);
    settle(highlighter);
    expect(highlighter.update(SETTLED_SECONDS)).toBe(false);
  });

  it('never targets an undimmed group', () => {
    const library = new MaterialLibrary({ undimmed: ['sky'] });
    const backdrop = library.get(UNDIMMED_GROUP, FINISH);
    const sky = library.get('sky', FINISH);
    const highlighter = new Highlighter(library, ['wing', UNDIMMED_GROUP, 'sky']);
    highlighter.setHighlight(['wing']);
    settle(highlighter);
    expect(library.emphasisOf(UNDIMMED_GROUP)).toBe(1);
    expect(library.emphasisOf('sky')).toBe(1);
    expect(backdrop.color.equals(new Color(FINISH.color))).toBe(true);
    expect(sky.color.equals(new Color(FINISH.color))).toBe(true);
  });
});
