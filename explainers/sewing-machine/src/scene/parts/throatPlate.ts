import { Group, Mesh, MeshStandardMaterial } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { PLATE_BOTTOM } from '../../model';
import { PLATE, PLATE_OPACITY } from '../constants';
import { TRANSLUCENT_COLORS } from '../finishes';
import { extrudePlan } from '../geometry/extrude';
import { box } from '../geometry/primitives';
import { roundedRectHole, roundedRectShape } from '../geometry/shapes';
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
const OPAQUE = 1;

interface PlateLook {
  plate: MeshStandardMaterial;
  guide: MeshStandardMaterial;
}

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

function plateMaterial(context: PartContext, color: string, opacity: number): MeshStandardMaterial {
  const transparent = opacity < OPAQUE;
  const material = context.tracker.track(
    new MeshStandardMaterial({
      color,
      ...PLATE_SURFACE,
      opacity,
      transparent,
      depthWrite: !transparent,
    }),
  );
  context.materials.register('throatPlate', material);
  return material;
}

function plateLook(context: PartContext, opacity: number): PlateLook {
  return {
    plate: plateMaterial(context, TRANSLUCENT_COLORS.plate, opacity),
    guide: plateMaterial(context, TRANSLUCENT_COLORS.plateGuide, opacity),
  };
}

export function createThroatPlate(context: PartContext): ThroatPlatePart {
  const object = new Group();
  const looks = {
    whole: plateLook(context, PLATE_OPACITY.whole),
    cutaway: plateLook(context, PLATE_OPACITY.cutaway),
  };
  const plateMesh = new Mesh(context.tracker.track(plateGeometry()), looks.whole.plate);
  plateMesh.renderOrder = PLATE_RENDER_ORDER;
  const guideMeshes = PLATE.guides.map(
    (x) => new Mesh(context.tracker.track(guideGeometry(x)), looks.whole.guide),
  );
  object.add(plateMesh, ...guideMeshes);
  return {
    object,
    labelAnchor: anchorAt(object, LABEL_SPOT.x, 0, LABEL_SPOT.z),
    setCutaway: (cutaway) => {
      const look = cutaway ? looks.cutaway : looks.whole;
      plateMesh.material = look.plate;
      guideMeshes.forEach((mesh) => {
        mesh.material = look.guide;
      });
    },
  };
}
