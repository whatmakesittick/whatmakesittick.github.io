import { Group, LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry, ColorRepresentation, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import { SEABED_Y } from '../../../model/scale';
import { ANCHOR_LIFT, BOP, SEGMENTS, WELLHEAD } from '../../constants';
import { PAINT } from '../../finishes';
import { barGeometry, rodGeometry } from '../../geometry/bars';
import type { Point } from '../../geometry/bars';
import { mergePainted } from '../../geometry/merge';
import { partMesh } from '../context';
import type { PartContext } from '../context';

type Painted = readonly [BufferGeometry, ColorRepresentation];

export const WELLHEAD_TOP =
  SEABED_Y + WELLHEAD.base.height + WELLHEAD.low.height + WELLHEAD.high.height;

const RAM_STACK = BOP.ram.count * BOP.ram.height + (BOP.ram.count - 1) * BOP.ram.gap;
const LOWER_STACK_TOP = WELLHEAD_TOP + BOP.connector.height + RAM_STACK + BOP.annular.height;
const LMRP_TOP =
  LOWER_STACK_TOP + BOP.lmrpConnector.height + BOP.annular.height + BOP.flexJoint.height;

export const BOP_TOP = LMRP_TOP + BOP.adapter.height;

const SPOOL_SHARE = 0.72;
const DOME_STEPS = 6;
const FRAME_LEVELS = 3;
const BOTTLES_PER_SIDE = 4;
const BOTTLE_SPREAD = 3.2;
const BOTTLE_LIFT = 1;
const POD_OFFSET = 1.2;
const LMRP_FRAME_SHARE = 0.8;
const FLEX_BULGE = 1.18;
const FLEX_NECK = 0.8;
const PODS = [
  { color: PAINT.podBlue, side: -1 },
  { color: PAINT.safetyYellow, side: 1 },
] as const;

function rod(bottom: number, top: number, radius: number, color: ColorRepresentation): Painted {
  return [rodGeometry([0, bottom, 0], [0, top, 0], radius, SEGMENTS.tube), color];
}

function annular(bottom: number): Painted {
  const { radius, height, dome } = BOP.annular;
  const wall = height - dome;
  const points = [
    new Vector2(0, bottom),
    new Vector2(radius, bottom),
    new Vector2(radius, bottom + wall),
  ];
  for (let step = 1; step <= DOME_STEPS; step++) {
    const angle = (step / DOME_STEPS) * (Math.PI / 2);
    points.push(new Vector2(radius * Math.cos(angle), bottom + wall + dome * Math.sin(angle)));
  }
  return [new LatheGeometry(points, SEGMENTS.tube), PAINT.bopYellow];
}

function ram(bottom: number): Painted[] {
  const { half, height } = BOP.ram;
  const middle = bottom + height / 2;
  const body: Painted = [
    box({ minX: -half, maxX: half, minY: bottom, maxY: bottom + height, minZ: -half, maxZ: half }),
    PAINT.bopYellow,
  ];
  const bonnets = [-1, 1].flatMap((side): Painted[] => {
    const start: Point = [side * half, middle, 0];
    const end: Point = [side * (half + BOP.bonnet.length), middle, 0];
    const cap: Point = [side * (half + BOP.bonnet.length + BOP.operator.length), middle, 0];
    return [
      [rodGeometry(start, end, BOP.bonnet.radius, SEGMENTS.halfTube), PAINT.bopYellow],
      [rodGeometry(end, cap, BOP.operator.radius, SEGMENTS.halfTube), PAINT.darkSteel],
    ];
  });
  return [body, ...bonnets];
}

function rams(bottom: number): Painted[] {
  const { count, height, gap } = BOP.ram;
  return Array.from({ length: count }, (_, index): Painted[] => {
    const at = bottom + index * (height + gap);
    const spool =
      index > 0 ? [rod(at - gap, at, BOP.connector.radius * SPOOL_SHARE, PAINT.darkSteel)] : [];
    return [...spool, ...ram(at)];
  }).flat();
}

function flexJoint(bottom: number): Painted {
  const { radius, height } = BOP.flexJoint;
  const points = [
    new Vector2(0, bottom),
    new Vector2(radius * FLEX_NECK, bottom),
    new Vector2(radius * FLEX_BULGE, bottom + height / 2),
    new Vector2(radius * FLEX_NECK, bottom + height),
    new Vector2(0, bottom + height),
  ];
  return [new LatheGeometry(points, SEGMENTS.tube), PAINT.darkSteel];
}

function frame(bottom: number, top: number, half: number): Painted[] {
  const { post, rail } = BOP.frame;
  const corners: Point[] = [
    [half, 0, half],
    [-half, 0, half],
    [-half, 0, -half],
    [half, 0, -half],
  ];
  const posts = corners.map(([x, , z]): Painted => [
    barGeometry([x, bottom, z], [x, top, z], post),
    PAINT.darkSteel,
  ]);
  const rails = Array.from(
    { length: FRAME_LEVELS },
    (_, level) => bottom + ((top - bottom) * (level + 0.5)) / FRAME_LEVELS,
  ).flatMap((y) =>
    corners.map(([x, , z], index): Painted => {
      const [nx, , nz] = corners[(index + 1) % corners.length];
      return [barGeometry([x, y, z], [nx, y, nz], rail), PAINT.darkSteel];
    }),
  );
  return [...posts, ...rails];
}

function bottles(bottom: number): Painted[] {
  const { radius, height } = BOP.bottle;
  return [-1, 1].flatMap((side) =>
    Array.from({ length: BOTTLES_PER_SIDE }, (_, index): Painted => {
      const x = -BOTTLE_SPREAD + (index * 2 * BOTTLE_SPREAD) / (BOTTLES_PER_SIDE - 1);
      const z = side * (BOP.frame.half - radius);
      return [
        rodGeometry([x, bottom, z], [x, bottom + height, z], radius, SEGMENTS.pipe),
        PAINT.bottle,
      ];
    }),
  );
}

function pods(bottom: number): Painted[] {
  const { width, height, depth } = BOP.pod;
  const x = BOP.frame.half * LMRP_FRAME_SHARE + POD_OFFSET;
  return PODS.map(({ color, side }): Painted => [
    box({
      minX: side * x - width / 2,
      maxX: side * x + width / 2,
      minY: bottom,
      maxY: bottom + height,
      minZ: -depth / 2,
      maxZ: depth / 2,
    }),
    color,
  ]);
}

function stackGeometry(): BufferGeometry {
  let y = WELLHEAD_TOP;
  const parts: Painted[] = [
    rod(y, y + BOP.connector.height, BOP.connector.radius, PAINT.darkSteel),
  ];
  y += BOP.connector.height;
  parts.push(...rams(y), ...bottles(WELLHEAD_TOP + BOTTLE_LIFT));
  y += RAM_STACK;
  parts.push(annular(y));
  y += BOP.annular.height;
  parts.push(...frame(WELLHEAD_TOP, y, BOP.frame.half));
  const lmrpBottom = y;
  parts.push(rod(y, y + BOP.lmrpConnector.height, BOP.lmrpConnector.radius, PAINT.darkSteel));
  y += BOP.lmrpConnector.height;
  parts.push(annular(y), ...pods(y));
  y += BOP.annular.height;
  parts.push(...frame(lmrpBottom, y, BOP.frame.half * LMRP_FRAME_SHARE), flexJoint(y));
  y += BOP.flexJoint.height;
  parts.push(rod(y, y + BOP.adapter.height, BOP.adapter.radius, PAINT.steel));
  return mergePainted(parts);
}

function wellheadGeometry(high: boolean): BufferGeometry {
  const { base, low } = WELLHEAD;
  const lowBottom = SEABED_Y + base.height;
  const lowTop = lowBottom + low.height;
  if (high) return mergePainted([rod(lowTop, WELLHEAD_TOP, WELLHEAD.high.radius, PAINT.steel)]);
  return mergePainted([
    [
      box({
        minX: -base.half,
        maxX: base.half,
        minY: SEABED_Y,
        maxY: lowBottom,
        minZ: -base.half,
        maxZ: base.half,
      }),
      PAINT.darkSteel,
    ],
    rod(lowBottom, lowTop, low.radius, PAINT.trim),
  ]);
}

export class WellheadPart {
  readonly object = new Group();
  readonly anchor: Object3D;
  private readonly low = new Group();
  private readonly high = new Group();

  constructor(context: PartContext) {
    this.low.add(partMesh(context, wellheadGeometry(false), 'wellhead', 'wellhead'));
    this.high.add(partMesh(context, wellheadGeometry(true), 'wellhead', 'wellhead'));
    this.object.add(this.low, this.high);
    const labelY = SEABED_Y + WELLHEAD.base.height + WELLHEAD.low.height / 2;
    this.anchor = anchorAt(this.low, 0, labelY, WELLHEAD.low.radius + ANCHOR_LIFT);
  }

  show(low: boolean, high: boolean): void {
    this.low.visible = low;
    this.high.visible = high;
  }
}

export class BopPart {
  readonly object = new Group();
  readonly anchor: Object3D;

  constructor(context: PartContext) {
    this.object.add(partMesh(context, stackGeometry(), 'bop', 'bop'));
    const middle = WELLHEAD_TOP + BOP.connector.height + RAM_STACK / 2;
    this.anchor = anchorAt(this.object, 0, middle, BOP.ram.half + ANCHOR_LIFT);
  }
}
