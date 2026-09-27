import { Group } from 'three';
import { lerp } from '@core/math';
import {
  PARFOCAL_DISTANCE_MM,
  acceptanceHalfAngle,
  fieldOfView,
  frontAboveSpecimen,
  specimenToLens,
} from '../../model';
import type { ObjectiveId } from '../../model';
import { OBJECTIVE_SHAPE, SEGMENTS } from '../constants';
import { FINISHES, OBJECTIVE_BANDS } from '../finishes';
import { cutSection, ringSection } from '../geometry/lathe';
import type { Section } from '../geometry/lathe';
import { cutShell } from './context';
import type { CutShell, PartContext } from './context';
import { glassLens } from './glassLens';

interface ObjectiveShape {
  tip: number;
  lens: number;
  lensRadius: number;
  innerTip: number;
  noseTop: number;
}

function shapeOf(objective: ObjectiveId): ObjectiveShape {
  const { clearance, lensRim, boreRadius, threadLength, bandHeight } = OBJECTIVE_SHAPE;
  const lensHeight = specimenToLens(objective);
  const frontHeight = frontAboveSpecimen(objective);
  const aperture = lensHeight * Math.tan(acceptanceHalfAngle(objective));
  const tip = frontHeight - PARFOCAL_DISTANCE_MM;
  const lens = lensHeight - PARFOCAL_DISTANCE_MM;
  const lensRadius = aperture + lensRim;
  const innerTip = fieldOfView(objective) / 2 + (aperture * frontHeight) / lensHeight + clearance;
  const highest = -(threadLength + bandHeight);
  const flare =
    lensRadius > innerTip
      ? tip + ((boreRadius - innerTip) * (lens - tip)) / (lensRadius - innerTip)
      : highest;
  return { tip, lens, lensRadius, innerTip, noseTop: Math.min(flare, highest) };
}

function boreSection(shape: ObjectiveShape): Section {
  const { boreRadius } = OBJECTIVE_SHAPE;
  return [
    [boreRadius, 0],
    [boreRadius, shape.noseTop],
    [shape.innerTip, shape.tip],
  ];
}

function bodySection(shape: ObjectiveShape): Section {
  const { wall, barrelRadius, threadRadius, threadLength } = OBJECTIVE_SHAPE;
  return [
    [shape.innerTip + wall, shape.tip],
    [barrelRadius, shape.noseTop],
    [barrelRadius, -threadLength],
    [threadRadius, -threadLength],
    [threadRadius, 0],
    ...boreSection(shape),
  ];
}

function lensThickness(shape: ObjectiveShape): number {
  const { lensThickness: thickest, lensThicknessShare } = OBJECTIVE_SHAPE;
  return Math.min(thickest, lensThicknessShare * (shape.lens - shape.tip));
}

export function objectiveLabelPoint(objective: ObjectiveId): { height: number; reach: number } {
  const shape = shapeOf(objective);
  const height = (shape.tip + shape.lens) / 2;
  const share = Math.min(1, (height - shape.tip) / (shape.noseTop - shape.tip));
  const tipOuter = shape.innerTip + OBJECTIVE_SHAPE.wall;
  return { height, reach: lerp(tipOuter, OBJECTIVE_SHAPE.barrelRadius, share) };
}

function barrel(context: PartContext, shape: ObjectiveShape): CutShell {
  return cutShell(
    context,
    cutSection(bodySection(shape), SEGMENTS.round, { lining: boreSection(shape) }),
    'objective',
    FINISHES.steel,
  );
}

function colourBand(context: PartContext, objective: ObjectiveId): CutShell {
  const { barrelRadius, bandLift, bandHeight, threadLength } = OBJECTIVE_SHAPE;
  const section = ringSection(
    barrelRadius,
    barrelRadius + bandLift,
    -(threadLength + bandHeight),
    -threadLength,
  );
  return cutShell(
    context,
    cutSection(section, SEGMENTS.round),
    'objective',
    OBJECTIVE_BANDS[objective],
  );
}

export function createObjective(context: PartContext, objective: ObjectiveId): CutShell {
  const shape = shapeOf(objective);
  const body = barrel(context, shape);
  const band = colourBand(context, objective);
  const lens = glassLens(
    context,
    'objective',
    { radius: shape.lensRadius, thickness: lensThickness(shape) },
    shape.lens,
  );
  const object = new Group();
  object.add(body.object, band.object, lens);
  return {
    object,
    setCut: (cut) => {
      body.setCut(cut);
      band.setCut(cut);
    },
  };
}
