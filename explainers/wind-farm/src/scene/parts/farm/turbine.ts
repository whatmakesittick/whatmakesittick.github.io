import { LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry } from 'three';
import { extrudeProfileAlongX, roundedRectShape } from '@core/scene/geometry/extrude';
import { latheAlongX, sampleProfile } from '@core/scene/geometry/lathe';
import type { ProfilePoint } from '@core/scene/geometry/lathe';
import { TURBINE_GEOMETRY } from '../../../model';
import { THEME } from '../../../theme';
import { mergeParts, slab, tinted } from './geometry';

const TOWER_SEGMENTS = 16;
const TOWER_SINK_M = 3;
const TOWER_FLANGE_M = 0.15;
const TOWER_FLANGE_HEIGHT_M = 0.8;
const NACELLE_CORNER_M = 0.7;
const COOLER_INSET_M = 0.2;
const SPINNER_SAMPLES = 8;
const SPINNER_SEGMENTS = 14;

const NACELLE = TURBINE_GEOMETRY.nacelle;
const COOLER = TURBINE_GEOMETRY.cooler;
const [HUB_X] = TURBINE_GEOMETRY.hub;
const SPINNER_RADIUS = TURBINE_GEOMETRY.spinnerRadius;

const SPINNER_PROFILE: readonly ProfilePoint[] = [
  [HUB_X - 2.6, 0],
  [HUB_X - 2.2, 0.95],
  [HUB_X - 1.3, 1.6],
  [HUB_X, SPINNER_RADIUS],
  [HUB_X + 1.8, SPINNER_RADIUS * 0.95],
  [NACELLE.minX, SPINNER_RADIUS * 0.85],
];

export function towerGeometry(): BufferGeometry {
  const base = TURBINE_GEOMETRY.towerBaseDiameter / 2;
  const top = TURBINE_GEOMETRY.towerTopDiameter / 2;
  const profile = [
    new Vector2(base + TOWER_FLANGE_M, -TOWER_SINK_M),
    new Vector2(base + TOWER_FLANGE_M, TOWER_FLANGE_HEIGHT_M),
    new Vector2(base, TOWER_FLANGE_HEIGHT_M),
    new Vector2(top, TURBINE_GEOMETRY.towerTopY),
  ];
  return new LatheGeometry(profile, TOWER_SEGMENTS);
}

export function nacelleGeometry(): BufferGeometry {
  const shell = roundedRectShape(
    { minA: -NACELLE.halfWidth, maxA: NACELLE.halfWidth, minB: NACELLE.minY, maxB: NACELLE.maxY },
    NACELLE_CORNER_M,
  );
  const body = tinted(extrudeProfileAlongX(shell, NACELLE.minX, NACELLE.maxX), THEME.turbineWhite);
  const cooler = tinted(
    slab(
      [COOLER.minX, NACELLE.maxY - COOLER_INSET_M, -NACELLE.halfWidth + COOLER_INSET_M],
      [COOLER.maxX - COOLER_INSET_M, COOLER.topY, NACELLE.halfWidth - COOLER_INSET_M],
    ),
    THEME.cooler,
  );
  return mergeParts([body, cooler]);
}

export function spinnerGeometry(): BufferGeometry {
  return latheAlongX(sampleProfile(SPINNER_PROFILE, SPINNER_SAMPLES), SPINNER_SEGMENTS).translate(
    0,
    TURBINE_GEOMETRY.shaftY,
    0,
  );
}
