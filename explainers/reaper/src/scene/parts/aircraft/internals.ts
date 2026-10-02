import { CylinderGeometry, Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { box } from '@core/scene/geometry/box';
import { latheAlongX, sampleProfile } from '@core/scene/geometry/lathe';
import { anchorAt } from '@core/scene/parts';
import { ENGINE, FUEL_TANK, WING } from '../../constants';
import { FINISHES } from '../../finishes';
import { airfoilSurface } from '../../geometry/airfoilSurface';
import type { LoopPoint, Station } from '../../geometry/airfoilSurface';
import { rod } from '../../geometry/rods';
import { chordAt, chordLineY, leadingEdgeX } from '../../geometry/wing';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

const QUARTER_TURN = Math.PI / 2;
const DUCT_SEGMENTS = 14;

export interface Internals {
  object: Group;
  fuelAnchor: Object3D;
  engineAnchor: Object3D;
}

function turned(
  points: readonly (readonly [number, number])[],
  samples = ENGINE.samples,
): BufferGeometry {
  return latheAlongX(sampleProfile(points, samples), ENGINE.segments);
}

function centreTank(): BufferGeometry {
  const { profile, y, squash } = FUEL_TANK.centre;
  const tank = latheAlongX(sampleProfile(profile, FUEL_TANK.samples), FUEL_TANK.segments);
  tank.scale(1, squash, 1);
  tank.translate(0, y, 0);
  return tank;
}

function wingTankStation(span: number, side: 1 | -1): Station {
  const { leadingShare, chordShare, thickness } = FUEL_TANK.wing;
  const chord = chordAt(span);
  return {
    leadingEdge: [leadingEdgeX(span) - leadingShare * chord, chordLineY(span), side * span],
    chordAxis: [-1, 0, 0],
    normalAxis: [0, 1, 0],
    chord: chordShare * chord,
    thickness,
    camber: WING.camber,
  };
}

function wingTanks(loop: readonly LoopPoint[]): BufferGeometry {
  const { from, to } = FUEL_TANK.wing;
  return mergeParts(
    ([1, -1] as const).map((side) =>
      airfoilSurface([wingTankStation(from, side), wingTankStation(to, side)], loop),
    ),
  );
}

function engineRings(): BufferGeometry {
  return mergeParts(
    ENGINE.rings.map((x) => {
      const ring = new CylinderGeometry(
        ENGINE.ringRadius,
        ENGINE.ringRadius,
        ENGINE.ringWidth,
        ENGINE.segments,
      );
      ring.rotateZ(QUARTER_TURN);
      ring.translate(x, 0, 0);
      return ring;
    }),
  );
}

function accessories(): BufferGeometry {
  return mergeParts(
    ENGINE.accessories.map(({ at, size }) =>
      box({
        minX: at[0] - size[0] / 2,
        maxX: at[0] + size[0] / 2,
        minY: at[1] - size[1] / 2,
        maxY: at[1] + size[1] / 2,
        minZ: at[2] - size[2] / 2,
        maxZ: at[2] + size[2] / 2,
      }),
    ),
  );
}

function ducts(): BufferGeometry {
  const { intakeDuct, exhaust, shaft } = ENGINE;
  const mirrored = (point: readonly [number, number, number]) =>
    [point[0], point[1], -point[2]] as const;
  return mergeParts([
    rod(intakeDuct.from, intakeDuct.to, intakeDuct.radius, DUCT_SEGMENTS),
    rod(exhaust.from, exhaust.to, exhaust.radius, DUCT_SEGMENTS),
    rod(mirrored(exhaust.from), mirrored(exhaust.to), exhaust.radius, DUCT_SEGMENTS),
    rod([shaft.from, 0, 0], [shaft.to, 0, 0], shaft.radius, DUCT_SEGMENTS),
  ]);
}

export function buildInternals(context: PartContext, loop: readonly LoopPoint[]): Internals {
  const object = new Group();
  const fuel = new Group();
  const engine = new Group();
  fuel.add(
    partMesh(context, centreTank(), 'fuelTank', FINISHES.fuel),
    partMesh(context, wingTanks(loop), 'fuelTank', FINISHES.fuel),
  );
  engine.add(
    partMesh(context, mergeParts([turned(ENGINE.core), engineRings()]), 'engine', FINISHES.engine),
    partMesh(context, turned(ENGINE.gearbox), 'engine', FINISHES.gearbox),
    partMesh(context, mergeParts([accessories(), ducts()]), 'engine', FINISHES.strut),
  );
  object.add(fuel, engine);
  const engineMiddle = (ENGINE.core[0][0] + ENGINE.gearbox[0][0]) / 2;
  return {
    object,
    fuelAnchor: anchorAt(fuel, FUEL_TANK.labelX, FUEL_TANK.centre.y, 0),
    engineAnchor: anchorAt(engine, engineMiddle, 0, 0),
  };
}
