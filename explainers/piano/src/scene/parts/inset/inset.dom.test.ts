import { describe, expect, it } from 'vitest';
import { Mesh, Vector3 } from 'three';
import type { Material, Object3D } from 'three';
import type { RegisterId } from '../../../ids';
import { INSET, PLAYED_KEY } from '../../../model';
import { createAction } from '../action/action';
import type { PartContext, Section } from '../context';
import { stateAt, testContext } from '../keyboard/testState';
import type { Choices } from '../keyboard/testState';
import { createInset } from './inset';
import { panelCentre } from './window';

const DIGITS = 9;
const TRIANGLE_BUDGET = 12_000;
const DRAW_CALL_BUDGET = 14;
const POSED_UNITS = [0, 250, 380, 420, 600, 850];
const PIVOTS = ['wippen', 'jack', 'repetition', 'hammer'];
const SHOWN = { view: { inset: true } } as const;

function build(units = 0, choices: Choices = SHOWN) {
  const context = testContext();
  const section = createInset(context);
  section.setState(stateAt(units, choices));
  return { context, section };
}

function named(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  if (!found) throw new Error(`missing ${name}`);
  return found;
}

function shownMeshes(root: Object3D): Mesh[] {
  const meshes: Mesh[] = [];
  root.traverseVisible((node) => {
    if (node instanceof Mesh) meshes.push(node);
  });
  return meshes;
}

function anchorAt(context: PartContext, section: Section): Vector3 {
  section.root.updateMatrixWorld(true);
  const anchor = context.anchors.inset;
  if (!anchor) throw new Error('missing inset anchor');
  return anchor.getWorldPosition(new Vector3());
}

describe('createInset', () => {
  it('shows the panel only with the inset view and labels it', () => {
    const hidden = build(0, {});
    expect(named(hidden.section.root, 'insetContent').visible).toBe(false);
    const { context, section } = build();
    expect(named(section.root, 'insetContent').visible).toBe(true);
    expect([...context.labels.keys()]).toEqual(['inset']);
  });

  it('sits at the panel centre of the played key for every register', () => {
    const { context, section } = build();
    (Object.keys(PLAYED_KEY) as RegisterId[]).forEach((register) => {
      section.setState(stateAt(0, { ...SHOWN, register }));
      expect(anchorAt(context, section).toArray()).toEqual(
        panelCentre(PLAYED_KEY[register]).map((value) => expect.closeTo(value, DIGITS)),
      );
    });
  });

  it('poses the magnified escapement exactly like the full-size action', () => {
    const { section } = build();
    const action = createAction(testContext());
    POSED_UNITS.forEach((units) => {
      const state = stateAt(units, SHOWN);
      section.setState(state);
      action.setState(state);
      PIVOTS.forEach((pivot) => {
        expect(named(section.root, pivot).rotation.x).toBeCloseTo(
          named(action.root, pivot).rotation.x,
          DIGITS,
        );
      });
    });
  });

  it('draws in its own uncut inset materials at the inset scale', () => {
    const { context, section } = build();
    const meshes = shownMeshes(section.root);
    meshes.forEach((mesh) => {
      expect(context.materials.groupOf(mesh.material as Material)).toBe('inset');
    });
    expect(named(section.root, 'insetAction').scale.y).toBe(INSET.scale);
    expect(meshes.length).toBeLessThanOrEqual(DRAW_CALL_BUDGET);
    const triangles = meshes.reduce(
      (sum, mesh) =>
        sum + (mesh.geometry.index?.count ?? mesh.geometry.attributes.position.count) / 3,
      0,
    );
    expect(triangles).toBeLessThan(TRIANGLE_BUDGET);
  });

  it('compiles the hidden panel on warm up', () => {
    const { section } = build(0, {});
    const compiled: Object3D[] = [];
    section.warmUp?.((object) => compiled.push(object));
    expect(compiled).toEqual([named(section.root, 'insetContent')]);
  });
});
