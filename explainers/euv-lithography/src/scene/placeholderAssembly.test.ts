import { describe, expect, it } from 'vitest';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, MachineId } from '../ids';
import { opticsOf } from '../model/optics';
import { flashAt, insetAt, lightLeftAt, bounceCountAt, scanAt } from '../model/run';
import { createAssembly } from './assembly';
import type { AssemblyResources } from './assembly';

const RESOURCES = {} as AssemblyResources;

function stateAt(units: number, machine: MachineId = 'nxe3600d'): AssemblyState {
  return {
    phase: units,
    playing: false,
    machine,
    optics: opticsOf(machine),
    flash: flashAt(units, machine),
    light: { left: lightLeftAt(units), bounces: bounceCountAt(units) },
    inset: insetAt(units),
    scan: scanAt(units, machine),
    view: { beam: true, labels: true, cutaway: false, inset: true, follow: false },
  };
}

describe('placeholder assembly', () => {
  it('has every anchor, label anchor and region', () => {
    const assembly = createAssembly(RESOURCES, stateAt(0));
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    expect([...assembly.labelAnchors().keys()]).toEqual([...PART_IDS]);
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    assembly.dispose();
  });

  it('moves the flash anchor and chase target with the state', () => {
    const assembly = createAssembly(RESOURCES, stateAt(0));
    assembly.setState(stateAt(800));
    expect(assembly.anchor('flash').position.y).toBeCloseTo(0.3, 9);
    expect(assembly.chaseTarget().span).toBe(2);
    expect(assembly.update(0.016, 10)).toBe(false);
    assembly.dispose();
  });

  it('shows the inset that matches the state, only while the inset view is on', () => {
    const assembly = createAssembly(RESOURCES, stateAt(0));
    const visible = (): number => assembly.root.children.filter((c) => c.visible).length;
    const withDroplet = visible();
    assembly.setState(stateAt(600));
    expect(visible()).toBe(withDroplet - 1);
    assembly.setState({ ...stateAt(0), view: { ...stateAt(0).view, inset: false } });
    expect(visible()).toBe(withDroplet - 1);
    assembly.dispose();
  });
});
