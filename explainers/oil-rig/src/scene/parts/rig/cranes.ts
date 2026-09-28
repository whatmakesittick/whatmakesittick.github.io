import { Group, Matrix4 } from 'three';
import type { BufferGeometry, ColorRepresentation, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { CRANE, CRANES, HULL, SEGMENTS } from '../../constants';
import type { CraneSpec } from '../../constants';
import { PAINT } from '../../finishes';
import { barGeometry, rodGeometry } from '../../geometry/bars';
import type { Point } from '../../geometry/bars';
import { merge, mergePainted } from '../../geometry/merge';
import { partMesh } from '../context';
import type { PartContext } from '../context';

type Painted = readonly [BufferGeometry, ColorRepresentation];

export interface CranesPart {
  object: Group;
  anchor: Object3D;
}

const PIVOT = { back: 1.2, lift: 1.4 } as const;
const CAB = { width: 1.6, height: 1.5, inset: 0.1 } as const;
const HOOK = { size: 0.9, wire: 0.05 } as const;
const CYLINDER_BASE = 0.35;
const CYLINDER_REACH = 0.4;
const LABEL_SHARE = 0.55;

interface Boom {
  pivot: Point;
  knuckle: Point;
  tip: Point;
}

function boomPoints(): Boom {
  const base = HULL.deck.top + CRANE.pedestal.height + CRANE.slew.height;
  const pivot: Point = [PIVOT.back, base + PIVOT.lift, 0];
  const { boom, jib } = CRANE;
  const knuckle: Point = [
    pivot[0] + boom.length * Math.cos(boom.pitch),
    pivot[1] + boom.length * Math.sin(boom.pitch),
    0,
  ];
  const tip: Point = [
    knuckle[0] + jib.length * Math.cos(jib.pitch),
    knuckle[1] + jib.length * Math.sin(jib.pitch),
    0,
  ];
  return { pivot, knuckle, tip };
}

function base(): Painted[] {
  const deck = HULL.deck.top;
  const { pedestal, slew, house } = CRANE;
  const slewBottom = deck + pedestal.height;
  const houseBottom = slewBottom + slew.height;
  return [
    [rodGeometry([0, deck, 0], [0, slewBottom, 0], pedestal.radius, SEGMENTS.halfTube), PAINT.trim],
    [
      rodGeometry([0, slewBottom, 0], [0, houseBottom, 0], slew.radius, SEGMENTS.halfTube),
      PAINT.darkSteel,
    ],
    [
      box({
        minX: -house.length / 2,
        maxX: house.length / 2,
        minY: houseBottom,
        maxY: houseBottom + house.height,
        minZ: -house.width / 2,
        maxZ: house.width / 2,
      }),
      PAINT.craneYellow,
    ],
    [
      box({
        minX: house.length / 2 - CAB.width,
        maxX: house.length / 2 + CAB.inset,
        minY: houseBottom + house.height - CAB.height,
        maxY: houseBottom + house.height - CAB.inset,
        minZ: house.width / 2 - CAB.width,
        maxZ: house.width / 2 + CAB.inset,
      }),
      PAINT.glass,
    ],
  ];
}

function arms(): Painted[] {
  const { pivot, knuckle, tip } = boomPoints();
  const boomMiddle: Point = [(pivot[0] + knuckle[0]) / 2, (pivot[1] + knuckle[1]) / 2, 0];
  const cylinderFoot: Point = [CYLINDER_BASE, pivot[1] - PIVOT.lift, 0];
  const hookTop: Point = [tip[0], tip[1] - CRANE.hookDrop, 0];
  return [
    [barGeometry(pivot, knuckle, CRANE.boom.width), PAINT.craneYellow],
    [barGeometry(knuckle, tip, CRANE.jib.width), PAINT.craneYellow],
    [rodGeometry(cylinderFoot, boomMiddle, CRANE.cylinderRadius, SEGMENTS.rod), PAINT.steel],
    [
      rodGeometry(
        boomMiddle,
        [knuckle[0] - CYLINDER_REACH, knuckle[1] + CYLINDER_REACH, 0],
        CRANE.cylinderRadius,
        SEGMENTS.rod,
      ),
      PAINT.steel,
    ],
    [rodGeometry(tip, hookTop, HOOK.wire, SEGMENTS.wire), PAINT.black],
    [
      box({
        minX: hookTop[0] - HOOK.size / 2,
        maxX: hookTop[0] + HOOK.size / 2,
        minY: hookTop[1] - HOOK.size,
        maxY: hookTop[1],
        minZ: -HOOK.size / 2,
        maxZ: HOOK.size / 2,
      }),
      PAINT.safetyYellow,
    ],
  ];
}

function craneGeometry(spec: CraneSpec): BufferGeometry {
  const placement = new Matrix4().makeRotationY(spec.heading).setPosition(spec.x, 0, spec.z);
  return mergePainted([...base(), ...arms()]).applyMatrix4(placement);
}

export function createCranes(context: PartContext): CranesPart {
  const object = new Group();
  const labelled = CRANES.filter((spec) => spec.labelled);
  const others = CRANES.filter((spec) => !spec.labelled);
  object.add(partMesh(context, merge(labelled.map(craneGeometry)), 'crane', 'crane'));
  if (others.length > 0) {
    object.add(partMesh(context, merge(others.map(craneGeometry)), STRUCTURE_GROUP, 'crane'));
  }
  const [main] = labelled;
  const { pivot, knuckle } = boomPoints();
  const reach = pivot[0] + (knuckle[0] - pivot[0]) * LABEL_SHARE;
  const anchor = anchorAt(
    object,
    main.x + reach * Math.cos(main.heading),
    pivot[1] + (knuckle[1] - pivot[1]) * LABEL_SHARE,
    main.z - reach * Math.sin(main.heading),
  );
  return { object, anchor };
}
