import type { ViewportSize } from '@core/scene/lens';
import type { LabelPolicy } from '@core/scene/presetBinder';
import type { AssemblyState, PartId } from '../ids';

export type DrawnSource = Pick<
  AssemblyState,
  'view' | 'link' | 'fit' | 'companions' | 'planing' | 'boat' | 'wettedBar' | 'jet'
>;

type DrawnTest = (state: DrawnSource) => boolean;

const NO_PARTS: ReadonlySet<string> = new Set();
const MOVING_KNOTS = 0.5;
const COMPACT_STAGE_WIDTH_PX = 600;

const COMPACT_HIDDEN: ReadonlySet<string> = new Set<PartId>([
  'driveShaft',
  'stator',
  'nozzle',
  'fuelTanks',
]);

export function isCompactStage(size: Pick<ViewportSize, 'width'>): boolean {
  return size.width < COMPACT_STAGE_WIDTH_PX;
}

const DRAWN_WHEN: Readonly<Partial<Record<PartId, DrawnTest>>> = {
  satLink: ({ view, link }) => view.links && link.mode === 'satellite',
  backupLink: ({ view, link }) => view.links && link.mode === 'backup',
  videoGhost: ({ link }) => link.ghost !== null,
  missileRails: ({ fit }) => fit === 'missile',
  companions: ({ companions }) => companions.length > 0,
  bowWave: ({ planing, boat }) => planing.mode !== 'planing' && boat.knots > MOVING_KNOTS,
  spray: ({ planing }) => planing.mode !== 'floating',
  wettedLength: ({ wettedBar }) => wettedBar,
  jetStream: ({ jet }) => jet.flow > 0,
};

const DRAWN_TESTS = Object.entries(DRAWN_WHEN) as readonly [PartId, DrawnTest][];

export class DrawnLabels implements LabelPolicy {
  private readonly policy: LabelPolicy;
  private readonly hidden = new Set<string>();
  private wanted = NO_PARTS;
  private pinned = NO_PARTS;
  private compact = false;

  constructor(policy: LabelPolicy) {
    this.policy = policy;
  }

  setWanted(wanted: ReadonlySet<string>, pinned: ReadonlySet<string>): void {
    this.wanted = wanted;
    this.pinned = pinned;
    this.publish();
  }

  follow(state: DrawnSource): void {
    if (this.hideUndrawn(state)) this.publish();
  }

  setCompact(compact: boolean): void {
    if (compact === this.compact) return;
    this.compact = compact;
    this.publish();
  }

  private hideUndrawn(state: DrawnSource): boolean {
    let changed = false;
    for (const [part, isDrawn] of DRAWN_TESTS) {
      const hidden = !isDrawn(state);
      if (hidden === this.hidden.has(part)) continue;
      if (hidden) this.hidden.add(part);
      else this.hidden.delete(part);
      changed = true;
    }
    return changed;
  }

  private publish(): void {
    this.policy.setWanted(this.drawn(this.wanted), this.drawn(this.pinned));
  }

  private drawn(parts: ReadonlySet<string>): ReadonlySet<string> {
    return new Set([...parts].filter((part) => this.fits(part) && !this.hidden.has(part)));
  }

  private fits(part: string): boolean {
    return !this.compact || !COMPACT_HIDDEN.has(part);
  }
}
