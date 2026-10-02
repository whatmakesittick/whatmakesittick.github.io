import type { LabelPolicy } from '@core/scene/presetBinder';
import type { AssemblyState, PartId } from '../ids';

export type DrawnSource = Pick<AssemblyState, 'strike' | 'sensor' | 'link' | 'load' | 'view'>;

type DrawnTest = (state: DrawnSource) => boolean;

const NO_PARTS: ReadonlySet<string> = new Set();

const isArmed: DrawnTest = ({ load }) => load === 'armed';

const DRAWN_WHEN: Readonly<Partial<Record<PartId, DrawnTest>>> = {
  hellfire: isArmed,
  bombs: isArmed,
  missile: ({ strike }) => strike.stage === 'flying',
  laserBeam: ({ sensor }) => sensor.lasing || (sensor.mode === 'laser' && sensor.onTarget),
  satLink: ({ view, link }) => view.links && link === 'sat',
  losLink: ({ view, link }) => view.links && link === 'los',
};

const DRAWN_TESTS = Object.entries(DRAWN_WHEN) as readonly [PartId, DrawnTest][];

export class DrawnLabels implements LabelPolicy {
  private readonly policy: LabelPolicy;
  private readonly hidden = new Set<string>();
  private wanted = NO_PARTS;
  private pinned = NO_PARTS;

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
    return new Set([...parts].filter((part) => !this.hidden.has(part)));
  }
}
