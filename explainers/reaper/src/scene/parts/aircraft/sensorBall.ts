import { CylinderGeometry, Group, LatheGeometry, SphereGeometry, Vector2 } from 'three';
import type { BufferGeometry, Vector3 } from 'three';
import { SAT_DISH, SENSOR } from '../../constants';
import { FINISHES } from '../../finishes';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

const QUARTER_TURN = Math.PI / 2;
const WINDOW_SEGMENTS = 20;
const DISH_SAMPLES = 8;
const FEED_SEGMENTS = 10;
const STRUT_SEGMENTS = 6;
const STRUT_RADIUS = 0.008;
const STRUT_SPREAD = 0.8;
const STRUT_COUNT = 3;
const HORN_FLARE = 1.4;
const HORN_LENGTH = 3;
const EULER_ORDER = 'YZX';

function windowsGeometry(): BufferGeometry {
  return mergeParts(
    SENSOR.windows.map(({ up, side, radius }) => {
      const lens = new CylinderGeometry(radius, radius, SENSOR.windowDepth, WINDOW_SEGMENTS);
      lens.rotateZ(-QUARTER_TURN);
      const reach = Math.sqrt(SENSOR.radius ** 2 - up ** 2 - side ** 2);
      lens.translate(reach, up, side);
      return lens;
    }),
  );
}

function bezelGeometry(): BufferGeometry {
  const { radius, depth } = SENSOR.bezel;
  const bezel = new CylinderGeometry(radius, radius, depth, WINDOW_SEGMENTS * 2);
  bezel.rotateZ(-QUARTER_TURN);
  bezel.translate(Math.sqrt(SENSOR.radius ** 2 - radius ** 2) + depth / 2, 0, 0);
  return bezel;
}

export class SensorBallPart {
  readonly object = new Group();
  readonly turret = new Group();

  constructor(context: PartContext) {
    const { housing, centre } = SENSOR;
    const height = housing.top - housing.bottom;
    const neck = new CylinderGeometry(housing.radius, housing.radius, height, housing.segments);
    neck.translate(centre[0], housing.bottom + height / 2, centre[2]);
    this.turret.position.set(...centre);
    this.turret.rotation.order = EULER_ORDER;
    this.turret.add(
      partMesh(
        context,
        new SphereGeometry(SENSOR.radius, SENSOR.segments, SENSOR.segments / 2),
        'sensorBall',
        FINISHES.ball,
      ),
      partMesh(context, bezelGeometry(), 'sensorBall', FINISHES.bezel),
      partMesh(context, windowsGeometry(), 'sensorBall', FINISHES.glass),
    );
    this.object.add(partMesh(context, neck, 'sensorBall', FINISHES.ball), this.turret);
  }

  aim(direction: Vector3): void {
    const yaw = Math.atan2(-direction.z, direction.x);
    const elevation = Math.min(
      Math.atan2(direction.y, Math.hypot(direction.x, direction.z)),
      SENSOR.minDepression,
    );
    this.turret.rotation.set(0, yaw, elevation, EULER_ORDER);
  }
}

function dishGeometry(): BufferGeometry {
  const { radius, depth } = SAT_DISH;
  const profile = Array.from({ length: DISH_SAMPLES + 1 }, (_, index) => {
    const share = index / DISH_SAMPLES;
    return new Vector2(share * radius, depth * share * share);
  });
  return new LatheGeometry(profile, SAT_DISH.segments);
}

function feedGeometry(): BufferGeometry {
  const { feed, radius, depth } = SAT_DISH;
  const horn = new CylinderGeometry(
    feed.radius,
    feed.radius * HORN_FLARE,
    feed.radius * HORN_LENGTH,
    FEED_SEGMENTS,
  );
  horn.translate(0, feed.length, 0);
  const struts = Array.from({ length: STRUT_COUNT }, (_, index) => {
    const angle = (index / STRUT_COUNT) * Math.PI * 2;
    const rim = radius * STRUT_SPREAD;
    const strutLength = Math.hypot(rim, feed.length - depth);
    const strut = new CylinderGeometry(STRUT_RADIUS, STRUT_RADIUS, strutLength, STRUT_SEGMENTS);
    strut.translate(0, strutLength / 2, 0);
    strut.rotateZ(Math.atan2(rim, feed.length - depth));
    strut.translate(0, depth, 0);
    strut.rotateY(angle);
    return strut;
  });
  return mergeParts([horn, ...struts]);
}

export class SatDishPart {
  readonly object = new Group();
  readonly head = new Group();

  constructor(context: PartContext) {
    const { centre, pedestal } = SAT_DISH;
    this.object.position.set(...centre);
    const base = new CylinderGeometry(
      pedestal.radius,
      pedestal.radius * 1.3,
      pedestal.height,
      FEED_SEGMENTS,
    );
    base.translate(0, -pedestal.height / 2, 0);
    this.head.add(
      partMesh(context, dishGeometry(), 'satelliteDish', FINISHES.dish),
      partMesh(context, feedGeometry(), 'satelliteDish', FINISHES.strut),
    );
    this.object.add(partMesh(context, base, 'satelliteDish', FINISHES.strut), this.head);
  }

  aim(direction: Vector3): void {
    const flat = Math.hypot(direction.x, direction.z);
    const elevation = Math.max(Math.atan2(direction.y, flat), SAT_DISH.minElevation);
    const azimuth = Math.atan2(direction.z, direction.x);
    this.head.rotation.set(0, -azimuth, -(Math.PI / 2 - elevation), EULER_ORDER);
  }
}
