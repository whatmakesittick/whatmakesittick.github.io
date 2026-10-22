import { AdditiveBlending, Color, Shape } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { SKIDS, TRAIN } from '../../../model';
import { THEME } from '../../../theme';
import { registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { FINISHES } from '../../finishes';
import { SKID, SPARK } from './constants';
import { bevelledAlongZ } from './extrude';
import { cutInstances, showAhead } from './instances';
import type { CutInstances } from './instances';
import { TRAIN_LAYOUT, isAhead } from './layout';
import { mergeAll, mirroredPair } from './mirror';

const SIDES = [1, -1] as const;
const MOUNT_WIDTH_SHARE = 0.64;
const SPARK_LIFT = 0.012;
const TOE_HANDLE = 0.3;

function padShape(): Shape {
  const half = SKIDS.length / 2;
  const { toeRise, toeLength, padHeight } = SKID;
  const shape = new Shape();
  shape.moveTo(-half, toeRise);
  shape.quadraticCurveTo(-half + toeLength * TOE_HANDLE, 0, -half + toeLength, 0);
  shape.lineTo(half - toeLength, 0);
  shape.quadraticCurveTo(half - toeLength * TOE_HANDLE, 0, half, toeRise);
  shape.lineTo(half, padHeight);
  shape.lineTo(-half, padHeight);
  shape.closePath();
  return shape;
}

export function skidGeometry(): BufferGeometry {
  const halfWidth = SKIDS.width / 2;
  const pad = bevelledAlongZ(
    padShape(),
    SKIDS.stripZ - halfWidth,
    SKIDS.stripZ + halfWidth,
    SKID.bevel,
  );
  pad.translate(0, SKID.bottom, 0);
  const mountHalf = (SKIDS.length * SKID.mountShare) / 2;
  const mountWidth = (SKIDS.width * MOUNT_WIDTH_SHARE) / 2;
  const mount = box({
    minX: -mountHalf,
    maxX: mountHalf,
    minY: SKID.bottom + SKID.padHeight,
    maxY: TRAIN.bodyBottom + SKID.bevel,
    minZ: SKIDS.stripZ - mountWidth,
    maxZ: SKIDS.stripZ + mountWidth,
  });
  return mirroredPair(mergeAll([pad, mount]));
}

function sparkCloud(context: PartContext, slots: readonly number[]): PointCloud {
  const material = createPointMaterial(context.textures.glow, SPARK.size, AdditiveBlending);
  const cloud = new PointCloud(
    slots.length * SIDES.length * SPARK.trail,
    registeredMaterial(context, 'skids', material),
  );
  const colour = new Color(THEME.eddy);
  let index = 0;
  slots.forEach((x) =>
    SIDES.forEach((side) => {
      for (let step = 0; step < SPARK.trail; step += 1) {
        cloud.setPoint(
          index,
          x - SKIDS.length / 2 - step * SPARK.trailStep,
          SKID.bottom + SPARK_LIFT,
          side * SKIDS.stripZ,
        );
        cloud.setColor(index, colour.r, colour.g, colour.b, SPARK.opacity * SPARK.fade ** step);
        index += 1;
      }
    }),
  );
  cloud.commit();
  cloud.points.visible = false;
  context.tracker.track(cloud);
  return cloud;
}

export interface Skids {
  readonly shoes: CutInstances;
  showAhead(shown: boolean): void;
  setSliding(sliding: boolean): void;
}

export function buildSkids(context: PartContext, behind: Object3D, ahead: Object3D): Skids {
  const slots = TRAIN_LAYOUT.flatMap((layout) => layout.skids);
  const shoes = cutInstances(context, skidGeometry(), 'skids', FINISHES.skid, slots);
  behind.add(shoes.mesh);
  const sparks = [
    sparkCloud(
      context,
      slots.filter((x) => !isAhead(x)),
    ),
    sparkCloud(context, slots.filter(isAhead)),
  ];
  behind.add(sparks[0].points);
  ahead.add(sparks[1].points);
  return {
    shoes,
    showAhead: (shown) => showAhead(shoes, shown),
    setSliding: (sliding) => sparks.forEach((cloud) => (cloud.points.visible = sliding)),
  };
}
