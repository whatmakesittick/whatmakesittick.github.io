import { describe, expect, it } from 'vitest';
import { InstancedMesh, LineSegments, Mesh, Vector3 } from 'three';
import type { Object3D } from 'three';
import type { PartId, RegisterId } from '../../../ids';
import { PLAYED_KEY, mm, restAnchorPoint, uprightPoseAt } from '../../../model';
import { uprightHammerAngle } from '../../pose';
import type { Frame, PartContext, Section } from '../context';
import { stateAt, testContext } from '../keyboard/testState';
import type { Choices } from '../keyboard/testState';
import { createGhosts } from './ghosts';

const DIGITS = 6;
const STRIKE_UNIT = 400;
const QUIET_UNIT = 100;
const TRIANGLE_BUDGET = 8_000;
const LABEL_SWING_SHARE = 0.6;
const MESH_BUDGET = 22;
const LINE_UP = { view: { lineUp: true } } as const;
const GHOST = { view: { ghost: true } } as const;
const FRAME: Frame = { delta: 1 / 60, elapsed: 0.1, cameraDistance: 1 };
const LATER: Frame = { ...FRAME, elapsed: 0.2 };

function build(units = 0, choices: Choices = LINE_UP) {
  const context = testContext();
  const section = createGhosts(context);
  section.setState(stateAt(units, choices));
  return { context, section };
}

function named(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`missing ${name}`);
  return found;
}

function labelAt(context: PartContext, section: Section, part: PartId): Vector3 {
  section.root.updateMatrixWorld(true);
  const anchor = context.labels.get(part);
  if (!anchor) throw new Error(`missing ${part}`);
  return anchor.getWorldPosition(new Vector3());
}

function meshes(root: Object3D): Mesh[] {
  const found: Mesh[] = [];
  root.traverse((node) => {
    if (node instanceof Mesh && !(node instanceof InstancedMesh)) found.push(node);
  });
  return found;
}

function stringHeights(section: Section): number[] {
  const string = named(section.root, 'harpsichordString');
  if (!(string instanceof LineSegments)) throw new Error('missing string');
  return Array.from(string.geometry.getAttribute('position').array);
}

describe('createGhosts', () => {
  it('shows the upright with the ghost view and everything with the line-up', () => {
    const shown = (section: Section, name: string) => named(section.root, name).visible;
    const plain = build(0, {});
    expect(
      ['uprightGhost', 'harpsichordGhost', 'lineUpLeaders'].map((name) =>
        shown(plain.section, name),
      ),
    ).toEqual([false, false, false]);
    const ghost = build(0, GHOST);
    expect(
      ['uprightGhost', 'harpsichordGhost', 'lineUpLeaders'].map((name) =>
        shown(ghost.section, name),
      ),
    ).toEqual([true, false, false]);
    const lineUp = build();
    expect(
      ['uprightGhost', 'harpsichordGhost', 'lineUpLeaders'].map((name) =>
        shown(lineUp.section, name),
      ),
    ).toEqual([true, true, true]);
  });

  it('labels both ghosts and anchors the line-up at the played key', () => {
    const { context, section } = build();
    expect([...context.labels.keys()].sort()).toEqual(['harpsichord', 'upright']);
    (Object.keys(PLAYED_KEY) as RegisterId[]).forEach((register) => {
      section.setState(stateAt(0, { ...LINE_UP, register }));
      section.root.updateMatrixWorld(true);
      const anchor = context.anchors.lineUp?.getWorldPosition(new Vector3());
      expect(anchor?.toArray()).toEqual(
        restAnchorPoint('lineUp', PLAYED_KEY[register]).map((value) =>
          expect.closeTo(value, DIGITS),
        ),
      );
    });
  });

  it('swings the upright hammer toward its strings and lifts the harpsichord jack', () => {
    const rest = build();
    const strike = build(STRIKE_UNIT);
    const travel = uprightPoseAt(STRIKE_UNIT, 'medium', 'none', 'middle').hammerTravelMm;
    expect(named(strike.section.root, 'uprightHammer').rotation.x).toBeCloseTo(
      uprightHammerAngle(travel),
      DIGITS,
    );
    const swing =
      labelAt(strike.context, strike.section, 'upright').z -
      labelAt(rest.context, rest.section, 'upright').z;
    expect(swing).toBeLessThan(-mm(travel) * LABEL_SWING_SHARE);
    const rise =
      labelAt(strike.context, strike.section, 'harpsichord').y -
      labelAt(rest.context, rest.section, 'harpsichord').y;
    expect(rise).toBeCloseTo(mm(stateAt(STRIKE_UNIT).harpsichord.jackRiseMm), DIGITS);
  });

  it('rings the harpsichord string only while the line-up shows a plucked note', () => {
    const quiet = build(QUIET_UNIT);
    expect(quiet.section.animate?.(FRAME, stateAt(QUIET_UNIT, LINE_UP))).toBe(false);
    const { section } = build(STRIKE_UNIT);
    const state = stateAt(STRIKE_UNIT, LINE_UP);
    expect(section.animate?.(FRAME, state)).toBe(true);
    const first = stringHeights(section);
    section.animate?.(LATER, state);
    expect(stringHeights(section)).not.toEqual(first);
    expect(section.animate?.(FRAME, stateAt(STRIKE_UNIT, GHOST))).toBe(false);
  });

  it('stays within its budget and compiles the hidden ghosts on warm up', () => {
    const { section } = build(0, {});
    const all = meshes(section.root);
    const triangles = all.reduce(
      (sum, mesh) =>
        sum + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3,
      0,
    );
    expect(all.length).toBeLessThanOrEqual(MESH_BUDGET);
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET);
    const compiled: Object3D[] = [];
    section.warmUp?.((object) => compiled.push(object));
    expect(compiled.map((object) => object.name)).toEqual([
      'uprightGhost',
      'harpsichordGhost',
      'lineUpLeaders',
    ]);
  });
});
