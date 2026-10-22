import { LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry, Vector3Tuple } from 'three';
import { box } from '@core/scene/geometry/box';
import { extrudePlan, planShape } from '@core/scene/geometry/extrude';
import { TRACK_TONES } from '../finishes';
import { mergeParts } from '../../../line/geometry';
import { painted } from '../geometry/paint';
import { alongSegment, rod, segmentLength } from '../geometry/rod';
import { CANTILEVER, INSULATOR, MAST } from './constants';
import { cantileverPoints, towards } from './cantilever';
import { mastPlan } from './profiles';

interface Tube {
  readonly radius: number;
  readonly sides: number;
}

const { steel, insulator, footing } = TRACK_TONES.mast;

function footingBlock(): BufferGeometry {
  const { halfWidth, top, bottom } = MAST.footing;
  const geometry = box({
    minX: -halfWidth,
    maxX: halfWidth,
    minY: bottom,
    maxY: top,
    minZ: MAST.z - halfWidth,
    maxZ: MAST.z + halfWidth,
  });
  return painted(geometry, footing);
}

function capPlate(): BufferGeometry {
  const half = MAST.section / 2 + MAST.capThickness;
  const geometry = box({
    minX: -half,
    maxX: half,
    minY: MAST.top,
    maxY: MAST.top + MAST.capThickness,
    minZ: MAST.z - half,
    maxZ: MAST.z + half,
  });
  return painted(geometry, steel);
}

function hColumn(): BufferGeometry {
  return painted(extrudePlan(planShape(mastPlan()), MAST.footing.top, MAST.top), steel);
}

function squareColumn(): BufferGeometry {
  const half = MAST.section / 2;
  const geometry = box({
    minX: -half,
    maxX: half,
    minY: MAST.footing.top,
    maxY: MAST.top,
    minZ: MAST.z - half,
    maxZ: MAST.z + half,
  });
  return painted(geometry, steel);
}

function tube(from: Vector3Tuple, to: Vector3Tuple, { radius, sides }: Tube): BufferGeometry {
  return painted(rod({ from, to, radius, sides }), steel);
}

function insulatorProfile(length: number): Vector2[] {
  const sheds = INSULATOR.shedShares.flatMap((share) => {
    const at = share * length;
    return [
      new Vector2(INSULATOR.core, at - INSULATOR.shedHalfThickness),
      new Vector2(INSULATOR.shed, at),
      new Vector2(INSULATOR.core, at + INSULATOR.shedHalfThickness),
    ];
  });
  return [new Vector2(INSULATOR.core, 0), ...sheds, new Vector2(INSULATOR.core, length)];
}

function insulatorAlong(from: Vector3Tuple, to: Vector3Tuple): BufferGeometry {
  const lathe = new LatheGeometry(insulatorProfile(segmentLength(from, to)), INSULATOR.segments);
  return painted(alongSegment(lathe, from, to), insulator);
}

export function nearMast(): BufferGeometry {
  const points = cantileverPoints();
  const tubeSpec = CANTILEVER.nearTube;
  const upperInsulatorEnd = towards(points.upperMount, points.upperEnd, CANTILEVER.insulatorLength);
  const lowerInsulatorEnd = towards(points.lowerMount, points.apex, CANTILEVER.insulatorLength);
  const hook = { radius: CANTILEVER.hookRadius, sides: CANTILEVER.steadyArm.sides };
  return mergeParts([
    footingBlock(),
    hColumn(),
    capPlate(),
    insulatorAlong(points.upperMount, upperInsulatorEnd),
    insulatorAlong(points.lowerMount, lowerInsulatorEnd),
    tube(upperInsulatorEnd, points.upperEnd, tubeSpec),
    tube(lowerInsulatorEnd, points.apex, tubeSpec),
    tube(points.registrationStart, points.registrationEnd, tubeSpec),
    tube(points.steadyArmStart, points.steadyArmEnd, CANTILEVER.steadyArm),
    tube(points.hookTop, points.hookBottom, hook),
  ]);
}

export function farMast(): BufferGeometry {
  const points = cantileverPoints();
  const tubeSpec = CANTILEVER.farTube;
  return mergeParts([
    footingBlock(),
    squareColumn(),
    tube(points.upperMount, points.upperEnd, tubeSpec),
    tube(points.lowerMount, points.apex, tubeSpec),
    tube(points.registrationStart, points.registrationEnd, tubeSpec),
  ]);
}
