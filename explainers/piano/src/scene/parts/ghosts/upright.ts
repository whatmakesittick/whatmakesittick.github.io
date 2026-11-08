import { BoxGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { CompareId, UprightPose } from '../../../ids';
import { KEY, UPRIGHT } from '../../../model';
import { unitFelt, unitMoulding } from '../action/headGeometry';
import { applyMatrix, pivotFrame } from '../action/meshes';
import type { Pivot } from '../action/meshes';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { QUARTER_TURN, segmentMatrix } from '../keyboard/geometry';
import { LabelSet } from './labelSet';
import { ghostPainter, zigzag } from './paint';
import type { GhostPainter } from './paint';
import { planarRod, slab } from './shapes';
import type { Planar, Span } from './shapes';
import { buildUprightPanel } from './uprightPanel';
import {
  CAPSTAN,
  CROWN_Z,
  DAMPER_HEAD,
  HEAD,
  HEAD_Y,
  KEY_BACK,
  KEY_BOTTOM,
  PIVOT,
  STRAP,
  WIPPEN_TOP,
  strapEnds,
  uprightAngles,
} from './uprightLayout';

const GROUP = 'upright';
const RADIUS = { capstan: 0.005, shank: 0.0035, wire: 0.0011, catcher: 0.0018, spoon: 0.0017 };
const HALF = { key: KEY.whiteWidth / 2, rail: 0.03, flange: 0.005, lever: 0.006, felt: 0.0055 };
const ROUND = { soft: 0.002, butt: 0.005, fine: 0.001 } as const;
const TAPE = { halfWidth: 0.003, thickness: 0.0018 } as const;
const SPRING = { turns: 4, amplitude: 0.0022 } as const;
const MOULDING_SHARE = 0.85;
const LABEL_BELOW_HEAD = 0.018;
const STRINGS_LABEL_Y = 0.82;
const DAMPER_LABEL_AHEAD = 0.02;
const [HAMMER_Y, HAMMER_Z] = PIVOT.hammer;
const [WIPPEN_Y, WIPPEN_Z] = PIVOT.wippen;
const [DAMPER_Y, DAMPER_Z] = PIVOT.damper;
const JACK_Z = PIVOT.jack[1];
const LABEL_Y = HEAD_Y - HEAD.height / 2 - LABEL_BELOW_HEAD;
const MAIN_RAIL = { z: [WIPPEN_Z - 0.007, HAMMER_Z + 0.0065], y: [0.81, 0.838] } as const;
const LET_OFF = {
  rail: { z: [HAMMER_Z + 0.016, HAMMER_Z + 0.046], y: [0.797, 0.811] },
  button: { z: [HAMMER_Z + 0.021, HAMMER_Z + 0.035], y: [0.789, 0.797] },
} as const;
const BALANCE_RAIL = { half: 0.01, depth: 0.016 } as const;
const BUTT = {
  z: [HAMMER_Z - 0.006, HAMMER_Z + 0.026],
  y: [HAMMER_Y - 0.008, HAMMER_Y + 0.026],
} as const;
const BUTT_FELT = {
  z: [HAMMER_Z + 0.005, HAMMER_Z + 0.019],
  y: [HAMMER_Y - 0.0115, BUTT.y[0]],
} as const;
const CATCHER = {
  shankY: HAMMER_Y + 0.016,
  z: [HAMMER_Z + 0.05, HAMMER_Z + 0.063],
  y: [HAMMER_Y + 0.003, HAMMER_Y + 0.029],
} as const;
const BACK_CHECK = {
  wire: [HAMMER_Z + 0.088, HAMMER_Z + 0.079],
  z: [HAMMER_Z + 0.07, HAMMER_Z + 0.084],
  y: [0.846, 0.878],
  felt: 0.0035,
} as const;
const HAMMER_RAIL = {
  z: [HAMMER_Z + RADIUS.shank, HAMMER_Z + 0.021],
  y: [0.9, 0.924],
  felt: 0.004,
} as const;
const JACK = {
  half: 0.0045,
  top: HAMMER_Y - 0.0115,
  toe: { reach: 0.022, y: [0.776, 0.784] },
} as const;
const DAMPER_LEVER = { half: 0.004, bottom: 0.79 } as const;
const DAMPER_SPRING: readonly [Planar, Planar] = [
  [0.846, MAIN_RAIL.z[0]],
  [0.872, DAMPER_Z + DAMPER_LEVER.half],
];
const BUTT_SPRING: readonly [Planar, Planar] = [
  [MAIN_RAIL.y[1] + 0.003, HAMMER_Z - 0.0095],
  [HAMMER_Y + 0.02, HAMMER_Z - 0.0095],
];

export interface UprightGhost {
  readonly root: Object3D;
  pose(pose: UprightPose): void;
  choose(chosen: CompareId): void;
}

function middle([from, to]: Span): number {
  return (from + to) / 2;
}

function frame(parent: Object3D, name: string, [y, z]: Planar): Pivot {
  return pivotFrame(parent, name, y, z);
}

function around(centre: number, half: number): Span {
  return [centre - half, centre + half];
}

function railParts(): BufferGeometry[] {
  return [
    slab(
      around(PIVOT.key[1], BALANCE_RAIL.half),
      [KEY_BOTTOM - BALANCE_RAIL.depth, KEY_BOTTOM],
      HALF.rail,
    ),
    slab(MAIN_RAIL.z, MAIN_RAIL.y, HALF.rail, ROUND.butt),
    slab(LET_OFF.rail.z, LET_OFF.rail.y, HALF.rail, ROUND.fine),
    slab(around(HAMMER_Z, HALF.flange + 0.001), [MAIN_RAIL.y[1], HAMMER_Y + 0.005], HALF.flange),
    slab(around(WIPPEN_Z, HALF.flange), [WIPPEN_Y - 0.004, MAIN_RAIL.y[0]], HALF.flange),
    slab([DAMPER_Z - 0.003, MAIN_RAIL.z[0]], around(DAMPER_Y, 0.007), HALF.flange),
  ];
}

function keyParts(): BufferGeometry[] {
  return [
    slab([KEY_BACK, UPRIGHT.offsetZ], [KEY_BOTTOM, KEY.top], HALF.key, ROUND.soft),
    planarRod([KEY.top, CAPSTAN.z], [CAPSTAN.top, CAPSTAN.z], RADIUS.capstan),
  ];
}

function wippenParts(): BufferGeometry[] {
  return [
    slab([WIPPEN_Z - 0.008, HAMMER_Z + 0.095], [CAPSTAN.top, WIPPEN_TOP], HALF.lever, ROUND.butt),
    planarRod(
      [WIPPEN_TOP, BACK_CHECK.wire[0]],
      [BACK_CHECK.y[0] + 0.004, BACK_CHECK.wire[1]],
      RADIUS.wire,
    ),
    slab([BACK_CHECK.z[0] + BACK_CHECK.felt, BACK_CHECK.z[1]], BACK_CHECK.y, HALF.felt, ROUND.soft),
    planarRod([WIPPEN_TOP, STRAP.wire[1]], STRAP.wire, RADIUS.wire),
    planarRod([WIPPEN_TOP, WIPPEN_Z - 0.006], [0.802, DAMPER_Z + 0.0055], RADIUS.spoon),
  ];
}

function wippenFelt(): BufferGeometry[] {
  return [slab([BACK_CHECK.z[0], BACK_CHECK.z[0] + BACK_CHECK.felt], BACK_CHECK.y, HALF.felt)];
}

function jackParts(): BufferGeometry[] {
  const half = HALF.flange - ROUND.fine;
  return [
    slab(around(JACK_Z, JACK.half), [WIPPEN_TOP, JACK.top], half, ROUND.fine),
    slab([JACK_Z + JACK.half, JACK_Z + JACK.toe.reach], JACK.toe.y, half, ROUND.fine),
  ];
}

function headFelt(): BufferGeometry {
  return unitFelt(false)
    .rotateX(-QUARTER_TURN)
    .scale(HEAD.width, HEAD.height, HEAD.felt)
    .translate(0, HEAD_Y, CROWN_Z + HEAD.felt);
}

function hammerParts(): BufferGeometry[] {
  const moulding = unitMoulding(false)
    .rotateX(-QUARTER_TURN)
    .scale(HEAD.width * MOULDING_SHARE, HEAD.height, HEAD.moulding)
    .translate(0, HEAD_Y, CROWN_Z + HEAD.felt + HEAD.moulding);
  return [
    slab(BUTT.z, BUTT.y, HALF.lever, ROUND.butt),
    planarRod([BUTT.y[1], HAMMER_Z], [HEAD_Y - HEAD.height / 2, HAMMER_Z], RADIUS.shank),
    planarRod([CATCHER.shankY, BUTT.z[1]], [CATCHER.shankY, CATCHER.z[0]], RADIUS.catcher),
    moulding,
  ];
}

function hammerFelt(): BufferGeometry[] {
  return [
    headFelt(),
    slab(BUTT_FELT.z, BUTT_FELT.y, HALF.felt),
    slab(CATCHER.z, CATCHER.y, HALF.felt, ROUND.soft),
  ];
}

function damperParts(): BufferGeometry[] {
  const back = UPRIGHT.stringZ + DAMPER_HEAD.gap + DAMPER_HEAD.felt;
  return [
    slab(
      around(DAMPER_Z, DAMPER_LEVER.half),
      [DAMPER_LEVER.bottom, DAMPER_HEAD.y[0]],
      HALF.lever,
      ROUND.fine,
    ),
    slab([back, DAMPER_Z + DAMPER_LEVER.half], DAMPER_HEAD.y, HALF.felt, ROUND.soft),
  ];
}

function damperFelt(): BufferGeometry[] {
  const front = UPRIGHT.stringZ + DAMPER_HEAD.gap;
  return [
    slab(
      [front, front + DAMPER_HEAD.felt],
      [DAMPER_HEAD.y[0] + 0.002, DAMPER_HEAD.y[1] - 0.002],
      HALF.felt,
    ),
  ];
}

function hammerRailParts(): BufferGeometry[] {
  return [
    slab(
      [HAMMER_RAIL.z[0] + HAMMER_RAIL.felt, HAMMER_RAIL.z[1]],
      HAMMER_RAIL.y,
      HALF.rail,
      ROUND.soft,
    ),
  ];
}

function hammerRailFelt(): BufferGeometry[] {
  return [slab([HAMMER_RAIL.z[0], HAMMER_RAIL.z[0] + HAMMER_RAIL.felt], HAMMER_RAIL.y, HALF.rail)];
}

function tapeGeometry(): BufferGeometry {
  return new BoxGeometry((TAPE.halfWidth * 2) / TAPE.thickness, 1, 1);
}

function spring(painter: GhostPainter, parent: Object3D, [from, to]: readonly [Planar, Planar]) {
  painter.lines(parent, zigzag(from, to, SPRING.turns, SPRING.amplitude));
}

export function buildUpright(context: PartContext): UprightGhost {
  const root = namedGroup('uprightGhost');
  const painter = ghostPainter(context, GROUP);
  const overview = new LabelSet(context);
  const details = new LabelSet(context);
  buildUprightPanel(painter, root);
  painter.solid(root, railParts(), 'frame');
  painter.solid(root, [slab(LET_OFF.button.z, LET_OFF.button.y, HALF.felt, ROUND.fine)], 'felt');
  spring(painter, root, BUTT_SPRING);
  const key = frame(root, 'uprightKey', PIVOT.key);
  const wippen = frame(root, 'uprightWippen', PIVOT.wippen);
  const jack = frame(wippen.body, 'uprightJack', PIVOT.jack);
  const hammer = frame(root, 'uprightHammer', PIVOT.hammer);
  const rail = frame(root, 'uprightRail', PIVOT.hammer);
  const damper = frame(root, 'uprightDamper', PIVOT.damper);
  painter.solid(key.body, keyParts(), 'frame');
  painter.solid(wippen.body, wippenParts());
  painter.solid(wippen.body, wippenFelt(), 'felt');
  painter.solid(jack.body, jackParts());
  painter.solid(hammer.body, hammerParts());
  painter.solid(hammer.body, hammerFelt(), 'felt');
  painter.solid(rail.body, hammerRailParts(), 'frame');
  painter.solid(rail.body, hammerRailFelt(), 'felt');
  painter.solid(damper.body, damperParts());
  painter.solid(damper.body, damperFelt(), 'felt');
  spring(painter, damper.body, DAMPER_SPRING);
  const tape = painter.solid(root, [tapeGeometry()], 'felt');
  overview.add('upright', hammer.body, [0, LABEL_Y, HAMMER_Z]);
  details.add('uprightHammer', hammer.body, [0, HEAD_Y - HEAD.height / 2, CROWN_Z + HEAD.felt / 2]);
  details.add('hammerButt', hammer.body, [0, middle(BUTT.y), middle(BUTT.z)]);
  details.add('bridleTape', tape, [0, 0, 0]);
  details.add('uprightDamper', damper.body, [
    0,
    middle(DAMPER_HEAD.y),
    UPRIGHT.stringZ + DAMPER_LABEL_AHEAD,
  ]);
  details.add('uprightStrings', root, [0, STRINGS_LABEL_Y, UPRIGHT.stringZ]);

  return {
    root,
    pose(pose) {
      const angles = uprightAngles(pose);
      key.pivot.rotation.x = angles.key;
      wippen.pivot.rotation.x = angles.wippen;
      jack.pivot.rotation.x = angles.jack;
      hammer.pivot.rotation.x = angles.hammer;
      rail.pivot.rotation.x = angles.rail;
      damper.pivot.rotation.x = angles.damper;
      const [catcher, wire] = strapEnds(angles);
      applyMatrix(tape, segmentMatrix([0, ...catcher], [0, ...wire], TAPE.thickness));
    },
    choose(chosen) {
      const own = chosen === 'upright';
      painter.choose(own);
      details.show(own);
      overview.show(chosen === 'grand');
    },
  };
}
