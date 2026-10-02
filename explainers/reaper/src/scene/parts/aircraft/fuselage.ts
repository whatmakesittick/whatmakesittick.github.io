import { CylinderGeometry, Group, Quaternion, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { roundedRectShape, extrudeProfileAlongX } from '@core/scene/geometry/extrude';
import {
  AIRFRAME_SHADE,
  ANTENNA_BLADE,
  ANTENNAS,
  EXHAUST,
  FUSELAGE,
  HUMP,
  INTAKE,
  PROBE,
} from '../../constants';
import { FINISHES } from '../../finishes';
import { airfoilSurface } from '../../geometry/airfoilSurface';
import type { LoopPoint, Station, Vec3 } from '../../geometry/airfoilSurface';
import { loftGeometry, sectionCurve } from '../../geometry/loft';
import { shadeUnderside } from '../../geometry/shading';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';
import type { CutawaySwitch } from './cutaway';

const QUARTER_TURN = Math.PI / 2;
const Y_AXIS = new Vector3(0, 1, 0);
const BACKWARD: Vec3 = [-1, 0, 0];
const RIGHT: Vec3 = [0, 0, 1];
const PROBE_SEGMENTS = 8;
const PIPE_SEGMENTS = 14;
const INTAKE_ROUNDING = 0.05;
const MOUTH_INSET = 0.025;
const MOUTH_DEPTH = 0.04;

function fuselageGeometry(): BufferGeometry {
  return shadeUnderside(
    loftGeometry(FUSELAGE.sections, {
      radialSegments: FUSELAGE.radialSegments,
      samplesBetween: FUSELAGE.samplesBetween,
      squareness: FUSELAGE.squareness,
      capStart: true,
      capEnd: true,
    }),
    AIRFRAME_SHADE,
  );
}

function humpGeometry(): BufferGeometry {
  return shadeUnderside(
    loftGeometry(HUMP.sections, {
      radialSegments: HUMP.radialSegments,
      samplesBetween: HUMP.samplesBetween,
      squareness: HUMP.squareness,
      capStart: true,
      capEnd: true,
    }),
    AIRFRAME_SHADE,
  );
}

export function fuselageTopAt(x: number): number {
  return sectionCurve(FUSELAGE.sections)(x).top;
}

function intakeGeometry(): { body: BufferGeometry; mouth: BufferGeometry } {
  const top = fuselageTopAt((INTAKE.x[0] + INTAKE.x[1]) / 2);
  const outline = {
    minA: -INTAKE.halfWidth,
    maxA: INTAKE.halfWidth,
    minB: top - INTAKE.height,
    maxB: top + INTAKE.height,
  };
  const body = extrudeProfileAlongX(
    roundedRectShape(outline, INTAKE_ROUNDING),
    INTAKE.x[1],
    INTAKE.x[0],
  );
  const inner = {
    minA: outline.minA + MOUTH_INSET,
    maxA: outline.maxA - MOUTH_INSET,
    minB: top - MOUTH_INSET,
    maxB: outline.maxB - MOUTH_INSET,
  };
  const mouth = extrudeProfileAlongX(
    roundedRectShape(inner, INTAKE_ROUNDING),
    INTAKE.x[0] - MOUTH_DEPTH,
    INTAKE.x[0] + INTAKE.lipThickness,
  );
  return { body: shadeUnderside(body, AIRFRAME_SHADE), mouth };
}

function exhaustGeometry(side: 1 | -1): BufferGeometry {
  const pipe = new CylinderGeometry(
    EXHAUST.radius,
    EXHAUST.radius * EXHAUST.flare,
    EXHAUST.length,
    PIPE_SEGMENTS,
    1,
    true,
  );
  pipe.translate(0, EXHAUST.length / 2, 0);
  const direction = new Vector3(
    -Math.sin(EXHAUST.sweep),
    -Math.sin(EXHAUST.droop),
    side * Math.cos(EXHAUST.sweep),
  ).normalize();
  pipe.applyQuaternion(new Quaternion().setFromUnitVectors(Y_AXIS, direction));
  pipe.translate(EXHAUST.base[0], EXHAUST.base[1], side * EXHAUST.side);
  return pipe;
}

function antennaGeometry(loop: readonly LoopPoint[]): BufferGeometry {
  const { thickness, tipChord, tipSetBack, sink } = ANTENNA_BLADE;
  const blades = ANTENNAS.map(({ at, height, chord, down }) => {
    const sign = down ? -1 : 1;
    const station = (leadingEdge: Vec3, length: number): Station => ({
      leadingEdge,
      chordAxis: BACKWARD,
      normalAxis: RIGHT,
      chord: length,
      thickness,
      camber: 0,
    });
    return airfoilSurface(
      [
        station([at[0] + chord / 2, at[1] - sign * sink, at[2]], chord),
        station([at[0] - chord * tipSetBack, at[1] + sign * height, at[2]], chord * tipChord),
      ],
      loop,
    );
  });
  return mergeParts(blades);
}

function probeGeometry(): BufferGeometry {
  const probe = new CylinderGeometry(PROBE.radius, PROBE.radius, PROBE.length, PROBE_SEGMENTS);
  probe.rotateZ(-QUARTER_TURN);
  probe.translate(PROBE.at[0] + PROBE.length / 2, PROBE.at[1], PROBE.at[2]);
  return probe;
}

export function buildFuselage(
  context: PartContext,
  cutaway: CutawaySwitch,
  loop: readonly LoopPoint[],
): Group {
  const group = new Group();
  const shell = fuselageGeometry();
  const hump = humpGeometry();
  const intake = intakeGeometry();
  group.add(
    cutaway.whole(partMesh(context, shell, 'fuselage', context.looks.fuselage)),
    cutaway.opened(partMesh(context, shell.clone(), 'fuselage', FINISHES.airframeGhost)),
    cutaway.whole(partMesh(context, hump, 'noseHump', context.looks.hump)),
    cutaway.opened(partMesh(context, hump.clone(), 'noseHump', FINISHES.airframeGhost)),
    partMesh(context, intake.body, 'engine', FINISHES.plain),
    partMesh(context, intake.mouth, 'engine', FINISHES.well),
    partMesh(
      context,
      mergeParts([exhaustGeometry(1), exhaustGeometry(-1)]),
      'engine',
      FINISHES.strut,
    ),
    partMesh(context, antennaGeometry(loop), 'fuselage', FINISHES.dark),
    partMesh(context, probeGeometry(), 'fuselage', FINISHES.chrome),
  );
  return group;
}
