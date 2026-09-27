import { Group, Path } from 'three';
import type { BufferGeometry, Mesh, Object3D, Texture } from 'three';
import { FULL_TURN } from '@core/math';
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
import { boxBetween } from '../geometry/box';
import type { Corner } from '../geometry/box';
import { extrudeUpward, outlineShape } from '../geometry/extrude';
import type { PlanePoint } from '../geometry/extrude';
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

function plateCorners(): PlanePoint[] {
  const { halfWidth, back, front } = STAGE;
  return [
    [-halfWidth, back],
    [halfWidth, back],
    [halfWidth, front],
    [-halfWidth, front],
  ];
}

function wholePlate(): BufferGeometry {
  const shape = outlineShape(plateCorners());
  shape.holes.push(new Path().absarc(0, 0, STAGE.holeRadius, 0, FULL_TURN, true));
  return extrudeUpward(shape, STAGE_BOTTOM, STAGE_TOP);
}

function backOfHole(): PlanePoint[] {
  return Array.from({ length: HOLE_STEPS + 1 }, (_, index) => {
    const angle = -QUARTER_TURN - (index / HOLE_STEPS) * HALF_TURN;
    return [STAGE.holeRadius * Math.cos(angle), STAGE.holeRadius * Math.sin(angle)] as const;
  });
}

function cutPlate(): BufferGeometry {
  const { halfWidth, back, front, notchHalfWidth } = STAGE;
  const outline: PlanePoint[] = [
    [-halfWidth, back],
    [halfWidth, back],
    [halfWidth, -notchHalfWidth],
    [0, -notchHalfWidth],
    ...backOfHole(),
    [0, front],
    [-halfWidth, front],
  ];
  return extrudeUpward(outlineShape(outline), STAGE_BOTTOM, STAGE_TOP);
}

function clips(context: PartContext): Mesh[] {
  const { halfWidth, length, thickness, offset } = STAGE_CLIP;
  const top = STAGE_TOP + SLIDE.thickness;
  return [1, -1].map((side) =>
    partMesh(
      context,
      boxBetween(
        [-halfWidth, top, side * offset - length / 2],
        [halfWidth, top + thickness, side * offset + length / 2],
      ),
      'stage',
      'chrome',
    ),
  );
}

function carrier(context: PartContext): Mesh {
  const { halfWidth, bottom, top, back, front } = STAGE_CARRIER;
  const geometry = boxBetween([-halfWidth, bottom, back], [halfWidth, top, front]);
  return partMesh(context, geometry, 'stage', 'stage');
}

function glassPlate(context: PartContext, min: Corner, max: Corner): Mesh {
  const plate = partMesh(context, boxBetween(min, max), 'specimen', 'slideGlass');
  plate.renderOrder = RENDER_ORDER.glass;
  return plate;
}

function slideAndCoverslip(context: PartContext): Mesh[] {
  const coverslipTop = STATIONS.specimen + COVERSLIP.thickness;
  return [
    glassPlate(
      context,
      [-SLIDE.halfWidth, STAGE_TOP, -SLIDE.halfLength],
      [SLIDE.halfWidth, STATIONS.specimen, SLIDE.halfLength],
    ),
    glassPlate(
      context,
      [-COVERSLIP.half, STATIONS.specimen, -COVERSLIP.half],
      [COVERSLIP.half, coverslipTop, COVERSLIP.half],
    ),
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
