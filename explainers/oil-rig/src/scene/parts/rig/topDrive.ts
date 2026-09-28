import { Group } from 'three';
import type { BufferGeometry, ColorRepresentation, Mesh, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import { DERRICK, DERRICK_TOP, SEGMENTS, TOP_DRIVE } from '../../constants';
import { PAINT } from '../../finishes';
import { barGeometry, rodGeometry } from '../../geometry/bars';
import { merge, mergePainted } from '../../geometry/merge';
import { partMesh } from '../context';
import type { PartContext } from '../context';

type Painted = readonly [BufferGeometry, ColorRepresentation];

const QUILL = { radius: 0.36, height: 0.8 } as const;
const LINK = { offset: 0.72, width: 0.16, elevator: 0.95, elevatorHeight: 0.4 } as const;
const SWIVEL_RADIUS = 0.6;
const GOOSENECK = { radius: 0.2, reach: 1.1, rise: 0.9 } as const;
const BLOWER = { radius: 0.55, height: 0.7 } as const;
const DOLLY = { width: 0.35, wheel: 0.5 } as const;
const BLOCK_BANDS = 3;
const BAND_HEIGHT = 0.18;
const LINE_SPREAD = 0.28;

const GEAR_TOP = QUILL.height + TOP_DRIVE.gearHeight;
const MOTOR_TOP = GEAR_TOP + TOP_DRIVE.motorHeight;
const SWIVEL_TOP = MOTOR_TOP + TOP_DRIVE.swivelHeight;
const BLOCK_BOTTOM = SWIVEL_TOP + TOP_DRIVE.blockGap;
const BLOCK_TOP = BLOCK_BOTTOM + TOP_DRIVE.blockHeight;
const CROWN_Y = DERRICK_TOP;

function centredBox(width: number, depth: number, bottom: number, top: number): BufferGeometry {
  return box({
    minX: -width / 2,
    maxX: width / 2,
    minY: bottom,
    maxY: top,
    minZ: -depth / 2,
    maxZ: depth / 2,
  });
}

function driveBody(): Painted[] {
  const { width, depth } = TOP_DRIVE;
  const blowerTop = MOTOR_TOP + BLOWER.height;
  return [
    [rodGeometry([0, 0, 0], [0, QUILL.height, 0], QUILL.radius, SEGMENTS.round), PAINT.steel],
    [centredBox(width, depth, QUILL.height, GEAR_TOP), PAINT.darkSteel],
    [centredBox(width * 0.9, depth * 0.9, GEAR_TOP, MOTOR_TOP), PAINT.topDrive],
    [
      rodGeometry([0, MOTOR_TOP, 0], [0, SWIVEL_TOP, 0], SWIVEL_RADIUS, SEGMENTS.round),
      PAINT.darkSteel,
    ],
    [
      rodGeometry(
        [-width / 3, MOTOR_TOP, 0],
        [-width / 3, blowerTop, 0],
        BLOWER.radius,
        SEGMENTS.pipe,
      ),
      PAINT.trim,
    ],
    [
      barGeometry(
        [0, SWIVEL_TOP - GOOSENECK.rise, 0],
        [-GOOSENECK.reach, SWIVEL_TOP, 0],
        GOOSENECK.radius * 2,
      ),
      PAINT.steel,
    ],
  ];
}

function links(): Painted[] {
  const bottom = -TOP_DRIVE.linkLength;
  const bails = [-1, 1].map((side): Painted => [
    barGeometry([side * LINK.offset, QUILL.height, 0], [side * LINK.offset, bottom, 0], LINK.width),
    PAINT.steel,
  ]);
  const elevator = centredBox(
    LINK.elevator * 2,
    LINK.elevator,
    bottom - LINK.elevatorHeight,
    bottom,
  );
  return [...bails, [elevator, PAINT.darkSteel]];
}

function dolly(): Painted[] {
  const { x, halfGap } = DERRICK.rails;
  const frame = box({
    minX: TOP_DRIVE.width / 2 - DOLLY.width,
    maxX: x - DERRICK.rails.size / 2,
    minY: QUILL.height,
    maxY: MOTOR_TOP,
    minZ: -halfGap,
    maxZ: halfGap,
  });
  const wheels = [-1, 1].flatMap((side) =>
    [QUILL.height, MOTOR_TOP - DOLLY.wheel].map((y): Painted => [
      box({
        minX: x - DOLLY.wheel / 2,
        maxX: x + DOLLY.wheel / 2,
        minY: y,
        maxY: y + DOLLY.wheel,
        minZ: side * halfGap - DOLLY.wheel / 2,
        maxZ: side * halfGap + DOLLY.wheel / 2,
      }),
      PAINT.black,
    ]),
  );
  return [[frame, PAINT.darkSteel], ...wheels];
}

function travellingBlock(): Painted[] {
  const { blockWidth } = TOP_DRIVE;
  const depth = blockWidth / 2;
  const body: Painted = [
    centredBox(blockWidth, depth, BLOCK_BOTTOM, BLOCK_TOP),
    PAINT.safetyYellow,
  ];
  const hook: Painted = [
    rodGeometry([0, SWIVEL_TOP, 0], [0, BLOCK_BOTTOM, 0], SWIVEL_RADIUS / 2, SEGMENTS.rod),
    PAINT.darkSteel,
  ];
  const bands = Array.from({ length: BLOCK_BANDS }, (_, index): Painted => {
    const y = BLOCK_BOTTOM + ((index + 1) * TOP_DRIVE.blockHeight) / (BLOCK_BANDS + 1);
    return [centredBox(blockWidth * 1.02, depth * 1.04, y, y + BAND_HEIGHT), PAINT.black];
  });
  return [body, hook, ...bands];
}

function drillLines(): BufferGeometry {
  const lines = Array.from({ length: TOP_DRIVE.lines }, (_, index) => {
    const x = (index - (TOP_DRIVE.lines - 1) / 2) * LINE_SPREAD;
    return rodGeometry([x, 0, 0], [x, 1, 0], TOP_DRIVE.lineRadius, SEGMENTS.wire);
  });
  return merge(lines);
}

export class TopDrivePart {
  readonly object = new Group();
  readonly anchor: Object3D;
  private readonly carriage = new Group();
  private readonly lines: Mesh;

  constructor(context: PartContext) {
    const body = mergePainted([...driveBody(), ...links(), ...dolly(), ...travellingBlock()]);
    this.carriage.add(partMesh(context, body, 'topDrive', 'paintedMetal'));
    this.lines = partMesh(context, drillLines(), 'topDrive', 'wire');
    this.object.add(this.carriage, this.lines);
    this.anchor = anchorAt(this.carriage, 0, (GEAR_TOP + MOTOR_TOP) / 2, TOP_DRIVE.depth / 2);
  }

  setQuill(y: number): void {
    this.carriage.position.y = y;
    const blockTop = y + BLOCK_TOP;
    this.lines.position.y = blockTop;
    this.lines.scale.y = Math.max(CROWN_Y - blockTop, 1);
  }
}
