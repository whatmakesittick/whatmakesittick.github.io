import { Group, Mesh } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { PLATE_BOTTOM } from '../../model';
import { PLATE, PLATE_OPACITY } from '../constants';
import { TRANSLUCENT_COLORS } from '../finishes';
import { extrudePlan } from '../geometry/extrude';
import { box } from '../geometry/primitives';
import { roundedRectHole, roundedRectShape } from '../geometry/shapes';
import type { TranslucentMaterial } from '../translucency';
import type { PartContext } from './context';

export interface ThroatPlatePart {
  object: Group;
  labelAnchor: Object3D;
  setCutaway(cutaway: boolean): void;
}

const PLATE_RENDER_ORDER = 1;
const SLOT_CORNER = 0.8;
const PLATE_SURFACE = { metalness: 0.85, roughness: 0.3 } as const;
const LABEL_SPOT = { x: -16, z: 14 } as const;

function plateGeometry(): BufferGeometry {
  const { left, right, back, front, cornerRadius, holeHalfWidth, holeHalfLength } = PLATE;
  const shape = roundedRectShape(
    { minA: left, minB: back, maxA: right, maxB: front },
    cornerRadius,
  );
  shape.holes.push(
    roundedRectHole(
      { minA: -holeHalfWidth, minB: -holeHalfLength, maxA: holeHalfWidth, maxB: holeHalfLength },
      SLOT_CORNER,
    ),
    ...[-PLATE.slotX, PLATE.slotX].map((x) =>
      roundedRectHole(
        {
          minA: x - PLATE.slotHalfWidth,
          minB: PLATE.slotBack,
          maxA: x + PLATE.slotHalfWidth,
          maxB: PLATE.slotFront,
        },
        SLOT_CORNER,
      ),
    ),
  );
  return extrudePlan(shape, PLATE_BOTTOM, 0);
}

function guideGeometry(x: number): BufferGeometry {
  return box({
    minX: x - PLATE.guideHalfWidth,
    maxX: x + PLATE.guideHalfWidth,
    minY: 0,
    maxY: PLATE.guideLift,
    minZ: PLATE.back + PLATE.guideInset,
    maxZ: PLATE.front - PLATE.guideInset,
  });
}

export function createThroatPlate(context: PartContext): ThroatPlatePart {
  const object = new Group();
  const create = (color: string) =>
    context.translucency.create(
      context.tracker,
      'throatPlate',
      { color, ...PLATE_SURFACE },
      PLATE_OPACITY.whole,
    );
  const plate = create(TRANSLUCENT_COLORS.plate);
  const guide = create(TRANSLUCENT_COLORS.plateGuide);
  const materials: TranslucentMaterial[] = [plate, guide];
  const plateMesh = new Mesh(context.tracker.track(plateGeometry()), plate.material);
  plateMesh.renderOrder = PLATE_RENDER_ORDER;
  object.add(plateMesh);
  PLATE.guides.forEach((x) =>
    object.add(new Mesh(context.tracker.track(guideGeometry(x)), guide.material)),
  );
  return {
    object,
    labelAnchor: anchorAt(object, LABEL_SPOT.x, 0, LABEL_SPOT.z),
    setCutaway: (cutaway) => {
      const opacity = cutaway ? PLATE_OPACITY.cutaway : PLATE_OPACITY.whole;
      materials.forEach((material) => {
        material.opacity = opacity;
      });
    },
  };
}
