import { Group, Path } from 'three';
import type { BufferGeometry, Mesh, Object3D, Texture } from 'three';
import { FULL_TURN } from '@core/math';
import { box } from '@core/scene/geometry/box';
import type { BoxBounds } from '@core/scene/geometry/box';
import { extrudePlan, planShape } from '@core/scene/geometry/extrude';
import type { PlanPoint } from '@core/scene/geometry/extrude';
import { anchorAt } from '@core/scene/parts';
import { STATIONS } from '../../model';
import { HALF_TURN, QUARTER_TURN } from '../../turns';
import {
  COVERSLIP,
  IMAGE_DISC_LIFT,
  RENDER_ORDER,
  SLIDE,
  STAGE,
  STAGE_CARRIER,
  STAGE_CLIP,
  STAGE_TOP,
} from '../constants';
import { partMesh } from './context';
import type { PartContext } from './context';
import { createImageDisc, setDiscRadius } from './imageDisc';

export interface StagePart {
  object: Group;
  anchors: { stage: Object3D; specimen: Object3D };
  setCutaway(cutaway: boolean): void;
  setField(radius: number): void;
}

const HOLE_STEPS = 24;
const STAGE_BOTTOM = STAGE_TOP - STAGE.thickness;

function plateCorners(): PlanPoint[] {
  const { halfWidth, back, front } = STAGE;
  return [
    { x: -halfWidth, z: back },
    { x: halfWidth, z: back },
    { x: halfWidth, z: front },
    { x: -halfWidth, z: front },
  ];
}

function wholePlate(): BufferGeometry {
  const shape = planShape(plateCorners());
  shape.holes.push(new Path().absarc(0, 0, STAGE.holeRadius, 0, FULL_TURN, true));
  return extrudePlan(shape, STAGE_BOTTOM, STAGE_TOP);
}

function backOfHole(): PlanPoint[] {
  return Array.from({ length: HOLE_STEPS + 1 }, (_, index) => {
    const angle = -QUARTER_TURN - (index / HOLE_STEPS) * HALF_TURN;
    return { x: STAGE.holeRadius * Math.cos(angle), z: STAGE.holeRadius * Math.sin(angle) };
  });
}

function cutPlate(): BufferGeometry {
  const { halfWidth, back, front, notchHalfWidth } = STAGE;
  const outline: PlanPoint[] = [
    { x: -halfWidth, z: back },
    { x: halfWidth, z: back },
    { x: halfWidth, z: -notchHalfWidth },
    { x: 0, z: -notchHalfWidth },
    ...backOfHole(),
    { x: 0, z: front },
    { x: -halfWidth, z: front },
  ];
  return extrudePlan(planShape(outline), STAGE_BOTTOM, STAGE_TOP);
}

function clips(context: PartContext): Mesh[] {
  const { halfWidth, length, thickness, offset } = STAGE_CLIP;
  const top = STAGE_TOP + SLIDE.thickness;
  return [1, -1].map((side) =>
    partMesh(
      context,
      box({
        minX: -halfWidth,
        maxX: halfWidth,
        minY: top,
        maxY: top + thickness,
        minZ: side * offset - length / 2,
        maxZ: side * offset + length / 2,
      }),
      'stage',
      'chrome',
    ),
  );
}

function carrier(context: PartContext): Mesh {
  const { halfWidth, bottom, top, back, front } = STAGE_CARRIER;
  const geometry = box({
    minX: -halfWidth,
    maxX: halfWidth,
    minY: bottom,
    maxY: top,
    minZ: back,
    maxZ: front,
  });
  return partMesh(context, geometry, 'stage', 'stage');
}

function glassPlate(context: PartContext, bounds: BoxBounds): Mesh {
  const plate = partMesh(context, box(bounds), 'specimen', 'slideGlass');
  plate.renderOrder = RENDER_ORDER.glass;
  return plate;
}

function slideAndCoverslip(context: PartContext): Mesh[] {
  const coverslipTop = STATIONS.specimen + COVERSLIP.thickness;
  return [
    glassPlate(context, {
      minX: -SLIDE.halfWidth,
      maxX: SLIDE.halfWidth,
      minY: STAGE_TOP,
      maxY: STATIONS.specimen,
      minZ: -SLIDE.halfLength,
      maxZ: SLIDE.halfLength,
    }),
    glassPlate(context, {
      minX: -COVERSLIP.half,
      maxX: COVERSLIP.half,
      minY: STATIONS.specimen,
      maxY: coverslipTop,
      minZ: -COVERSLIP.half,
      maxZ: COVERSLIP.half,
    }),
  ];
}

export function createStage(context: PartContext, specimen: Texture): StagePart {
  const whole = partMesh(context, wholePlate(), 'stage', 'stage');
  const cut = partMesh(context, cutPlate(), 'stage', 'stage');
  const disc = createImageDisc(context, 'specimen', specimen, STATIONS.specimen + IMAGE_DISC_LIFT);
  const object = new Group();
  object.add(whole, cut, carrier(context), ...slideAndCoverslip(context), disc, ...clips(context));
  return {
    object,
    anchors: {
      stage: anchorAt(object, 0, STAGE_TOP - STAGE.thickness / 2, STAGE.front),
      specimen: anchorAt(object, 0, STATIONS.specimen, 0),
    },
    setCutaway: (cutaway) => {
      whole.visible = !cutaway;
      cut.visible = cutaway;
    },
    setField: (radius) => setDiscRadius(disc, radius),
  };
}
