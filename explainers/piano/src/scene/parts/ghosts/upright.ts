import type { BufferGeometry, Object3D } from 'three';
import type { UprightPose } from '../../../ids';
import { KEY, UPRIGHT } from '../../../model';
import { FINISHES } from '../../finishes';
import { unitFelt, unitMoulding } from '../action/headGeometry';
import { applyMatrix, pivotFrame } from '../action/meshes';
import type { Pivot } from '../action/meshes';
import { label, namedGroup, partMesh } from '../context';
import type { PartContext } from '../context';
import { QUARTER_TURN, segmentMatrix } from '../keyboard/geometry';
import { ghostMesh, planarRod, slab, unitRod } from './shapes';
import type { Planar } from './shapes';
import {
  CAPSTAN,
  DAMPER_HEAD,
  HEAD,
  KEY_BACK,
  KEY_BOTTOM,
  PIVOT,
  STRAP,
  CROWN_Z,
  HEAD_Y,
  strapEnds,
  uprightAngles,
} from './uprightLayout';

const GROUP = 'upright';
const RADIUS = { string: 0.0009, capstan: 0.0035, shank: 0.0028, wire: 0.0008, stem: 0.0012 };
const HALF = { key: KEY.whiteWidth / 2, rail: 0.012, flange: 0.004, wippen: 0.005, felt: 0.005 };
const ROUND = { soft: 0.002, butt: 0.004, fine: 0.001 } as const;
const MOULDING_SHARE = 0.85;
const RAIL = { top: 0.834, bottom: 0.818, behind: 0.03, ahead: 0.008 } as const;
const WIPPEN_TOP = 0.772;
const [HAMMER_Y, HAMMER_Z] = PIVOT.hammer;

export interface UprightGhost {
  readonly root: Object3D;
  pose(pose: UprightPose): void;
}

function frame(parent: Object3D, name: string, [y, z]: Planar): Pivot {
  return pivotFrame(parent, name, y, z);
}

function fixedParts(): BufferGeometry[] {
  const [wippenY, wippenZ] = PIVOT.wippen;
  const [damperY, damperZ] = PIVOT.damper;
  const railBack = HAMMER_Z - RAIL.behind;
  return [
    planarRod(
      [UPRIGHT.stringBottom, UPRIGHT.stringZ],
      [UPRIGHT.stringTop, UPRIGHT.stringZ],
      RADIUS.string,
    ),
    slab([PIVOT.key[1] - 0.008, PIVOT.key[1] + 0.008], [KEY_BOTTOM - 0.014, KEY_BOTTOM], HALF.rail),
    slab([railBack, HAMMER_Z + RAIL.ahead], [RAIL.bottom, RAIL.top], HALF.rail, ROUND.soft),
    slab([HAMMER_Z - 0.006, HAMMER_Z + 0.006], [RAIL.top, HAMMER_Y + 0.004], HALF.flange),
    slab([wippenZ - 0.005, wippenZ + 0.005], [wippenY - 0.005, RAIL.bottom], HALF.flange),
    slab([damperZ, railBack], [damperY - 0.006, damperY + 0.006], HALF.flange),
    slab([HAMMER_Z + 0.021, HAMMER_Z + 0.033], [0.788, 0.795], HALF.flange, ROUND.fine),
    slab([HAMMER_Z + 0.017, HAMMER_Z + 0.04], [0.795, 0.808], HALF.rail),
    planarRod([0.845, HAMMER_Z - 0.0075], [0.882, HAMMER_Z - 0.0075], RADIUS.wire),
  ];
}

function keyParts(): BufferGeometry[] {
  return [
    slab([KEY_BACK, UPRIGHT.offsetZ], [KEY_BOTTOM, KEY.top], HALF.key, ROUND.soft),
    planarRod([KEY.top, CAPSTAN.z], [CAPSTAN.top, CAPSTAN.z], RADIUS.capstan),
  ];
}

function wippenParts(): BufferGeometry[] {
  const wippenZ = PIVOT.wippen[1];
  return [
    slab([wippenZ - 0.008, HAMMER_Z + 0.095], [CAPSTAN.top, WIPPEN_TOP], HALF.wippen, ROUND.soft),
    planarRod([WIPPEN_TOP, HAMMER_Z + 0.09], [0.852, HAMMER_Z + 0.08], RADIUS.wire),
    slab([HAMMER_Z + 0.07, HAMMER_Z + 0.08], [0.848, 0.874], HALF.felt, ROUND.soft),
    planarRod([WIPPEN_TOP, STRAP.wire[1]], STRAP.wire, RADIUS.wire),
    planarRod([WIPPEN_TOP, wippenZ - 0.007], [0.802, PIVOT.damper[1] + 0.0055], RADIUS.stem),
  ];
}

function jackParts(): BufferGeometry[] {
  const jackZ = PIVOT.jack[1];
  const half = HALF.flange - ROUND.fine;
  return [
    slab([jackZ - 0.004, jackZ + 0.004], [WIPPEN_TOP, HAMMER_Y - 0.0115], half, ROUND.fine),
    slab([jackZ + 0.004, jackZ + 0.02], [0.776, 0.783], half, ROUND.fine),
  ];
}

function headParts(): BufferGeometry[] {
  const crown = CROWN_Z;
  const felt = unitFelt(false).rotateX(-QUARTER_TURN);
  const moulding = unitMoulding(false).rotateX(-QUARTER_TURN);
  return [
    felt.scale(HEAD.width, HEAD.height, HEAD.felt).translate(0, HEAD_Y, crown + HEAD.felt),
    moulding
      .scale(HEAD.width * MOULDING_SHARE, HEAD.height, HEAD.moulding)
      .translate(0, HEAD_Y, crown + HEAD.felt + HEAD.moulding),
  ];
}

function hammerParts(): BufferGeometry[] {
  return [
    slab(
      [HAMMER_Z - 0.006, HAMMER_Z + 0.024],
      [HAMMER_Y - 0.008, HAMMER_Y + 0.024],
      0.006,
      ROUND.butt,
    ),
    slab([HAMMER_Z + 0.005, HAMMER_Z + 0.018], [HAMMER_Y - 0.0115, HAMMER_Y - 0.008], HALF.felt),
    planarRod([HAMMER_Y + 0.024, HAMMER_Z], [HEAD_Y - HEAD.height / 2, HAMMER_Z], RADIUS.shank),
    planarRod(
      [HAMMER_Y + 0.014, HAMMER_Z + 0.024],
      [HAMMER_Y + 0.014, HAMMER_Z + 0.05],
      RADIUS.stem,
    ),
    slab(
      [HAMMER_Z + 0.05, HAMMER_Z + 0.062],
      [HAMMER_Y + 0.004, HAMMER_Y + 0.026],
      HALF.felt,
      ROUND.soft,
    ),
    ...headParts(),
  ];
}

function damperParts(): BufferGeometry[] {
  const damperZ = PIVOT.damper[1];
  const front = UPRIGHT.stringZ + RADIUS.string;
  const back = front + DAMPER_HEAD.felt;
  return [
    slab(
      [damperZ - 0.004, damperZ + 0.004],
      [0.795, DAMPER_HEAD.y[1] - 0.01],
      HALF.flange,
      ROUND.fine,
    ),
    slab([back, back + DAMPER_HEAD.block], DAMPER_HEAD.y, HALF.felt, ROUND.soft),
    slab([front, back], [DAMPER_HEAD.y[0] + 0.002, DAMPER_HEAD.y[1] - 0.002], HALF.felt),
  ];
}

export function buildUpright(context: PartContext): UprightGhost {
  const root = namedGroup('uprightGhost');
  ghostMesh(context, GROUP, root, fixedParts());
  const key = frame(root, 'uprightKey', PIVOT.key);
  const wippen = frame(root, 'uprightWippen', PIVOT.wippen);
  const jack = frame(wippen.body, 'uprightJack', PIVOT.jack);
  const hammer = frame(root, 'uprightHammer', PIVOT.hammer);
  const rail = frame(root, 'uprightRail', PIVOT.hammer);
  const damper = frame(root, 'uprightDamper', PIVOT.damper);
  ghostMesh(context, GROUP, key.body, keyParts());
  ghostMesh(context, GROUP, wippen.body, wippenParts());
  ghostMesh(context, GROUP, jack.body, jackParts());
  ghostMesh(context, GROUP, hammer.body, hammerParts());
  ghostMesh(context, GROUP, rail.body, [
    slab([HAMMER_Z + 0.003, HAMMER_Z + 0.016], [0.905, 0.922], HALF.rail, ROUND.soft),
  ]);
  ghostMesh(context, GROUP, damper.body, damperParts());
  const strap = partMesh(context, unitRod(), GROUP, FINISHES.ghost);
  root.add(strap);
  label(context, 'upright', hammer.body, [0, HEAD_Y, CROWN_Z + HEAD.felt / 2]);

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
      applyMatrix(strap, segmentMatrix([0, ...catcher], [0, ...wire], RADIUS.wire));
    },
  };
}
