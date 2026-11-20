import type { BufferGeometry, Group } from 'three';
import { lerp, toRadians } from '@core/math';
import { SEGMENTS } from '../constants';
import { FINISHES } from '../finishes';
import { bladeGeometry } from '../geometry/blade';
import {
  FAN_CASE,
  LIP_PROFILE,
  STATION_X,
  ductOuterAt,
  nacelleOuterAt,
  reversed,
} from '../geometry/profiles';
import { line, revolve, ring, smooth } from '../geometry/revolve';
import type { Strand } from '../geometry/revolve';
import { offsetCurve, shellStrands } from '../geometry/shells';
import type { PartContext } from './context';
import { FAN_COWL_PANELS, applyPanels } from './panels';
import { STRUCTURE_GROUP, cutMaterial, label, material, mesh, namedGroup, polar } from './context';

const LIP_SAMPLES = 32;
const SKIN_SAMPLES = 36;
const DUCT_SAMPLES = 16;
const SKIN_WALL = 0.035;
const DUCT_WALL = 0.03;
const LINER_DEPTH = 0.004;
const AFT_LINER = { from: -2.11, to: -1.9 } as const;
const BULKHEAD = 0.03;
const FRAME_STATIONS = [-0.45, 0.4] as const;
const FAN_CASE_FLANGE = 0.05;

const PYLON = {
  base: 1.75,
  top: 2.95,
  chordBase: 2.9,
  chordTop: 2.7,
  stackBase: 0,
  stackTop: 0.45,
  thickness: 0.42,
  capLift: 0.003,
} as const;

const skinInside = offsetCurve(nacelleOuterAt, -SKIN_WALL);
const ductBack = offsetCurve(ductOuterAt, DUCT_WALL);

function lipStrands(): Strand[] {
  const curve = reversed(smooth(LIP_PROFILE, LIP_SAMPLES));
  return [curve, line(curve[curve.length - 1], curve[0])];
}

function skinStrands(): { outer: Strand; inside: Strand[] } {
  const [outer, ...inside] = shellStrands(
    skinInside,
    nacelleOuterAt,
    STATION_X.lipJoint,
    STATION_X.fixedNacelleEnd,
    SKIN_SAMPLES,
  );
  return { outer, inside };
}

function bulkhead(x: number, inner: number): BufferGeometry {
  return ring(x - BULKHEAD / 2, x + BULKHEAD / 2, inner, skinInside(x), SEGMENTS.shell);
}

function frames(): BufferGeometry[] {
  return [
    bulkhead(STATION_X.lipJoint + BULKHEAD / 2, FAN_CASE.outer),
    ...FRAME_STATIONS.map((x) => bulkhead(x, ductBack(x))),
    bulkhead(STATION_X.fixedNacelleEnd - BULKHEAD / 2, ductBack(STATION_X.fixedNacelleEnd)),
  ];
}

function pylonShare(radius: number): number {
  return (radius - PYLON.base) / (PYLON.top - PYLON.base);
}

function pylonGeometry(from: number, to: number) {
  const height = (share: number) => pylonShare(lerp(from, to, share));
  return bladeGeometry({
    hub: from,
    tip: to,
    stations: 3,
    samples: 14,
    chord: (share) => lerp(PYLON.chordBase, PYLON.chordTop, height(share)),
    stagger: () => 0,
    camber: () => 0,
    thickness: () => PYLON.thickness / PYLON.chordBase,
    sweep: (share) => lerp(PYLON.stackBase, PYLON.stackTop, height(share)),
  });
}

export function buildNacelle(context: PartContext, engine: Group): void {
  const nacelle = namedGroup('nacelle', engine);
  const skin = skinStrands();
  const cavity = cutMaterial(context, 'nacelle', FINISHES.nacelleCavity);
  const paint = applyPanels(
    cutMaterial(context, 'nacelle', FINISHES.nacelle),
    FAN_COWL_PANELS,
    'cowl',
  );
  mesh(context, nacelle, revolve([skin.outer], SEGMENTS.shell), paint);
  mesh(context, nacelle, revolve(skin.inside, SEGMENTS.shell), cavity);
  mesh(
    context,
    nacelle,
    revolve(
      shellStrands(
        ductOuterAt,
        ductBack,
        STATION_X.fanCaseEnd,
        STATION_X.fixedNacelleEnd,
        DUCT_SAMPLES,
      ),
      SEGMENTS.shell,
    ),
    cutMaterial(context, 'nacelle', FINISHES.nacelleInner),
  );
  frames().forEach((frame) => mesh(context, nacelle, frame, cavity));
  label(context, 'nacelle', nacelle, polar(-1.1, 2.34, toRadians(48)));

  const lip = namedGroup('intakeLip', engine);
  mesh(
    context,
    lip,
    revolve(lipStrands(), SEGMENTS.shell),
    cutMaterial(context, 'intakeLip', FINISHES.intakeLip),
  );
  label(context, 'intakeLip', lip, polar(STATION_X.lip, 1.97, toRadians(98)));

  const fanCase = namedGroup('fanCase', engine);
  const caseSurface = cutMaterial(context, 'fanCase', FINISHES.fanCase);
  mesh(
    context,
    fanCase,
    ring(STATION_X.lipJoint, STATION_X.fanCaseEnd, FAN_CASE.inner, FAN_CASE.outer, SEGMENTS.shell),
    caseSurface,
  );
  const flangeTop = FAN_CASE.outer + FAN_CASE_FLANGE;
  mesh(
    context,
    fanCase,
    ring(
      STATION_X.fanCaseEnd - BULKHEAD,
      STATION_X.fanCaseEnd,
      FAN_CASE.outer,
      flangeTop,
      SEGMENTS.shell,
    ),
    caseSurface,
  );
  const liner = cutMaterial(context, 'fanCase', FINISHES.acousticLiner);
  const linerInner = FAN_CASE.inner - LINER_DEPTH;
  mesh(
    context,
    fanCase,
    ring(FAN_CASE.linerFrom, FAN_CASE.linerTo, linerInner, FAN_CASE.inner, SEGMENTS.shell),
    liner,
  );
  mesh(
    context,
    fanCase,
    ring(AFT_LINER.from, AFT_LINER.to, linerInner, FAN_CASE.inner, SEGMENTS.shell),
    liner,
  );
  label(context, 'fanCase', fanCase, polar(-2.52, FAN_CASE.inner, toRadians(150)));

  const pylon = namedGroup('pylon', engine);
  mesh(
    context,
    pylon,
    pylonGeometry(PYLON.base, PYLON.top),
    material(context, STRUCTURE_GROUP, FINISHES.pylon),
  );
  mesh(
    context,
    pylon,
    pylonGeometry(PYLON.top, PYLON.top + PYLON.capLift),
    material(context, STRUCTURE_GROUP, FINISHES.pylonCap),
  );
}
