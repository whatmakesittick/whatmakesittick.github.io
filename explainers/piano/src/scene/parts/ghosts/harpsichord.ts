import { CylinderGeometry, Group } from 'three';
import type { BufferAttribute, BufferGeometry, Object3D } from 'three';
import type { CompareId, HarpsichordPose } from '../../../ids';
import { HARPSICHORD, KEY, KEY_DIP_MM, HARPSICHORD_JACK_RATIO, mm } from '../../../model';
import { pivotFrame } from '../action/meshes';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { QUARTER_TURN } from '../keyboard/geometry';
import {
  DAMPER_BOTTOM,
  HARPSICHORD_KEY_BACK,
  JACK,
  KEY_PIVOT,
  PLECTRUM,
  REGISTER_REACH,
  STRING,
  harpsichordKeyAngle,
  plectrumAngle,
  ringPhase,
  stringLift,
  stringPoint,
} from './harpsichordLayout';
import { LabelSet } from './labelSet';
import { ghostPainter } from './paint';
import { rod, slab } from './shapes';
import type { Span } from './shapes';

const GROUP = 'harpsichord';
const HALF = { key: KEY.whiteWidth / 2, rail: 0.03, plectrum: 0.0015 } as const;
const ROUND = { soft: 0.002, fine: 0.001 } as const;
const REGISTER = { y: [0.758, 0.768], slot: JACK.halfThickness + 0.001 } as const;
const RAIL_GAP = 0.002;
const LABEL_BELOW_REGISTER = 0.02;
const RAIL = { height: 0.018, felt: 0.005, reach: 0.03 } as const;
const TONGUE = {
  below: 0.024,
  above: 0.008,
  proud: 0.0015,
  inset: 0.0015,
  half: 0.0045,
  axle: 0.02,
  axleRadius: 0.0012,
} as const;
const FELT = { pad: 0.004, height: 0.008, arm: 0.003, half: 0.0045, grip: 0.002 } as const;
const BALANCE_RAIL = { half: 0.008, depth: 0.014 } as const;
const NUT = { half: 0.003, depth: 0.014, side: 0.006 } as const;
const STRING_SIDES = 8;
const LABEL = { jack: 0.022, tongue: 0.018, stringShare: 0.75 } as const;

export interface HarpsichordGhost {
  readonly root: Object3D;
  pose(pose: HarpsichordPose, elapsed: number): void;
  choose(chosen: CompareId): void;
}

function around(centre: number, half: number): Span {
  return [centre - half, centre + half];
}

function railBottom(): number {
  return JACK.top + mm(KEY_DIP_MM * HARPSICHORD_JACK_RATIO) + RAIL_GAP;
}

function frameParts(): BufferGeometry[] {
  return [
    slab(
      around(KEY_PIVOT[1], BALANCE_RAIL.half),
      [KEY_PIVOT[0] - BALANCE_RAIL.depth, KEY_PIVOT[0]],
      HALF.rail,
    ),
    slab([JACK.z - REGISTER_REACH, JACK.z - REGISTER.slot], REGISTER.y, HALF.rail, ROUND.fine),
    slab([JACK.z + REGISTER.slot, JACK.z + REGISTER_REACH], REGISTER.y, HALF.rail, ROUND.fine),
    slab(
      around(JACK.z, RAIL.reach),
      [railBottom() + RAIL.felt, railBottom() + RAIL.height],
      HALF.rail,
      ROUND.soft,
    ),
    nut(),
  ];
}

function nut(): BufferGeometry {
  const [x, y, z] = stringPoint(STRING.reach[1]);
  return slab(around(z, NUT.half), [y - NUT.depth, y - STRING.radius], NUT.side, ROUND.fine, x);
}

function frameFelt(): BufferGeometry[] {
  return [slab(around(JACK.z, RAIL.reach), [railBottom(), railBottom() + RAIL.felt], HALF.rail)];
}

function jackParts(): BufferGeometry[] {
  return [
    slab(around(JACK.z, JACK.halfThickness), [JACK.bottom, JACK.top], JACK.halfWidth, ROUND.fine),
  ];
}

function tongueParts(): BufferGeometry[] {
  const axleY = PLECTRUM.y - TONGUE.axle;
  return [
    slab(
      [JACK.z - JACK.halfThickness + TONGUE.inset, JACK.z + JACK.halfThickness + TONGUE.proud],
      [PLECTRUM.y - TONGUE.below, PLECTRUM.y + TONGUE.above],
      TONGUE.half,
      ROUND.fine,
    ),
    rod([-JACK.halfWidth, axleY, JACK.z], [JACK.halfWidth, axleY, JACK.z], TONGUE.axleRadius),
  ];
}

function damperArm(): BufferGeometry {
  const top = DAMPER_BOTTOM + FELT.height;
  return slab(
    [JACK.z + JACK.halfThickness - FELT.grip, STRING.z + FELT.pad],
    [top, top + FELT.arm],
    FELT.half,
    ROUND.fine,
  );
}

function damperFelt(): BufferGeometry[] {
  return [
    slab(
      around(STRING.z, FELT.pad),
      [DAMPER_BOTTOM, DAMPER_BOTTOM + FELT.height],
      FELT.half,
      ROUND.fine,
    ),
  ];
}

function plectrumParts(): BufferGeometry[] {
  return [slab([0, PLECTRUM.tipZ - PLECTRUM.rootZ], around(0, PLECTRUM.half), HALF.plectrum)];
}

function stringGeometry(): BufferGeometry {
  const [near, far] = STRING.reach;
  return new CylinderGeometry(
    STRING.radius,
    STRING.radius,
    far - near,
    STRING_SIDES,
    STRING.segments,
  )
    .rotateZ(-QUARTER_TURN)
    .translate((near + far) / 2, 0, 0)
    .rotateY(-STRING.angle)
    .translate(0, HARPSICHORD.stringY, STRING.z);
}

class VibratingString {
  private readonly base: Float32Array;
  private readonly position: BufferAttribute;

  constructor(geometry: BufferGeometry) {
    this.position = geometry.getAttribute('position') as BufferAttribute;
    this.base = Float32Array.from(this.position.array);
  }

  draw(pose: HarpsichordPose, phase: number): void {
    const [near, far] = STRING.reach;
    const cos = Math.cos(STRING.angle);
    for (let vertex = 0; vertex < this.position.count; vertex += 1) {
      const along = this.position.getX(vertex) / cos;
      const share = (along - near) / (far - near);
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
  const overview = new LabelSet(context);
  const details = new LabelSet(context);
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
  painter.solid(jack, [...jackParts(), damperArm()]);
  painter.solid(jack, tongueParts());
  painter.solid(jack, damperFelt(), 'felt');
  const plectrum = new Group();
  plectrum.position.set(0, PLECTRUM.y, PLECTRUM.rootZ);
  jack.add(plectrum);
  painter.solid(plectrum, plectrumParts());
  const stringMesh = painter.body(root, stringGeometry(), 'string');
  stringMesh.name = 'harpsichordString';
  const string = new VibratingString(stringMesh.geometry);
  overview.add('harpsichord', jack, [0, REGISTER.y[0] - LABEL_BELOW_REGISTER, JACK.z]);
  details.add('harpsichordJack', jack, [0, JACK.bottom + LABEL.jack, JACK.z]);
  details.add('tongue', jack, [0, PLECTRUM.y - LABEL.tongue, JACK.z]);
  details.add('plectrum', plectrum, [0, 0, (PLECTRUM.tipZ - PLECTRUM.rootZ) / 2]);
  details.add('harpsichordDamper', jack, [
    0,
    DAMPER_BOTTOM + FELT.height + FELT.arm,
    STRING.z + FELT.pad,
  ]);
  details.add('harpsichordString', root, stringPoint(STRING.reach[1] * LABEL.stringShare));

  return {
    root,
    pose(pose, elapsed) {
      key.pivot.rotation.x = harpsichordKeyAngle(pose.keyMm);
      jack.position.y = mm(pose.jackRiseMm);
      plectrum.rotation.x = plectrumAngle(pose.plectrumBend);
      string.draw(pose, ringPhase(elapsed));
    },
    choose(chosen) {
      const own = chosen === 'harpsichord';
      painter.choose(own);
      details.show(own);
      overview.show(chosen === 'grand');
    },
  };
}
