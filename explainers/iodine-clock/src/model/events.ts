import { IODINE_STAGE_IDS } from '../ids';
import type { IodineEvent, IodineStageId, LandoltEvent } from '../ids';
import type { Span } from './timeMap';
import { POUR_S } from './timeMap';

export const LANDOLT_EVENT_S = 2.4;
export const IODINE_EVENT_S = 1.2;
export const OXYGEN_HOPS = 3;

export const IODINE_STAGE_SHARES: Readonly<Record<IodineStageId, Span>> = {
  meet: { start: 0, end: 0.4 },
  formed: { start: 0.4, end: 0.6 },
  eaten: { start: 0.6, end: 1 },
};

function isActive(seconds: number, switchAt: number): boolean {
  return seconds >= POUR_S && seconds < switchAt;
}

function fraction(value: number): number {
  return value - Math.floor(value);
}

export function writeLandoltEvent(seconds: number, switchAt: number, out: LandoltEvent): void {
  const turns = seconds / LANDOLT_EVENT_S;
  out.active = isActive(seconds, switchAt);
  out.cycle = Math.floor(turns);
  out.hop = out.active ? OXYGEN_HOPS * fraction(turns) : 0;
}

function stageAt(share: number): IodineStageId {
  return IODINE_STAGE_IDS.find((id) => share < IODINE_STAGE_SHARES[id].end) ?? 'eaten';
}

export function writeIodineEvent(seconds: number, switchAt: number, out: IodineEvent): void {
  const turns = seconds / IODINE_EVENT_S;
  const share = fraction(turns);
  out.active = isActive(seconds, switchAt);
  out.cycle = Math.floor(turns);
  if (!out.active) {
    out.stage = 'meet';
    out.progress = 0;
    return;
  }
  const stage = stageAt(share);
  const { start, end } = IODINE_STAGE_SHARES[stage];
  out.stage = stage;
  out.progress = (share - start) / (end - start);
}
