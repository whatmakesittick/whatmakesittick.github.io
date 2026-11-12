import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { runNow } from '@core/scene/pacing';
import { isShown } from '@core/scene/parts';
import { createSceneTextures } from '@core/scene/textures';
import { ANCHOR_IDS, PART_IDS, REGION_IDS } from '../ids';
import type { AssemblyState, MachineId, ViewOptions } from '../ids';
import { opticsOf } from '../model/optics';
import { bounceCountAt, flashAt, insetAt, lightLeftAt, scanAt } from '../model/run';
import type { Assembly } from './assembly';
import { buildEuvLithographyAssembly, withChaseCutaway } from './euvLithographyAssembly';

const FRAME = 1 / 60;
const SETTLE_FRAMES = 120;
const VIEWS: ViewOptions = { beam: true, labels: true, cutaway: true, inset: true, follow: false };

function stateAt(units: number, machine: MachineId = 'nxe3600d', playing = false): AssemblyState {
  return {
    phase: units,
    playing,
    machine,
    optics: opticsOf(machine),
    flash: flashAt(units, machine),
    light: { left: lightLeftAt(units), bounces: bounceCountAt(units) },
    inset: insetAt(units),
    scan: scanAt(units, machine),
    view: VIEWS,
  };
}

function build(state: AssemblyState = stateAt(0)): Assembly {
  const resources = { materials: new MaterialLibrary(), textures: createSceneTextures() };
  return runNow(buildEuvLithographyAssembly(resources, state));
}

function settle(assembly: Assembly): boolean {
  let moving = true;
  for (let frame = 0; frame < SETTLE_FRAMES && moving; frame += 1) {
    moving = assembly.update(FRAME, 10);
  }
  return moving;
}

function worldOf(assembly: Assembly, id: (typeof ANCHOR_IDS)[number]): Vector3 {
  assembly.root.updateMatrixWorld(true);
  return assembly.anchor(id).getWorldPosition(new Vector3());
}

describe('euv lithography assembly', () => {
  it('has every anchor, label anchor and region', () => {
    const assembly = build();
    ANCHOR_IDS.forEach((id) => expect(assembly.anchor(id)).toBeDefined());
    expect([...assembly.labelAnchors().keys()].sort()).toEqual([...PART_IDS].sort());
    REGION_IDS.forEach((id) => expect(assembly.region(id).isEmpty()).toBe(false));
    assembly.dispose();
  });

  it('moves the flash anchor and the chase target with the scrubber', () => {
    const assembly = build();
    assembly.setState(stateAt(800));
    expect(worldOf(assembly, 'flash').y).toBeCloseTo(0.3, 6);
    expect(assembly.chaseTarget().span).toBe(2);
    assembly.dispose();
  });

  it('settles when paused and keeps moving while playing', () => {
    const assembly = build();
    assembly.setState(stateAt(300));
    expect(settle(assembly)).toBe(false);
    assembly.setState(stateAt(300, 'nxe3600d', true));
    expect(assembly.update(FRAME, 10)).toBe(true);
    assembly.dispose();
  });

  it('hides the insets with the inset view and outside their phases', () => {
    const assembly = build();
    const shown = (id: 'dropletInset' | 'patternInset'): boolean =>
      isShown(assembly.labelAnchors().get(id)!);
    expect(shown('dropletInset')).toBe(true);
    expect(shown('patternInset')).toBe(false);
    assembly.setState(stateAt(900));
    expect(shown('dropletInset')).toBe(false);
    expect(shown('patternInset')).toBe(true);
    assembly.setState({ ...stateAt(900), view: { ...VIEWS, inset: false } });
    expect(shown('patternInset')).toBe(false);
    assembly.dispose();
  });

  it('forces the cutaway open while following', () => {
    const following = { ...stateAt(0), view: { ...VIEWS, cutaway: false, follow: true } };
    expect(withChaseCutaway(following).view.cutaway).toBe(true);
  });
});
