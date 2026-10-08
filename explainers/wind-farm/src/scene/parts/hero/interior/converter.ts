import type { BufferGeometry, Object3D } from 'three';
import { TURBINE_GEOMETRY } from '../../../../model/layout';
import { partMesh } from '../../context';
import type { PartContext } from '../../context';
import { FRAME_TOP_Y, SEGMENTS } from './constants';
import { merge, span, turnedUp } from './geometry';
import type { Range } from './geometry';

const { minX, maxX } = TURBINE_GEOMETRY.converter;
const BACK_Z = -2.05;
const FRONT_Z = -1.28;
const PLINTH_TOP = 103.72;
const BODY_TOP = 106.1;
const DOOR = { count: 3, inset: 0.04, gap: 0.03, y: [103.8, 106.02], depth: 0.015 } as const;
const HANDLE = { fromEdge: 0.09, width: 0.03, y: [104.85, 105.15], depth: 0.03 } as const;
const VENT = {
  bands: [104.0, 105.55],
  slats: 5,
  pitch: 0.07,
  height: 0.035,
  margin: 0.1,
  depth: 0.025,
} as const;
const FAN = { xs: [6.5, 7.5], radius: 0.2, height: 0.12 } as const;

const FACE_Z = FRONT_Z + DOOR.depth;
const DOOR_WIDTH = (maxX - minX - 2 * DOOR.inset - (DOOR.count - 1) * DOOR.gap) / DOOR.count;
const CENTRE_Z = (BACK_Z + FRONT_Z) / 2;

function doorSpans(): Range[] {
  return Array.from({ length: DOOR.count }, (_, index) => {
    const start = minX + DOOR.inset + index * (DOOR_WIDTH + DOOR.gap);
    return [start, start + DOOR_WIDTH];
  });
}

function cabinet(): BufferGeometry {
  return merge([
    span([minX, maxX], [PLINTH_TOP, BODY_TOP], [BACK_Z, FRONT_Z]),
    ...doorSpans().map((door) => span(door, DOOR.y, [FRONT_Z, FACE_Z])),
  ]);
}

function vents(): BufferGeometry[] {
  const slats = doorSpans().flatMap(([start, end]) =>
    VENT.bands.flatMap((band) =>
      Array.from({ length: VENT.slats }, (_, index) => {
        const bottom = band + index * VENT.pitch;
        return span(
          [start + VENT.margin, end - VENT.margin],
          [bottom, bottom + VENT.height],
          [FACE_Z, FACE_Z + VENT.depth],
        );
      }),
    ),
  );
  const fans = FAN.xs.map((x) =>
    turnedUp(
      [
        [BODY_TOP, 0],
        [BODY_TOP, FAN.radius],
        [BODY_TOP + FAN.height, FAN.radius],
        [BODY_TOP + FAN.height, 0],
      ],
      SEGMENTS.small,
    ).translate(x, 0, CENTRE_Z),
  );
  return [span([minX, maxX], [FRAME_TOP_Y, PLINTH_TOP], [BACK_Z, FRONT_Z]), ...slats, ...fans];
}

function handles(): BufferGeometry[] {
  return doorSpans().map(([, end]) =>
    span([end - HANDLE.fromEdge - HANDLE.width, end - HANDLE.fromEdge], HANDLE.y, [
      FACE_Z,
      FACE_Z + HANDLE.depth,
    ]),
  );
}

export function buildConverter(context: PartContext, parent: Object3D): void {
  parent.add(
    partMesh(context, cabinet(), 'converter'),
    partMesh(context, merge(vents()), 'converter', 'castIron'),
    partMesh(context, merge(handles()), 'converter', 'steel'),
  );
}

export const CONVERTER_FACE_Z = FACE_Z;
