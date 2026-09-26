import type { Phase, Timeline } from '../explainer';

const DIGIT_SHORTCUT_LIMIT = 9;
const PERCENT = 100;

export function phaseAt(timeline: Pick<Timeline, 'phases'>, phase: number): Phase {
  const { phases } = timeline;
  return phases.find((candidate) => phase >= candidate.start && phase < candidate.end) ?? phases[0];
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
