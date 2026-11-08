import { Group } from 'three';
import type { BufferAttribute, BufferGeometry, Object3D } from 'three';
import type { HarpsichordPose } from '../../../ids';
import { HARPSICHORD, KEY, KEY_DIP_MM, HARPSICHORD_JACK_RATIO, mm } from '../../../model';
import { pivotFrame } from '../action/meshes';
import { label, namedGroup } from '../context';
import type { PartContext } from '../context';
import { ghostPainter, planarSegment } from './paint';
import type { Segment } from './paint';
import { rod, slab } from './shapes';
import type { Span } from './shapes';
import {
  DAMPER_BOTTOM,
  HARPSICHORD_KEY_BACK,
  JACK,
  KEY_PIVOT,
  PLECTRUM,
  STRING,
  harpsichordKeyAngle,
  plectrumAngle,
  ringPhase,
  stringLift,
} from './harpsichordLayout';

const GROUP = 'harpsichord';
const HALF = { key: KEY.whiteWidth / 2, rail: 0.03, block: 0.004, tongue: 0.002 } as const;
const ROUND = { soft: 0.002, fine: 0.001 } as const;
const REGISTER = { y: [0.772, 0.784], reach: 0.03, slot: JACK.halfDepth + 0.001 } as const;
const RAIL_GAP = 0.002;
const LABEL_BELOW_REGISTER = 0.02;
const RAIL = { height: 0.018, felt: 0.005, reach: 0.03 } as const;
const TONGUE = {
  below: 0.028,
  above: 0.008,
  half: 0.0045,
  axle: 0.02,
  axleRadius: 0.0012,
} as const;
const FELT = { height: 0.012, half: 0.007, side: 0.0045 } as const;
const PLECTRUM_HALF_DEPTH = 0.003;
const PLECTRUM_HALF_REACH = (PLECTRUM.tipX - PLECTRUM.rootX) / 2;
const NUT = { half: 0.003, drop: 0.014 } as const;
const WREST_PLANK = { z: [STRING.front - 0.014, STRING.front + 0.034], depth: 0.026 } as const;
const SOUNDBOARD = { z: [STRING.back - 0.03, STRING.back + 0.06], depth: 0.006 } as const;
const TUNING_PIN = { ahead: 0.02, rise: 0.012, radius: 0.0022 } as const;
const BALANCE_RAIL = { half: 0.008, depth: 0.014 } as const;

export interface HarpsichordGhost {
  readonly root: Object3D;
  pose(pose: HarpsichordPose, elapsed: number): void;
}

function around(centre: number, half: number): Span {
  return [centre - half, centre + half];
}

function railBottom(): number {
  return JACK.top + mm(KEY_DIP_MM * HARPSICHORD_JACK_RATIO) + RAIL_GAP;
}

function frameParts(): BufferGeometry[] {
  const nutTop = HARPSICHORD.stringY - STRING.radius;
  const plankTop = HARPSICHORD.stringY - NUT.drop;
  const pinZ = STRING.front + TUNING_PIN.ahead;
  return [
    slab(
      around(KEY_PIVOT[1], BALANCE_RAIL.half),
      [KEY_PIVOT[0] - BALANCE_RAIL.depth, KEY_PIVOT[0]],
      HALF.rail,
    ),
    slab([JACK.z - REGISTER.reach, JACK.z - REGISTER.slot], REGISTER.y, HALF.rail, ROUND.fine),
    slab([JACK.z + REGISTER.slot, JACK.z + REGISTER.reach], REGISTER.y, HALF.rail, ROUND.fine),
    slab(
      around(JACK.z, RAIL.reach),
      [railBottom() + RAIL.felt, railBottom() + RAIL.height],
      HALF.rail,
      ROUND.soft,
    ),
    slab(WREST_PLANK.z, [plankTop - WREST_PLANK.depth, plankTop], HALF.rail, ROUND.soft),
    slab(around(STRING.front, NUT.half), [plankTop, nutTop], HALF.rail, ROUND.fine),
    slab(SOUNDBOARD.z, [plankTop - SOUNDBOARD.depth, plankTop], HALF.rail),
    slab(around(STRING.back, NUT.half), [plankTop, nutTop], HALF.block, ROUND.fine, STRING.x),
    rod(
      [STRING.x, plankTop, pinZ],
      [STRING.x, HARPSICHORD.stringY + TUNING_PIN.rise, pinZ],
      TUNING_PIN.radius,
    ),
  ];
}

function frameFelt(): BufferGeometry[] {
  return [slab(around(JACK.z, RAIL.reach), [railBottom(), railBottom() + RAIL.felt], HALF.rail)];
}

function jackParts(): BufferGeometry[] {
  const tongueTop = PLECTRUM.y + TONGUE.above;
  return [
    slab(around(JACK.z, JACK.halfDepth), [JACK.bottom, JACK.top], JACK.halfWidth, ROUND.fine),
    slab(
      around(JACK.z, TONGUE.half),
      [PLECTRUM.y - TONGUE.below, tongueTop],
      JACK.halfWidth + HALF.tongue,
      ROUND.fine,
    ),
    rod(
      [-JACK.halfWidth - HALF.tongue, PLECTRUM.y - TONGUE.axle, JACK.z],
      [JACK.halfWidth + HALF.tongue, PLECTRUM.y - TONGUE.axle, JACK.z],
      TONGUE.axleRadius,
    ),
  ];
}

function jackFelt(): BufferGeometry[] {
  return [
    slab(
      around(JACK.z, FELT.half),
      [DAMPER_BOTTOM, DAMPER_BOTTOM + FELT.height],
      FELT.side,
      ROUND.fine,
      STRING.x - 0.0005,
    ),
  ];
}

function stringSegments(): Segment[] {
  const length = STRING.front - STRING.back;
  const pinZ = STRING.front + TUNING_PIN.ahead;
  const along = Array.from({ length: STRING.segments }, (_, index) => {
    const from = STRING.back + (length * index) / STRING.segments;
    const to = STRING.back + (length * (index + 1)) / STRING.segments;
    return planarSegment([HARPSICHORD.stringY, from], [HARPSICHORD.stringY, to], STRING.x);
  });
  return [
    ...along,
    planarSegment([HARPSICHORD.stringY, STRING.front], [HARPSICHORD.stringY, pinZ], STRING.x),
  ];
}

class VibratingString {
  private readonly base: Float32Array;
  private readonly position: BufferAttribute;

  constructor(geometry: BufferGeometry) {
    this.position = geometry.getAttribute('position') as BufferAttribute;
    this.base = Float32Array.from(this.position.array);
  }

  draw(pose: HarpsichordPose, phase: number): void {
    const length = STRING.front - STRING.back;
    for (let vertex = 0; vertex < this.position.count; vertex += 1) {
      const share = Math.min(1, (this.position.getZ(vertex) - STRING.back) / length);
      this.position.setY(
        vertex,
        this.base[vertex * this.position.itemSize + 1] + stringLift(share, pose, phase),
      );
    }
    this.position.needsUpdate = true;
  }
}

export function buildHarpsichord(context: PartContext): HarpsichordGhost {
  const root = namedGroup('harpsichordGhost');
  const painter = ghostPainter(context, GROUP);
  painter.solid(root, frameParts(), 'frame');
  painter.solid(root, frameFelt(), 'felt');
  const key = pivotFrame(root, 'harpsichordKey', ...KEY_PIVOT);
  painter.solid(
    key.body,
    [
      slab(
        [HARPSICHORD_KEY_BACK, HARPSICHORD.offsetZ],
        [KEY_PIVOT[0], KEY.top],
        HALF.key,
        ROUND.soft,
      ),
    ],
    'frame',
  );
  const jack = namedGroup('harpsichordJack', root);
  painter.solid(jack, jackParts());
  painter.solid(jack, jackFelt(), 'felt');
  const plectrum = new Group();
  plectrum.position.set(PLECTRUM.rootX, PLECTRUM.y, JACK.z);
  jack.add(plectrum);
  painter.solid(
    plectrum,
    [
      slab(
        around(0, PLECTRUM_HALF_DEPTH),
        around(0, PLECTRUM.half),
        PLECTRUM_HALF_REACH,
        0,
        PLECTRUM_HALF_REACH,
      ),
    ],
    'felt',
  );
  const lines = painter.lines(root, stringSegments(), 'string');
  lines.name = 'harpsichordString';
  const string = new VibratingString(lines.geometry);
  label(context, 'harpsichord', jack, [0, REGISTER.y[0] - LABEL_BELOW_REGISTER, JACK.z]);

  return {
    root,
    pose(pose, elapsed) {
      key.pivot.rotation.x = harpsichordKeyAngle(pose.keyMm);
      jack.position.y = mm(pose.jackRiseMm);
      plectrum.rotation.z = plectrumAngle(pose.plectrumBend);
      string.draw(pose, ringPhase(elapsed));
    },
  };
}
