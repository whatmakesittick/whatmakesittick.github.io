import { describe, expect, it } from 'vitest';
import type { Object3D } from 'three';
import { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import { createSceneTextures } from '@core/scene/textures';
import type { AssemblyState, CoolingId } from '../../../../ids';
import { ANCHOR_POINTS, MOMENTS, jouleAt } from '../../../../model';
import type { PartContext } from '../../context';
import { COLD_PLATE_NAME } from './coldPlate';
import { HEAT_SINK_NAME } from './heatSink';
import { buildChipInset } from './index';
import { CURRENT_MARKER_NAME, HEAT_MARKER_NAME } from './marker';

const MAX_DRAW_CALLS = 40;
const CURRENT_UNITS = MOMENTS.becomesHeat - 1;
const EARLY_HEAT = 530;
const LATE_HEAT = 590;

function stateAt(units: number, cooling: CoolingId = 'liquid', inset = true): AssemblyState {
  return {
    phase: units,
    playing: false,
    cooling,
    load: 'full',
    joule: jouleAt(units, cooling),
    rack: { rackKw: 120, hallMw: 23.04, fanShare: 0.6 },
    coolant: { medium: 'water', supplyC: 25, returnC: 45, flowShare: 1 },
    outage: { token: 0 },
    view: {
      power: true,
      heat: true,
      packets: false,
      labels: true,
      cutaway: true,
      follow: false,
      inset,
      lineUp: false,
    },
  };
}

function built() {
  const context: PartContext = {
    materials: new MaterialLibrary(),
    tracker: new ResourceTracker(),
    textures: createSceneTextures(),
    labels: new Map(),
    anchors: {},
  };
  const inset = buildChipInset(context);
  const find = (name: string): Object3D => {
    const object = inset.root.getObjectByName(name);
    if (!object) throw new Error(`Missing ${name}`);
    return object;
  };
  return { context, inset, find };
}

describe('chip inset', () => {
  it('registers its label and anchor and stays within the draw call budget', () => {
    const { context, inset } = built();
    expect(context.labels.has('chipInset')).toBe(true);
    expect(context.anchors.inset?.position.toArray()).toEqual([...ANCHOR_POINTS.inset]);
    let meshes = 0;
    inset.root.traverse((object) => {
      if ('isMesh' in object) meshes += 1;
    });
    expect(meshes).toBeLessThan(MAX_DRAW_CALLS);
  });

  it('follows the inset view flag and swaps the cooler with the cooling type', () => {
    const { inset, find } = built();
    inset.setState(stateAt(LATE_HEAT, 'liquid', false));
    expect(inset.root.visible).toBe(false);
    inset.setState(stateAt(LATE_HEAT, 'liquid'));
    expect([find(COLD_PLATE_NAME).visible, find(HEAT_SINK_NAME).visible]).toEqual([true, false]);
    inset.setState(stateAt(LATE_HEAT, 'air'));
    expect([find(COLD_PLATE_NAME).visible, find(HEAT_SINK_NAME).visible]).toEqual([false, true]);
  });

  it.each(['liquid', 'air'] as const)(
    'steps the heat up out of the die with %s cooling',
    (cooling) => {
      const { inset, find } = built();
      const heat = find(HEAT_MARKER_NAME);
      const current = find(CURRENT_MARKER_NAME);
      inset.setState(stateAt(CURRENT_UNITS, cooling));
      expect([current.visible, heat.visible]).toEqual([true, false]);
      inset.setState(stateAt(EARLY_HEAT, cooling));
      const early = heat.position.y;
      expect([current.visible, heat.visible]).toEqual([false, true]);
      inset.setState(stateAt(LATE_HEAT, cooling));
      expect(heat.position.y).toBeGreaterThan(early);
      inset.setState(stateAt(MOMENTS.inCoolant, cooling));
      expect(heat.visible).toBe(false);
    },
  );
});
