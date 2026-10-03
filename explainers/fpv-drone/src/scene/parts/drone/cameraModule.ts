import { CircleGeometry, CylinderGeometry, Group, RingGeometry } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { anchorAt } from '@core/scene/parts';
import type { VideoId } from '../../../ids';
import { CAMERA_MODULE } from '../../constants';
import { FINISHES } from '../../finishes';
import type { MaterialFinish } from '@core/scene/materials';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

const QUARTER_TURN = Math.PI / 2;
const SIDES = [1, -1] as const;
const GLASS_INSET = 0.0008;

interface UnitShape {
  body: number;
  lensRadius: number;
  barrel: number;
}

function cheeksGeometry(): BufferGeometry {
  const { centre, cheek } = CAMERA_MODULE;
  return mergeParts(
    SIDES.map((side) =>
      box({
        minX: centre[0] - cheek.size[0] / 2,
        maxX: centre[0] + cheek.size[0] / 2,
        minY: cheek.y - cheek.size[1] / 2,
        maxY: cheek.y + cheek.size[1] / 2,
        minZ: side * cheek.z - cheek.size[2] / 2,
        maxZ: side * cheek.z + cheek.size[2] / 2,
      }),
    ),
  );
}

function bodyGeometry(shape: UnitShape): BufferGeometry {
  const half = shape.body / 2;
  return box({ minX: -half, maxX: half, minY: -half, maxY: half, minZ: -half, maxZ: half });
}

function barrelGeometry(shape: UnitShape): BufferGeometry {
  const barrel = new CylinderGeometry(
    shape.lensRadius,
    shape.lensRadius,
    shape.barrel,
    CAMERA_MODULE.segments,
  );
  barrel.rotateZ(-QUARTER_TURN);
  barrel.translate(shape.body / 2 + shape.barrel / 2, 0, 0);
  return barrel;
}

function ringGeometry(shape: UnitShape): BufferGeometry {
  const front = shape.body / 2 + shape.barrel;
  const ring = new RingGeometry(
    shape.lensRadius - CAMERA_MODULE.ring,
    shape.lensRadius + CAMERA_MODULE.ring * 0.4,
    CAMERA_MODULE.segments,
  );
  ring.rotateY(QUARTER_TURN);
  ring.translate(front + GLASS_INSET, 0, 0);
  return ring;
}

function glassGeometry(shape: UnitShape): BufferGeometry {
  const front = shape.body / 2 + shape.barrel;
  const glass = new CircleGeometry(shape.lensRadius - CAMERA_MODULE.ring, CAMERA_MODULE.segments);
  glass.rotateY(QUARTER_TURN);
  glass.translate(front - GLASS_INSET, 0, 0);
  return glass;
}

function buildUnit(context: PartContext, shape: UnitShape, bodyFinish: MaterialFinish): Group {
  const unit = new Group();
  unit.add(
    partMesh(context, bodyGeometry(shape), 'camera', bodyFinish),
    partMesh(context, barrelGeometry(shape), 'camera', FINISHES.cameraBody),
    partMesh(context, ringGeometry(shape), 'camera', FINISHES.lensRing),
    partMesh(context, glassGeometry(shape), 'camera', FINISHES.lens),
  );
  return unit;
}

export class CameraModulePart {
  readonly object = new Group();
  readonly tilted = new Group();
  readonly lens: Object3D;
  readonly label: Object3D;
  private readonly units: Readonly<Record<VideoId, Group>>;

  constructor(context: PartContext) {
    const { centre, tilt, analogue, digital } = CAMERA_MODULE;
    this.object.add(partMesh(context, cheeksGeometry(), 'camera', FINISHES.printed));
    this.tilted.position.set(...centre);
    this.tilted.rotation.z = tilt;
    this.units = {
      analogue: buildUnit(context, analogue, FINISHES.cameraBody),
      digital: buildUnit(context, digital, FINISHES.cameraDigital),
    };
    this.tilted.add(this.units.analogue, this.units.digital);
    this.object.add(this.tilted);
    const front = digital.body / 2 + digital.barrel;
    this.lens = anchorAt(this.tilted, front, 0, 0);
    this.label = anchorAt(this.tilted, front, digital.lensRadius, 0);
  }

  setVideo(video: VideoId): void {
    this.units.analogue.visible = video === 'analogue';
    this.units.digital.visible = video === 'digital';
  }
}
