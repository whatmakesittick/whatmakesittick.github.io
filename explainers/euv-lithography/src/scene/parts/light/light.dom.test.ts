import { describe, expect, it } from 'vitest';
import { PointLight, Sprite, Vector3 } from 'three';
import type { Object3D } from 'three';
import { isShown } from '@core/scene/parts';
import { buildLight } from '../light';
import { CLOSE_UP } from '../closeUp';
import { FRAME, buildSection, drawCalls, stateAt, triangles } from './fixtures';

const TRIANGLE_BUDGET = 40_000;
const DRAW_BUDGET = 50;
const BOUNCE_COUNT = 11;
const MIN_GLOW = 0.2;

function find(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`missing ${name}`);
  return found;
}

function lightOf(root: Object3D): PointLight {
  let found: PointLight | undefined;
  root.traverse((object) => {
    if (object instanceof PointLight) found = object;
  });
  if (!found) throw new Error('missing point light');
  return found;
}

describe('light section', () => {
  it('registers labels and scene anchors', () => {
    const { context } = buildSection(buildLight, stateAt(0));
    (['flash', 'droplets', 'plasma'] as const).forEach((id) =>
      expect(context.labels.has(id)).toBe(true),
    );
    expect(context.anchors.flash).toBeDefined();
    expect(context.anchors.plasma).toBeDefined();
  });

  it('keeps the flash anchor on the marker', () => {
    const { section, context } = buildSection(buildLight, stateAt(0));
    section.setState(stateAt(800));
    section.root.updateMatrixWorld(true);
    const world = context.anchors.flash!.getWorldPosition(new Vector3());
    expect(world.y).toBeCloseTo(0.3, 6);
  });

  it('hides the beam with the view flag and keeps the marker', () => {
    const { section, context } = buildSection(buildLight, stateAt(600, { view: { beam: false } }));
    expect(isShown(find(section.root, 'beam'))).toBe(false);
    expect(isShown(context.labels.get('flash')!)).toBe(true);
    section.setState(stateAt(600));
    expect(isShown(find(section.root, 'beam'))).toBe(true);
  });

  it('lights the plasma on the scrubber only', () => {
    const { section } = buildSection(buildLight, stateAt(0));
    const light = lightOf(section.root);
    expect(light.intensity).toBe(0);
    section.setState(stateAt(300));
    expect(light.intensity).toBeGreaterThan(0);
    section.setState(stateAt(600));
    expect(light.intensity).toBe(0);
  });

  it('glows at every bounce while the beam reaches it', () => {
    const { section } = buildSection(buildLight, stateAt(0));
    const glows: Sprite[] = [];
    find(section.root, 'beam').traverse((object) => {
      if (object instanceof Sprite) glows.push(object);
    });
    section.setState(stateAt(900));
    const shown = glows.filter((glow) => glow.visible);
    expect(shown).toHaveLength(BOUNCE_COUNT);
    shown.forEach((glow) => expect(glow.material.opacity).toBeGreaterThan(MIN_GLOW));
    section.setState(stateAt(300));
    expect(glows.some((glow) => glow.visible)).toBe(false);
  });

  it('stands still when paused and moves while playing', () => {
    const paused = buildSection(buildLight, stateAt(300));
    expect(paused.section.animate!(FRAME, stateAt(300))).toBe(false);
    const playing = stateAt(300, { playing: true });
    expect(paused.section.animate!(FRAME, playing)).toBe(true);
  });

  it('thins the light in close views and settles once fitted', () => {
    const { section } = buildSection(buildLight, stateAt(700));
    const close = { ...FRAME, cameraDistance: CLOSE_UP.nearM };
    expect(section.animate!(close, stateAt(700))).toBe(true);
    expect(find(section.root, 'marker').scale.x).toBe(CLOSE_UP.floor);
    expect(section.animate!(close, stateAt(700))).toBe(false);
  });

  it('stays inside the budget', () => {
    const { section } = buildSection(buildLight, stateAt(0));
    expect(triangles(section.root)).toBeLessThan(TRIANGLE_BUDGET);
    expect(drawCalls(section.root)).toBeLessThan(DRAW_BUDGET);
    console.info(`light: ${triangles(section.root)} triangles, ${drawCalls(section.root)} draws`);
  });
});
