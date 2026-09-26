import { DIMMED_OPACITY, EMPHASIS_RATE } from './constants';
import type { MaterialLibrary } from './materials';

const SETTLE_EPSILON = 0.002;

export class Highlighter {
  private readonly library: MaterialLibrary;
  private readonly groups: readonly string[];
  private readonly targets = new Map<string, number>();
  private readonly current = new Map<string, number>();

  constructor(library: MaterialLibrary, groups: readonly string[]) {
    this.library = library;
    this.groups = groups;
  }

  setHighlight(parts: readonly string[]): void {
    const highlighted = new Set<string>(parts);
    const dimOthers = highlighted.size > 0;
    this.groups.forEach((group) => {
      const emphasised = !dimOthers || highlighted.has(group);
      this.targets.set(group, emphasised ? 1 : DIMMED_OPACITY);
    });
  }

  update(deltaSeconds: number): void {
    const blend = 1 - Math.exp(-EMPHASIS_RATE * deltaSeconds);
    this.targets.forEach((target, group) => {
      const value = this.current.get(group) ?? 1;
      const next =
        Math.abs(target - value) < SETTLE_EPSILON ? target : value + (target - value) * blend;
      this.current.set(group, next);
      this.library.setEmphasis(group, next);
    });
  }
}
