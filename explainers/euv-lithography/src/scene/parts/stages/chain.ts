import type { Piece } from './pieces';
import { rod, slab } from './pieces';

const RIB_PITCH = 0.025;
const RIB_GROW = 0.006;
const RIB_THICK = 0.008;
const CAP_GROW = 0.008;
const CAP_INSET = 0.01;

export interface ChainSpec {
  z: number;
  width: number;
  thick: number;
  topY: number;
  bottomY: number;
  attachX: number;
  bendX: number;
  mountX: number;
  clearance: number;
}

export interface ChainPieces {
  moving: Piece[];
  fixed: Piece[];
  bend: Piece[];
}

function run(spec: ChainSpec, fromX: number, toX: number, y: number): Piece[] {
  const length = Math.abs(toX - fromX);
  const centreX = (fromX + toX) / 2;
  const ribs = Math.floor(length / RIB_PITCH);
  const body = slab('tray', [centreX, y, spec.z], [length, spec.thick, spec.width]);
  const links = Array.from({ length: ribs }, (_, index) =>
    slab(
      'rubber',
      [Math.min(fromX, toX) + (index + 0.5) * RIB_PITCH, y, spec.z],
      [RIB_THICK, spec.thick + RIB_GROW, spec.width + RIB_GROW],
    ),
  );
  return [body, ...links];
}

export function cableChain(spec: ChainSpec): ChainPieces {
  const radius = (spec.topY - spec.bottomY) / 2 + spec.thick / 2;
  const centreY = (spec.topY + spec.bottomY) / 2;
  const bracketLength = spec.z + spec.width / 2 - spec.clearance;
  return {
    moving: [
      ...run(spec, spec.attachX, spec.bendX, spec.topY),
      slab(
        'frame',
        [spec.attachX - 0.03, spec.topY, spec.clearance + bracketLength / 2],
        [0.07, spec.thick + 0.012, bracketLength],
        0.006,
      ),
    ],
    fixed: [
      ...run(spec, spec.mountX, spec.bendX, spec.bottomY),
      slab(
        'frame',
        [spec.mountX - 0.03, spec.bottomY, spec.z],
        [0.07, spec.thick + 0.012, spec.width + 0.012],
        0.006,
      ),
    ],
    bend: [
      rod('tray', [spec.bendX, centreY, spec.z], radius, spec.width, 'z'),
      rod(
        'frame',
        [spec.bendX, centreY, spec.z],
        radius - CAP_INSET,
        spec.width + CAP_GROW * 2,
        'z',
      ),
    ],
  };
}
