import { clamp, smoothstep } from '@core/math';

export type Knot = readonly [at: number, value: number];

const SLOPE_PEAK = 6;
const CUBIC = 3;
const QUARTIC_HALF = 0.5;
const HALF = 0.5;

interface Span {
  from: Knot;
  to: Knot;
  length: number;
  integralBefore: number;
}

function fullIntegral(from: Knot, to: Knot): number {
  return (to[0] - from[0]) * (from[1] + to[1]) * HALF;
}

export class Profile {
  private readonly spans: readonly Span[];
  private readonly first: Knot;
  private readonly last: Knot;
  private readonly total: number;

  constructor(knots: readonly Knot[]) {
    const spans: Span[] = [];
    let integral = 0;
    knots.slice(1).forEach((to, index) => {
      const from = knots[index];
      spans.push({ from, to, length: to[0] - from[0], integralBefore: integral });
      integral += fullIntegral(from, to);
    });
    this.spans = spans;
    this.first = knots[0];
    this.last = knots[knots.length - 1];
    this.total = integral;
  }

  at(time: number): number {
    const found = this.spanAt(time);
    if (!found) return this.edgeValue(time);
    const { span, share } = found;
    return span.from[1] + (span.to[1] - span.from[1]) * smoothstep(share);
  }

  slopeAt(time: number): number {
    const found = this.spanAt(time);
    if (!found) return 0;
    const { span, share } = found;
    return ((span.to[1] - span.from[1]) * SLOPE_PEAK * share * (1 - share)) / span.length;
  }

  integralTo(time: number): number {
    const found = this.spanAt(time);
    if (!found) return time <= this.first[0] ? 0 : this.total;
    const { span, share } = found;
    const rise = span.to[1] - span.from[1];
    const curve = share ** CUBIC - QUARTIC_HALF * share ** (CUBIC + 1);
    return span.integralBefore + span.length * (span.from[1] * share + rise * curve);
  }

  private edgeValue(time: number): number {
    return time <= this.first[0] ? this.first[1] : this.last[1];
  }

  private spanAt(time: number): { span: Span; share: number } | null {
    if (time < this.first[0] || time > this.last[0]) return null;
    const span =
      this.spans.find((candidate) => time <= candidate.to[0]) ?? this.spans[this.spans.length - 1];
    if (!span || span.length === 0) return null;
    return { span, share: clamp((time - span.from[0]) / span.length, 0, 1) };
  }
}
