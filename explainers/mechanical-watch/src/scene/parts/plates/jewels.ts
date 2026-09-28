import { BufferAttribute, Color } from 'three';
import type { BufferGeometry, Material, Object3D } from 'three';
import { smoothstep } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { BALANCE_CENTRE, PALLET_STAFF, WHEEL_CENTRES } from '../../../model/layout';
import type { Point } from '../../../model/layout';
import {
  ANCHOR_LIFT_MM,
  BALANCE_COCK,
  BRIDGE_LEVEL,
  JEWEL_DISC,
  JEWEL_SINK,
  SEGMENTS,
} from '../../constants';
import { PAINT, rubyMaterial } from '../../finishes';
import { latheZ } from '../../geometry/extrude';
import { merge } from '../../geometry/merge';
import { partMesh, registeredMesh } from '../context';
import type { PartContext } from '../context';

interface JewelSeat {
  readonly at: Point;
  readonly z: number;
  readonly cap?: boolean;
  readonly under?: boolean;
}

const DOME_SHARE = 0.35;
const SINK_SHARE = 0.18;
const SHOULDER_SHARE = 0.7;
const BLEND = { from: 0.6, to: 1.6 } as const;
const RGB = 3;
const deep = new Color(PAINT.ruby);
const light = new Color(JEWEL_DISC.light);
const mixed = new Color();

function jewelGeometry(radius: number, height: number): BufferGeometry {
  const geometry = latheZ(
    [
      [0, 0],
      [radius, 0],
      [radius, height * (1 - DOME_SHARE)],
      [radius * SHOULDER_SHARE, height],
      [radius * JEWEL_DISC.centreShare, height],
      [radius * SINK_SHARE, height * (1 - SINK_SHARE)],
      [0, height * (1 - SINK_SHARE)],
    ],
    SEGMENTS.jewel,
  );
  const position = geometry.getAttribute('position');
  const colors = new Float32Array(position.count * RGB);
  for (let index = 0; index < position.count; index += 1) {
    const share = Math.hypot(position.getX(index), position.getY(index)) / radius;
    mixed
      .copy(light)
      .lerp(
        deep,
        smoothstep(JEWEL_DISC.centreShare * BLEND.from, JEWEL_DISC.centreShare * BLEND.to, share),
      );
    mixed.toArray(colors, index * RGB);
  }
  geometry.setAttribute('color', new BufferAttribute(colors, RGB));
  return geometry;
}

function seated(seat: JewelSeat): BufferGeometry {
  const form = seat.cap ? JEWEL_DISC.cap : JEWEL_DISC.hole;
  const geometry = jewelGeometry(form.radius, form.height);
  if (seat.under) geometry.rotateX(Math.PI);
  geometry.translate(seat.at.x, seat.at.y, seat.z);
  return geometry;
}

const { centreWheel, thirdWheel, fourthWheel, escapeWheel } = WHEEL_CENTRES;

const PLATE_SEATS: readonly JewelSeat[] = [
  { at: centreWheel, z: 0 },
  { at: thirdWheel, z: 0 },
  { at: fourthWheel, z: 0 },
  { at: escapeWheel, z: 0 },
  { at: PALLET_STAFF, z: 0 },
  { at: BALANCE_CENTRE, z: -JEWEL_DISC.cap.height / 2, cap: true },
  { at: BALANCE_CENTRE, z: 0 },
];

const BRIDGE_SEATS: readonly JewelSeat[] = [
  { at: centreWheel, z: BRIDGE_LEVEL.barrel[1] },
  { at: thirdWheel, z: BRIDGE_LEVEL.train[1] },
  { at: fourthWheel, z: BRIDGE_LEVEL.train[1] },
  { at: escapeWheel, z: BRIDGE_LEVEL.lowArm[1] },
  { at: PALLET_STAFF, z: BRIDGE_LEVEL.lowArm[1] },
  { at: BALANCE_CENTRE, z: BALANCE_COCK.arm[0], under: true },
];

function sinkGeometry(seat: JewelSeat): BufferGeometry {
  const inner = JEWEL_DISC.hole.radius;
  const outer = inner + JEWEL_SINK.width;
  const sink = latheZ(
    [
      [outer, seat.z - JEWEL_SINK.depth],
      [outer, seat.z + JEWEL_SINK.lip / 2],
      [inner, seat.z + JEWEL_SINK.lip],
    ],
    SEGMENTS.jewel,
  );
  sink.translate(seat.at.x, seat.at.y, 0);
  return sink;
}

function sinks(seats: readonly JewelSeat[]): BufferGeometry {
  return merge(seats.filter((seat) => !seat.cap && !seat.under).map(sinkGeometry));
}

const LABEL_BRIDGE = BRIDGE_SEATS[2];
const LABEL_PLATE = {
  x: PALLET_STAFF.x,
  y: PALLET_STAFF.y - JEWEL_DISC.hole.radius,
  z: JEWEL_DISC.hole.height,
};

export class JewelsPart {
  readonly label: Object3D;
  private readonly bridges: Object3D;

  constructor(context: PartContext, plateFrame: Object3D, bridgeFrame: Object3D) {
    const material: Material = rubyMaterial(true);
    plateFrame.add(
      registeredMesh(context, merge(PLATE_SEATS.map(seated)), 'jewels', material),
      partMesh(context, sinks(PLATE_SEATS), STRUCTURE_GROUP, 'polishedBrass'),
    );
    this.bridges = registeredMesh(context, merge(BRIDGE_SEATS.map(seated)), 'jewels', material);
    bridgeFrame.add(
      this.bridges,
      partMesh(context, sinks(BRIDGE_SEATS), STRUCTURE_GROUP, 'polishedBrass'),
    );
    this.label = anchorAt(plateFrame, 0, 0, 0);
    this.setBridgesShown(true);
  }

  setBridgesShown(shown: boolean): void {
    const lift = ANCHOR_LIFT_MM;
    if (shown) {
      const top = LABEL_BRIDGE.z + JEWEL_DISC.hole.height + lift;
      this.label.position.set(LABEL_BRIDGE.at.x, LABEL_BRIDGE.at.y, top);
    } else {
      this.label.position.set(LABEL_PLATE.x, LABEL_PLATE.y, LABEL_PLATE.z + lift);
    }
  }
}
