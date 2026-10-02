import { describe, expect, it, vi } from 'vitest';
import type { LoadId, PartId, SensorModeId } from '../ids';
import { HANDBACK_MIN, MOMENTS, linkAt, minutesAt, sensorAt, strikeAt, unitsAt } from '../model';
import { DEFAULT_VIEW } from '../state';
import { DrawnLabels } from './drawnLabels';
import type { DrawnSource } from './drawnLabels';

interface Situation {
  load?: LoadId;
  mode?: SensorModeId;
  links?: boolean;
}

const WANTED_LABELS: ReadonlySet<PartId> = new Set([
  'hellfire',
  'bombs',
  'missile',
  'laserBeam',
  'satLink',
  'losLink',
  'target',
]);
const IN_FLIGHT = MOMENTS.launch + 1;

function stateAt(
  units: number,
  { load = 'armed', mode = 'day', links = true }: Situation = {},
): DrawnSource {
  return {
    strike: strikeAt(units, load),
    sensor: sensorAt(units, mode, load),
    link: linkAt(minutesAt(units)),
    load,
    view: { ...DEFAULT_VIEW, links },
  };
}

function shownAt(state: DrawnSource): { wanted: string[]; pinned: string[] } {
  const setWanted = vi.fn();
  const labels = new DrawnLabels({ setWanted });
  labels.follow(state);
  labels.setWanted(WANTED_LABELS, WANTED_LABELS);
  const [wanted, pinned] = setWanted.mock.lastCall as [ReadonlySet<string>, ReadonlySet<string>];
  return { wanted: [...wanted].sort(), pinned: [...pinned].sort() };
}

describe('labels of drawn parts', () => {
  it('labels the missile and the laser only while the missile flies', () => {
    expect(shownAt(stateAt(IN_FLIGHT)).pinned).toEqual([
      'bombs',
      'hellfire',
      'laserBeam',
      'missile',
      'satLink',
      'target',
    ]);
    [MOMENTS.launch - 1, MOMENTS.impact + 1].forEach((units) =>
      expect(shownAt(stateAt(units)).pinned, String(units)).toEqual([
        'bombs',
        'hellfire',
        'satLink',
        'target',
      ]),
    );
  });

  it('labels the laser the sensor operator points at the target', () => {
    expect(shownAt(stateAt(MOMENTS.onStation + 1, { mode: 'laser' })).wanted).toContain(
      'laserBeam',
    );
  });

  it('drops the weapons on the unarmed load', () => {
    expect(shownAt(stateAt(IN_FLIGHT, { load: 'clean' })).wanted).toEqual(['satLink', 'target']);
  });

  it('labels only the link in use, and no link while the beams are off', () => {
    expect(shownAt(stateAt(MOMENTS.liftoff)).wanted).toContain('losLink');
    expect(shownAt(stateAt(MOMENTS.liftoff)).wanted).not.toContain('satLink');
    expect(shownAt(stateAt(unitsAt(HANDBACK_MIN))).wanted).toContain('losLink');
    const hidden = shownAt(stateAt(IN_FLIGHT, { links: false })).wanted;
    expect(hidden).not.toContain('satLink');
    expect(hidden).not.toContain('losLink');
  });

  it('asks again only when a part appears or disappears', () => {
    const setWanted = vi.fn();
    const labels = new DrawnLabels({ setWanted });
    labels.setWanted(WANTED_LABELS, WANTED_LABELS);
    labels.follow(stateAt(MOMENTS.launch - 1));
    const calls = setWanted.mock.calls.length;
    labels.follow(stateAt(MOMENTS.launch - 0.5));
    expect(setWanted).toHaveBeenCalledTimes(calls);
    labels.follow(stateAt(IN_FLIGHT));
    expect(setWanted).toHaveBeenCalledTimes(calls + 1);
    expect(setWanted.mock.lastCall?.[0]).toContain('missile');
  });
});
