import { CylinderGeometry, Group, SphereGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import type { VideoId } from '../../../ids';
import { GPS, PLATE, RECEIVER_ANTENNAS, VIDEO_ANTENNA } from '../../constants';
import { FINISHES } from '../../finishes';
import { along, rod } from '../../geometry/rods';
import type { Vec3 } from '../../geometry/rods';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

type Triple = readonly [number, number, number];

const PLATE_TOP = PLATE.gap + PLATE.thickness;
const SPHERE_SEGMENTS = 8;

function centredBox(at: Triple, size: Triple): BufferGeometry {
  return box({
    minX: at[0] - size[0] / 2,
    maxX: at[0] + size[0] / 2,
    minY: at[1] - size[1] / 2,
    maxY: at[1] + size[1] / 2,
    minZ: at[2] - size[2] / 2,
    maxZ: at[2] + size[2] / 2,
  });
}

function mountGeometry(): BufferGeometry {
  const { centre, mount } = VIDEO_ANTENNA;
  return centredBox([centre[0], PLATE_TOP + mount.size[1] / 2, centre[2]], mount.size);
}

function lollipopGeometry(): BufferGeometry {
  const { centre, mount, analogue } = VIDEO_ANTENNA;
  const base = PLATE_TOP + mount.size[1];
  const stub = new CylinderGeometry(analogue.stub, analogue.stub, analogue.length, 8);
  stub.translate(centre[0], base + analogue.length / 2, centre[2]);
  const cap = new SphereGeometry(analogue.cap, analogue.segments, SPHERE_SEGMENTS);
  cap.scale(1, analogue.squash, 1);
  cap.translate(centre[0], base + analogue.length + analogue.cap * analogue.squash, centre[2]);
  return mergeParts([stub, cap]);
}

function patchGeometry(): BufferGeometry {
  const { centre, mount, digital } = VIDEO_ANTENNA;
  const base = PLATE_TOP + mount.size[1];
  const stalk = new CylinderGeometry(digital.stalk / 2, digital.stalk / 2, digital.lift, 8);
  stalk.translate(centre[0], base + digital.lift / 2, centre[2]);
  const patch = centredBox(
    [centre[0], base + digital.lift + digital.patch[1] / 2, centre[2]],
    digital.patch,
  );
  return mergeParts([stalk, patch]);
}

export class VideoAntennaPart {
  readonly object = new Group();
  readonly top: Object3D;
  readonly label: Object3D;
  private readonly variants: Readonly<Record<VideoId, Object3D>>;

  constructor(context: PartContext) {
    const { centre, top } = VIDEO_ANTENNA;
    this.variants = {
      analogue: partMesh(context, lollipopGeometry(), 'videoAntenna', FINISHES.cameraBody),
      digital: partMesh(context, patchGeometry(), 'videoAntenna', FINISHES.cameraDigital),
    };
    this.object.add(
      partMesh(context, mountGeometry(), 'videoAntenna', FINISHES.printed),
      this.variants.analogue,
      this.variants.digital,
    );
    this.top = anchorAt(this.object, centre[0], top, centre[2]);
    this.label = anchorAt(this.object, centre[0], top, centre[2]);
  }

  setVideo(video: VideoId): void {
    this.variants.analogue.visible = video === 'analogue';
    this.variants.digital.visible = video === 'digital';
  }
}

export function whipTip(base: Triple): Vec3 {
  const { holder, whip } = RECEIVER_ANTENNAS;
  const start: Vec3 = [base[0], base[1] + holder.size[1], base[2]];
  const direction: Vec3 = [
    whip.direction[0],
    whip.direction[1],
    Math.sign(base[2]) * whip.direction[2],
  ];
  return along(start, direction, whip.length);
}

function whipGeometry(base: Triple): BufferGeometry {
  const { holder, whip, tip } = RECEIVER_ANTENNAS;
  const start: Vec3 = [base[0], base[1] + holder.size[1], base[2]];
  const end = whipTip(base);
  const direction: Vec3 = [end[0] - start[0], end[1] - start[1], end[2] - start[2]];
  const split = along(start, direction, whip.length * (1 - tip.share));
  return mergeParts([
    rod(start, split, whip.radius, whip.segments),
    rod(split, end, tip.radius, whip.segments, tip.radius * 0.8),
  ]);
}

export interface ReceiverPart {
  object: Group;
  linkEnd: Object3D;
  label: Object3D;
}

export function buildReceiverAntennas(context: PartContext): ReceiverPart {
  const { bases, holder } = RECEIVER_ANTENNAS;
  const object = new Group();
  object.add(
    partMesh(
      context,
      mergeParts(
        bases.map((base) =>
          centredBox([base[0], base[1] + holder.size[1] / 2, base[2]], holder.size),
        ),
      ),
      'receiverAntenna',
      FINISHES.printed,
    ),
    partMesh(
      context,
      mergeParts(bases.map((base) => whipGeometry(base))),
      'receiverAntenna',
      FINISHES.cameraBody,
    ),
  );
  const tips = bases.map((base) => whipTip(base));
  const middle = tips.reduce<[number, number, number]>(
    (sum, tip) => [
      sum[0] + tip[0] / tips.length,
      sum[1] + tip[1] / tips.length,
      sum[2] + tip[2] / tips.length,
    ],
    [0, 0, 0],
  );
  const right = tips.find((tip) => tip[2] > 0) ?? tips[0];
  return {
    object,
    linkEnd: anchorAt(object, ...middle),
    label: anchorAt(object, ...right),
  };
}

export interface GpsPart {
  object: Group;
  label: Object3D;
}

export function buildGps(context: PartContext): GpsPart {
  const { centre, mast, puck, patch } = GPS;
  const bottom = centre[1] - puck.height / 2;
  const pole = new CylinderGeometry(mast.radius, mast.radius, bottom - PLATE_TOP, mast.segments);
  pole.translate(centre[0], (bottom + PLATE_TOP) / 2, centre[2]);
  const body = new CylinderGeometry(puck.radius, puck.radius, puck.height, puck.segments);
  body.translate(...centre);
  const ceramic = centredBox(
    [centre[0], centre[1] + puck.height / 2 + patch.thickness / 2, centre[2]],
    [patch.size, patch.thickness, patch.size],
  );
  const object = new Group();
  object.add(
    partMesh(context, pole, 'gpsModule', FINISHES.printed),
    partMesh(context, body, 'gpsModule', FINISHES.cameraDigital),
    partMesh(context, ceramic, 'gpsModule', FINISHES.ceramic),
  );
  return { object, label: anchorAt(object, centre[0], centre[1] + puck.height, centre[2]) };
}
