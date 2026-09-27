import { isLooping } from '../explainer';
import type { Phase, Timeline } from '../explainer';

const DIGIT_SHORTCUT_LIMIT = 9;
const PERCENT = 100;
const SHARE_DECIMALS = 2;
const PHASE_MIN_WIDTH = 'var(--phase-min-width, 0px)';

export function phaseAt(
  timeline: Pick<Timeline, 'phases' | 'cycle' | 'loop'>,
  phase: number,
): Phase {
  const { phases } = timeline;
  if (!isLooping(timeline) && phase >= timeline.cycle) return phases[phases.length - 1];
  return phases.find((candidate) => phase >= candidate.start && phase < candidate.end) ?? phases[0];
}

export function scrubberMax(timeline: Pick<Timeline, 'cycle' | 'step' | 'loop'>): number {
  return isLooping(timeline) ? timeline.cycle - timeline.step : timeline.cycle;
}

export function phaseShortcut(index: number): string | undefined {
  return index < DIGIT_SHORTCUT_LIMIT ? String(index + 1) : undefined;
}

export function phaseBands(timeline: Pick<Timeline, 'phases' | 'cycle'>): string {
  const { phases, cycle } = timeline;
  const stops = phases.map((phase, index) => {
    if (index === phases.length - 1) return `${phase.tone} 0`;
    const edge = (phase.end / cycle) * PERCENT;
    return [
      `${phase.tone} 0 calc(${edge}% - var(--track-gap))`,
      `transparent 0 calc(${edge}% + var(--track-gap))`,
    ].join(', ');
  });
  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

function cycleShare(phase: Phase, cycle: number): number {
  return Number((((phase.end - phase.start) / cycle) * PERCENT).toFixed(SHARE_DECIMALS));
}

export function phaseColumns(timeline: Pick<Timeline, 'phases' | 'cycle'>): string {
  return timeline.phases
    .map((phase) => `minmax(${PHASE_MIN_WIDTH}, ${cycleShare(phase, timeline.cycle)}fr)`)
    .join(' ');
}
