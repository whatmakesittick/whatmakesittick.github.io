import { describe, expect, it, vi } from 'vitest';
import { boatAt, jetAt, planingAt, seaAt } from '../model';
import { DEFAULT_VIEW } from '../state';
import { DrawnLabels } from './drawnLabels';
import { isCompactStage } from './viewFit';
import type { DrawnSource } from './drawnLabels';

const ALL = new Set([
  'satLink',
  'backupLink',
  'satellite',
  'backupSatellite',
  'videoGhost',
  'missileRails',
  'companions',
  'bowWave',
  'spray',
  'wettedLength',
  'jetStream',
  'hull',
]);

function source(knots: number, changes: Partial<DrawnSource> = {}): DrawnSource {
  return {
    view: DEFAULT_VIEW,
    link: { mode: 'satellite', ghost: null },
    fit: 'standard',
    companions: [],
    planing: planingAt(knots),
    boat: { ...boatAt(60), knots },
    wettedBar: false,
    jet: jetAt(knots / 42, knots, 0, false),
    ...changes,
  };
}

function shown(changes: DrawnSource): ReadonlySet<string> {
  const policy = { setWanted: vi.fn() };
  const labels = new DrawnLabels(policy);
  labels.setWanted(ALL, ALL);
  labels.follow(changes);
  return policy.setWanted.mock.lastCall?.[0] as ReadonlySet<string>;
}

describe('drawn labels', () => {
  it('hides the labels of what the scene does not draw at rest', () => {
    expect([...shown(source(0))]).toEqual(['hull']);
  });

  it('shows the bow wave below planing and the spray from the hump on', () => {
    expect(shown(source(11))).toContain('bowWave');
    expect(shown(source(11))).toContain('spray');
    expect(shown(source(22))).not.toContain('bowWave');
    expect(shown(source(22))).toContain('spray');
    expect(shown(source(22))).toContain('jetStream');
  });

  it('labels the beam of the link in use while the links are shown', () => {
    const links = { ...DEFAULT_VIEW, links: true };
    expect(shown(source(22, { view: links }))).toContain('satLink');
    const backup = shown(source(22, { view: links, link: { mode: 'backup', ghost: null } }));
    expect(backup).toContain('backupLink');
    expect(backup).not.toContain('satLink');
    expect(shown(source(22, { link: { mode: 'satellite', ghost: null } }))).not.toContain(
      'satLink',
    );
  });

  it('labels the satellites only while the links are shown, as the scene draws them', () => {
    const links = { ...DEFAULT_VIEW, links: true };
    ['satellite', 'backupSatellite'].forEach((part) => {
      expect(shown(source(22, { view: links })), part).toContain(part);
      expect(
        shown(source(22, { view: links, link: { mode: 'lost', ghost: null } })),
        part,
      ).toContain(part);
      expect(shown(source(22)), part).not.toContain(part);
    });
  });

  it('labels the ghost, the rails, the companions and the wetted bar when drawn', () => {
    const drawn = shown(
      source(42, {
        link: { mode: 'satellite', ghost: { position: [0, 0, 0], heading: 0 } },
        fit: 'missile',
        companions: [{ position: [0, 0, 0], heading: 0 }],
        wettedBar: true,
        sea: seaAt('smooth'),
      } as Partial<DrawnSource>),
    );
    ['videoGhost', 'missileRails', 'companions', 'wettedLength'].forEach((part) =>
      expect(drawn).toContain(part),
    );
  });

  it('drops the minor pump labels while the stage is phone-sized', () => {
    const policy = { setWanted: vi.fn() };
    const labels = new DrawnLabels(policy);
    const pump = new Set(['impeller', 'nozzle', 'driveShaft', 'steeringNozzle']);
    labels.setWanted(pump, pump);
    const wanted = () => [...(policy.setWanted.mock.lastCall?.[0] as ReadonlySet<string>)];
    labels.setCompact(isCompactStage({ width: 390 }));
    expect(wanted()).toEqual(['impeller', 'steeringNozzle']);
    const calls = policy.setWanted.mock.calls.length;
    labels.setCompact(isCompactStage({ width: 400 }));
    expect(policy.setWanted.mock.calls).toHaveLength(calls);
    labels.setCompact(isCompactStage({ width: 835 }));
    expect(wanted()).toEqual([...pump]);
  });

  it('publishes again only when a drawn part changes', () => {
    const policy = { setWanted: vi.fn() };
    const labels = new DrawnLabels(policy);
    labels.setWanted(ALL, ALL);
    labels.follow(source(22));
    const calls = policy.setWanted.mock.calls.length;
    labels.follow(source(23));
    expect(policy.setWanted.mock.calls).toHaveLength(calls);
    labels.follow(source(10));
    expect(policy.setWanted.mock.calls).toHaveLength(calls + 1);
  });
});
