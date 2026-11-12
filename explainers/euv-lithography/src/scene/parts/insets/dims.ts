import type { Point } from '../../../ids';
import { DROPLET_INSET_ANCHOR, PATTERN_INSET_ANCHOR } from '../../../model/layout';
import { PHASE_RANGES } from '../../../model/run';

export interface PanelSpec {
  centre: Point;
  width: number;
  height: number;
}

export const DROPLET_PANEL: PanelSpec = { centre: DROPLET_INSET_ANCHOR, width: 2.1, height: 2.0 };
export const PATTERN_PANEL: PanelSpec = { centre: PATTERN_INSET_ANCHOR, width: 2.5, height: 2.3 };
export const PANEL_DEPTH_M = 0.04;
export const PANEL_CORNER_M = 0.14;
export const RIM_WIDTH_M = 0.035;
export const RIM_DEPTH_M = 0.06;
export const LEADER_RADIUS_M = 0.01;
export const LEADER_DOT_M = 0.035;
export const LEADER_SIDES = 6;
export const LEADER_END_STREAM: Point = [-3, 2.2, 0];
export const LEADER_END_WAFER: Point = [3.9, 0.3, 0];

export const DROPLET_OFFSET: Point = [0.2, 0, 0];
export const DROPLET_SEGMENTS = [32, 20] as const;
export const DISC_THICKNESS_M = 0.12;
export const HAIR_X = -3.6;
export const HAIR_MARGIN_M = 0.12;
export const HAIR_SIDES = 24;
export const GLOW_SIZE_M = 1.9;
export const VIOLET_EMISSIVE = 2.2;
export const FLATTEN_START_UNITS = PHASE_RANGES.prepulse.start;
export const FLATTEN_END_UNITS = PHASE_RANGES.prepulse.end;
export const FLASH_END_UNITS = PHASE_RANGES.plasma.end;

export const LINE_HEIGHT_M = 1.1;
export const LINE_DEPTH_M = 0.3;
export const LINE_BEVEL = 0.22;
export const LINE_LEFT_M = 4.9;
export const STRIP = { left: 4.85, width: 2.3, bottom: 0.2, height: 0.2, depth: 0.4 } as const;

export const VIRUS_CENTRE: Point = [7, 1.9, 0];
export const VIRUS = {
  ringRadius: 0.15,
  tubeRadius: 0.04,
  spikes: 18,
  spikeRadius: 0.012,
  spikeLength: 0.05,
  spikeCentre: 0.215,
  headRadius: 0.022,
  headCentre: 0.235,
  spinRadiansPerSecond: 0.35,
} as const;
export const VIRUS_SEGMENTS = { tube: 12, ring: 36, spike: 6, head: [8, 6] } as const;
export const BEVEL_SEGMENTS = 2;
