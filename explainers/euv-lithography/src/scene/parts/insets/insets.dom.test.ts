import { describe, expect, it } from 'vitest';
import type { Object3D } from 'three';
import { isShown } from '@core/scene/parts';
import { buildInsets } from '../insets';
import { FRAME, buildSection, drawCalls, stateAt, triangles } from '../light/fixtures';

const TRIANGLE_BUDGET = 40_000;
const DRAW_BUDGET = 50;
const SETTLE_FRAMES = 120;

function anchors(labels: ReadonlyMap<string, Object3D>): Record<string, boolean> {
  return Object.fromEntries([...labels].map(([id, anchor]) => [id, isShown(anchor)]));
}

describe('insets section', () => {
  it('registers the four labels and both scene anchors', () => {
    const { context } = buildSection(buildInsets, stateAt(0));
    (['dropletInset', 'patternInset', 'hair', 'virus'] as const).forEach((id) =>
      expect(context.labels.has(id)).toBe(true),
    );
    expect(context.anchors.dropletInset).toBeDefined();
    expect(context.anchors.patternInset).toBeDefined();
  });

  it('shows each inset in its phase and hides labels with it', () => {
    const { section, context } = buildSection(buildInsets, stateAt(0));
    expect(anchors(context.labels)).toMatchObject({
      dropletInset: true,
      hair: true,
      patternInset: false,
      virus: false,
    });
    section.setState(stateAt(900));
    expect(anchors(context.labels)).toMatchObject({
      dropletInset: false,
      hair: false,
      patternInset: true,
      virus: true,
    });
  });

  it('hides both insets with the inset view flag', () => {
    const { section, context } = buildSection(
      buildInsets,
      stateAt(900, { view: { inset: false } }),
    );
    expect(Object.values(anchors(context.labels)).some(Boolean)).toBe(false);
    section.setState(stateAt(0));
    expect(Object.values(anchors(context.labels)).some(Boolean)).toBe(true);
  });

  it('settles when paused and keeps moving while playing', () => {
    const state = stateAt(900);
    const { section } = buildSection(buildInsets, state);
    let moving = true;
    for (let frame = 0; frame < SETTLE_FRAMES && moving; frame += 1) {
      moving = section.animate!(FRAME, state);
    }
    expect(moving).toBe(false);
    expect(section.animate!(FRAME, stateAt(900, { playing: true }))).toBe(true);
  });

  it('eases the lines in when the scan advances', () => {
    const { section } = buildSection(buildInsets, stateAt(800));
    section.setState(stateAt(1000));
    expect(section.animate!(FRAME, stateAt(1000))).toBe(true);
  });

  it('stays inside the budget', () => {
    const { section } = buildSection(buildInsets, stateAt(0));
    expect(triangles(section.root)).toBeLessThan(TRIANGLE_BUDGET);
    expect(drawCalls(section.root)).toBeLessThan(DRAW_BUDGET);
    console.info(`insets: ${triangles(section.root)} triangles, ${drawCalls(section.root)} draws`);
  });
});
