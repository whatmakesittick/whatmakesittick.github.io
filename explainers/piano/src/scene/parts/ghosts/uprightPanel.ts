import type { BufferGeometry, Object3D } from 'three';
import { UPRIGHT, WHITE_KEY_PITCH } from '../../../model';
import type { GhostPainter, Segment } from './paint';
import { planarSegment } from './paint';
import { planarRod, slab } from './shapes';

const HALF_WIDTH = 0.05;
const ROUND = 0.002;
const BEHIND = (offset: number) => UPRIGHT.stringZ - offset;
const BOARD = { z: [BEHIND(0.05), BEHIND(0.033)], y: [0.745, 1.285] } as const;
const BRIDGE = { z: [BOARD.z[1], BEHIND(0.0012)], y: [0.772, 0.806] } as const;
const PIN_BLOCK = { z: [BEHIND(0.056), BEHIND(0.01)], y: [1.274, 1.314] } as const;
const HITCH_RAIL = { z: [BOARD.z[1], BEHIND(0.008)], y: [0.735, UPRIGHT.stringBottom] } as const;

export const PANEL_BACK = PIN_BLOCK.z[0];
const TUNING_PIN = { z: [PIN_BLOCK.z[1], UPRIGHT.stringZ + 0.008], radius: 0.0022 } as const;
const UNISON_SPACING = 0.0035;
const UNISON = [-UNISON_SPACING, 0, UNISON_SPACING] as const;
const NEIGHBOURS = 2;

function noteOffsets(): number[] {
  const count = NEIGHBOURS * 2 + 1;
  return Array.from({ length: count }, (_, index) => (index - NEIGHBOURS) * WHITE_KEY_PITCH);
}

function stringXs(): number[] {
  return noteOffsets().flatMap((note) => UNISON.map((offset) => note + offset));
}

function boardParts(): BufferGeometry[] {
  return [
    slab(BOARD.z, BOARD.y, HALF_WIDTH),
    slab(BRIDGE.z, BRIDGE.y, HALF_WIDTH, ROUND),
    slab(PIN_BLOCK.z, PIN_BLOCK.y, HALF_WIDTH, ROUND),
    slab(HITCH_RAIL.z, HITCH_RAIL.y, HALF_WIDTH, ROUND),
    ...noteOffsets().map((x) =>
      planarRod(
        [UPRIGHT.stringTop, TUNING_PIN.z[0]],
        [UPRIGHT.stringTop, TUNING_PIN.z[1]],
        TUNING_PIN.radius,
        x,
      ),
    ),
  ];
}

function stringSegments(): Segment[] {
  return stringXs().map((x) =>
    planarSegment([UPRIGHT.stringBottom, UPRIGHT.stringZ], [UPRIGHT.stringTop, UPRIGHT.stringZ], x),
  );
}

export function buildUprightPanel(painter: GhostPainter, parent: Object3D): void {
  painter.solid(parent, boardParts(), 'frame');
  painter.lines(parent, stringSegments(), 'string');
}
