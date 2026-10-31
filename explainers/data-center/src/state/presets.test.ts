import { describe, expect, it } from 'vitest';
import { CAMERA_VIEW_IDS, PART_IDS, PRESET_IDS, VIEW_IDS } from '../ids';
import type { PhaseId, PresetId } from '../ids';
import { MOMENTS, phaseAt } from '../model';
import { PRESETS } from './presets';

const START_PHASES: Readonly<Record<PresetId, PhaseId>> = {
  building: 'grid',
  powerIn: 'grid',
  rack: 'distribute',
  network: 'compute',
  heatOut: 'cool',
  compare: 'cool',
};

const KEPT_FLAGS: readonly string[] = ['labels', 'follow'];

function chapterStart(id: PresetId): number {
  const { startAt, pauseAt } = PRESETS[id];
  return startAt ?? pauseAt ?? Number.NaN;
}

function viewsOn(id: PresetId): readonly string[] {
  return Object.entries(PRESETS[id].view)
    .filter(([, on]) => on)
    .map(([flag]) => flag);
}

describe('data center presets', () => {
  it('defines one preset per chapter, each with its own fixed camera', () => {
    expect(Object.keys(PRESETS)).toEqual([...PRESET_IDS]);
    expect(PRESET_IDS.map((id) => PRESETS[id].camera)).toEqual(
      CAMERA_VIEW_IDS.filter((view) => view !== 'chase'),
    );
  });

  it('names only known parts in labels and highlights', () => {
    PRESET_IDS.forEach((id) => {
      [...PRESETS[id].labels, ...PRESETS[id].highlight].forEach((part) =>
        expect(PART_IDS, `${id} ${part}`).toContain(part),
      );
    });
  });

  it('plays the power, rack and heat chapters slowly', () => {
    expect(PRESET_IDS.map((id) => PRESETS[id].speed)).toEqual([4, 2, 2, 4, 2, 4]);
  });

  it('starts at the grid, above the rack and at the coolant', () => {
    expect(PRESETS.building.startAt).toBe(0);
    expect(PRESETS.powerIn.startAt).toBe(0);
    expect(PRESETS.rack.startAt).toBe(420);
    expect(PRESETS.heatOut.startAt).toBe(MOMENTS.inCoolant);
    expect(MOMENTS.inCoolant).toBe(600);
    PRESET_IDS.forEach((id) => expect(phaseAt(chapterStart(id)), id).toBe(START_PHASES[id]));
  });

  it('pauses the network at the rack and the line-up in the coolant', () => {
    expect(PRESETS.network.pauseAt).toBe(MOMENTS.atRack);
    expect(MOMENTS.atRack).toBe(450);
    expect(PRESETS.compare.pauseAt).toBe(600);
    expect(PRESET_IDS.filter((id) => PRESETS[id].pauseAt !== undefined)).toEqual([
      'network',
      'compare',
    ]);
  });

  it('sets every view flag but the labels and follow', () => {
    PRESET_IDS.forEach((id) =>
      expect(Object.keys(PRESETS[id].view).sort(), id).toEqual(
        VIEW_IDS.filter((flag) => !KEPT_FLAGS.includes(flag)).sort(),
      ),
    );
  });

  it('turns on the views each chapter needs and nothing else', () => {
    expect(viewsOn('building')).toEqual(['power', 'heat', 'inset']);
    expect(viewsOn('powerIn')).toEqual(['power', 'cutaway']);
    expect(viewsOn('rack')).toEqual(['power', 'cutaway', 'inset']);
    expect(viewsOn('network')).toEqual(['packets', 'cutaway']);
    expect(viewsOn('heatOut')).toEqual(['heat', 'cutaway']);
    expect(viewsOn('compare')).toEqual(['heat', 'cutaway', 'lineUp']);
  });

  it('starts the chapter controls the table names', () => {
    expect(PRESETS.building.start).toBeUndefined();
    expect(PRESETS.powerIn.start).toBeUndefined();
    expect(PRESETS.rack.start).toBeUndefined();
    expect(PRESETS.network.start).toEqual({ distance: 'km1000' });
    expect(PRESETS.heatOut.start).toBeUndefined();
    expect(PRESETS.compare.start).toEqual({ benchmark: 'average' });
  });

  it('labels and highlights the parts of each chapter', () => {
    expect(PRESETS.building.labels).toEqual([
      'gridLine',
      'substation',
      'generators',
      'hall',
      'racks',
      'chiller',
      'dryCoolers',
      'joule',
    ]);
    expect(PRESETS.building.highlight).toEqual([]);
    const power = [
      'gridLine',
      'transformers',
      'switchgear',
      'ups',
      'batteries',
      'generators',
      'busway',
      'joule',
    ];
    expect(PRESETS.powerIn.labels).toEqual(power);
    expect(PRESETS.powerIn.highlight).toEqual(power);
    const rack = [
      'subjectRack',
      'powerShelves',
      'busbar',
      'computeTrays',
      'switchTrays',
      'trayFans',
      'chipInset',
    ];
    expect(PRESETS.rack.labels).toEqual([...rack, 'joule']);
    expect(PRESETS.rack.highlight).toEqual(rack);
    const network = ['fibreEntry', 'spineSwitches', 'leafSwitches', 'switchTrays'];
    expect(PRESETS.network.labels).toEqual([...network, 'subjectRack']);
    expect(PRESETS.network.highlight).toEqual(network);
    const heat = ['manifold', 'cdu', 'facilityPipes', 'chiller', 'dryCoolers', 'airHandlers'];
    expect(PRESETS.heatOut.labels).toEqual([...heat, 'joule']);
    expect(PRESETS.heatOut.highlight).toEqual(heat);
    expect(PRESETS.compare.labels).toEqual(['subjectRack', 'laptop', 'racks', 'chipInset']);
    expect(PRESETS.compare.highlight).toEqual(['subjectRack', 'laptop', 'racks']);
  });
});
