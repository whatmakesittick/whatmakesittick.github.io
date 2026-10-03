import type { Point } from '../../ids';

export interface TrailSample {
  point: Point;
  heading: number;
}

export interface TrailRun {
  from: number;
  to: number;
}

function mix(a: TrailSample, b: TrailSample, share: number): TrailSample {
  return {
    point: [
      a.point[0] + (b.point[0] - a.point[0]) * share,
      a.point[1] + (b.point[1] - a.point[1]) * share,
      a.point[2] + (b.point[2] - a.point[2]) * share,
    ],
    heading: a.heading + (b.heading - a.heading) * share,
  };
}

export class TrailSamples {
  private readonly slots: (TrailSample | null)[] = [];
  private readonly step: number;
  private readonly capacity: number;
  private readonly maxGap: number;
  private last: { slot: number; sample: TrailSample } | null = null;

  constructor(step: number, capacity: number, maxGap: number) {
    this.step = step;
    this.capacity = capacity;
    this.maxGap = maxGap;
  }

  slotOf(phase: number): number {
    return Math.min(this.capacity - 1, Math.max(0, Math.floor(phase / this.step)));
  }

  record(phase: number, sample: TrailSample): void {
    const slot = this.slotOf(phase);
    const previous = this.last;
    if (previous && slot > previous.slot && slot - previous.slot <= this.maxGap) {
      for (let between = previous.slot + 1; between < slot; between += 1) {
        const share = (between - previous.slot) / (slot - previous.slot);
        this.slots[between] = mix(previous.sample, sample, share);
      }
    }
    this.slots[slot] = sample;
    this.last = { slot, sample };
  }

  sampleAt(slot: number): TrailSample | null {
    return this.slots[slot] ?? null;
  }

  run(phase: number): TrailRun {
    const to = this.slotOf(phase);
    let from = to;
    while (from > 0 && this.slots[from - 1]) from -= 1;
    return { from, to };
  }
}
