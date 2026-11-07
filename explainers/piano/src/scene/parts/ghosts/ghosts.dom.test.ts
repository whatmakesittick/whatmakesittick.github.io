import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import type { Object3D } from 'three';
import type { PartId } from '../../../ids';
import { mm, uprightPoseAt } from '../../../model';
import { uprightHammerAngle } from '../../pose';
import type { PartContext, Section } from '../context';
import { stateAt, testContext } from '../keyboard/testState';
import type { Choices } from '../keyboard/testState';
import { createGhosts } from './ghosts';

const DIGITS = 6;
const STRIKE_UNIT = 400;
const GHOST = { view: { ghost: true } } as const;

function build(units = 0, choices: Choices = GHOST) {
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

describe('createGhosts', () => {
  it('shows the upright with the ghost or line-up view', () => {
    expect(named(build(0, {}).section.root, 'uprightGhost').visible).toBe(false);
    expect(named(build().section.root, 'uprightGhost').visible).toBe(true);
    expect(named(build(0, { view: { lineUp: true } }).section.root, 'uprightGhost').visible).toBe(
      true,
    );
  });

  it('swings the upright hammer toward its strings', () => {
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
    expect(swing).toBeLessThan(-mm(travel) * 0.9);
  });
});
