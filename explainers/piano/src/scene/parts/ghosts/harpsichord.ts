import { CylinderGeometry, Group } from 'three';
import type { BufferAttribute, BufferGeometry, Object3D } from 'three';
import type { HarpsichordPose } from '../../../ids';
import { HARPSICHORD, KEY, KEY_DIP_MM, HARPSICHORD_JACK_RATIO, mm } from '../../../model';
import { FINISHES } from '../../finishes';
import { pivotFrame } from '../action/meshes';
import { label, namedGroup, partMesh } from '../context';
import type { PartContext } from '../context';
import { QUARTER_TURN } from '../keyboard/geometry';
import { ghostMesh, slab } from './shapes';
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
const HALF = { key: KEY.whiteWidth / 2, rail: 0.012, block: 0.004, tongue: 0.003 } as const;
const ROUND = { soft: 0.002, fine: 0.001 } as const;
const REGISTER = { y: [0.776, 0.782], reach: 0.025, slot: 0.0075 } as const;
const RAIL_GAP = 0.002;
const RAIL_HEIGHT = 0.016;
const TONGUE = { below: 0.022, above: 0.006, half: 0.004 } as const;
const FELT = { height: 0.01, half: 0.0045 } as const;
const PLECTRUM_HALF_DEPTH = 0.0012;
const PLECTRUM_HALF_REACH = (PLECTRUM.tipX - PLECTRUM.rootX) / 2;
const STRING_SIDES = 6;
const END_BLOCK = { half: 0.004, drop: 0.014 } as const;

export interface HarpsichordGhost {
  readonly root: Object3D;
  pose(pose: HarpsichordPose, elapsed: number): void;
}

function around(centre: number, half: number): Span {
  return [centre - half, centre + half];
}

function fixedParts(): BufferGeometry[] {
  const railBottom = JACK.top + mm(KEY_DIP_MM * HARPSICHORD_JACK_RATIO) + RAIL_GAP;
  const stringBase: Span = [
    HARPSICHORD.stringY - END_BLOCK.drop,
    HARPSICHORD.stringY - STRING.radius,
  ];
  return [
    slab(around(KEY_PIVOT[1], 0.008), [KEY_PIVOT[0] - 0.014, KEY_PIVOT[0]], HALF.rail),
    slab([JACK.z - REGISTER.reach, JACK.z - REGISTER.slot], REGISTER.y, HALF.rail),
    slab([JACK.z + REGISTER.slot, JACK.z + REGISTER.reach], REGISTER.y, HALF.rail),
    slab(
      around(JACK.z, REGISTER.reach),
      [railBottom, railBottom + RAIL_HEIGHT],
      HALF.rail,
      ROUND.soft,
    ),
    slab(around(STRING.front, END_BLOCK.half), stringBase, HALF.block, ROUND.fine, STRING.x),
    slab(around(STRING.back, END_BLOCK.half), stringBase, HALF.block, ROUND.fine, STRING.x),
  ];
}

function jackParts(): BufferGeometry[] {
  return [
    slab(around(JACK.z, JACK.halfDepth), [JACK.bottom, JACK.top], JACK.halfWidth, ROUND.fine),
    slab(
      around(JACK.z, TONGUE.half),
      [PLECTRUM.y - TONGUE.below, PLECTRUM.y + TONGUE.above],
      HALF.tongue,
      ROUND.fine,
    ),
    slab(
      around(JACK.z, FELT.half),
      [DAMPER_BOTTOM, DAMPER_BOTTOM + FELT.height],
      FELT.half,
      ROUND.fine,
      STRING.x - 0.0005,
    ),
  ];
}

class VibratingString {
  readonly geometry: BufferGeometry;
  private readonly base: Float32Array;
  private readonly position: BufferAttribute;

  constructor() {
    const length = STRING.front - STRING.back;
    this.geometry = new CylinderGeometry(
      STRING.radius,
      STRING.radius,
      length,
      STRING_SIDES,
      STRING.segments,
      true,
    )
      .rotateX(QUARTER_TURN)
      .translate(STRING.x, HARPSICHORD.stringY, (STRING.front + STRING.back) / 2);
    this.position = this.geometry.getAttribute('position') as BufferAttribute;
    this.base = Float32Array.from(this.position.array);
  }

  draw(pose: HarpsichordPose, phase: number): void {
    const length = STRING.front - STRING.back;
    for (let vertex = 0; vertex < this.position.count; vertex += 1) {
      const share = (this.position.getZ(vertex) - STRING.back) / length;
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
  ghostMesh(context, GROUP, root, fixedParts());
  const key = pivotFrame(root, 'harpsichordKey', ...KEY_PIVOT);
  ghostMesh(context, GROUP, key.body, [
    slab(
      [HARPSICHORD_KEY_BACK, HARPSICHORD.offsetZ],
      [KEY_PIVOT[0], KEY.top],
      HALF.key,
      ROUND.soft,
    ),
  ]);
  const jack = namedGroup('harpsichordJack', root);
  ghostMesh(context, GROUP, jack, jackParts());
  const plectrum = new Group();
  plectrum.position.set(PLECTRUM.rootX, PLECTRUM.y, JACK.z);
  jack.add(plectrum);
  ghostMesh(context, GROUP, plectrum, [
    slab(
      around(0, PLECTRUM_HALF_DEPTH),
      around(0, PLECTRUM.half),
      PLECTRUM_HALF_REACH,
      0,
      PLECTRUM_HALF_REACH,
    ),
  ]);
  const string = new VibratingString();
  root.add(partMesh(context, string.geometry, GROUP, FINISHES.ghost));
  label(context, 'harpsichord', jack, [0, JACK.top, JACK.z]);

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
