import { BoxGeometry, Quaternion, TubeGeometry, Vector3 } from 'three';
import type { BufferGeometry, Group } from 'three';
import { CatmullRomCurve3 } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { PartContext } from './context';
import { mesh, material, namedGroup } from './context';
import {
  bevelGearGeometry,
  cylinderAlongZ,
  layoutTrain,
  mergePlain,
  spurGearGeometry,
} from '../geometry/gears';
import type { TrainGear } from '../geometry/gears';

const GEAR_FINISH: MaterialFinish = {
  color: '#e3e8ee',
  roughness: 0.3,
  metalness: 0.95,
  envMapIntensity: 1.5,
};
const HOUSING_FINISH: MaterialFinish = { color: '#3b4149', roughness: 0.5, metalness: 0.6 };
const UNIT_FINISH: MaterialFinish = {
  color: '#8794a3',
  roughness: 0.38,
  metalness: 0.85,
  envMapIntensity: 1.1,
};

const AXIS_Y = -0.745;
const AXIS_Z = 0.43;
const RADIAL = new Vector3(0, -Math.sqrt(0.75), 0.5);
const Z_AXIS = new Vector3(0, 0, 1);
const X_AXIS = new Vector3(1, 0, 0);

const RADIAL_RATIO = 1.3;
const SHAFT_RADIUS = 0.02;
const SEGMENTS = 14;
const BOLT_SEGMENTS = 6;

const CORE_GEAR = { x: -1.5, teeth: 58, module: 0.008, length: 0.04, narrow: 0.92, collar: 0.19 };
const RADIAL_PINION = { teeth: 10, module: 0.008, length: 0.04, narrow: 0.6, start: 0.25 };
const FAIRING = { from: 0.45, to: 0.8, radius: 0.03 };
const TRANSFER = { from: 0.8, to: 0.9, radius: 0.065 };
const RADIAL_X = CORE_GEAR.x + CORE_GEAR.length / 2;

const HOUSING = {
  from: -0.95,
  to: 0.15,
  height: 0.22,
  zBack: 0.365,
  zFront: 0.495,
  wall: 0.008,
  flange: 0.014,
  flangeDepth: 0.008,
  boltSpacing: 0.06,
  boltRadius: 0.0045,
};

const TRAIN = {
  teeth: [30, 42, 24, 36, 22, 32],
  offsets: [0, -0.01, 0.01, -0.01, 0.01, -0.01],
  module: 0.004,
  startX: -0.84,
  z: 0.41,
  faceWidth: 0.035,
  holes: [5, 6, 4, 5, 4, 5],
  hubScale: 0.2,
  pin: 0.008,
  bevelTeeth: 16,
  bevelNarrow: 0.5,
};

const STARTER = { from: 0.15, to: 0.35, radius: 0.07, flangeRadius: 0.092, flangeLength: 0.014 };
const DUCT = { radius: 0.024, flangeRadius: 0.036 };
const PUMPS = [
  { x: -0.58, radius: 0.05, height: 0.11, neck: 0.03 },
  { x: -0.3, radius: 0.042, height: 0.09, neck: 0.025 },
];

interface Spinner {
  readonly pivot: Group;
  readonly ratio: number;
  readonly phase: number;
}

function orient(direction: Vector3): Quaternion {
  return new Quaternion().setFromUnitVectors(Z_AXIS, direction);
}

function cylinderBetween(
  from: Vector3,
  to: Vector3,
  radius: number,
  segments = SEGMENTS,
): BufferGeometry {
  const axis = to.clone().sub(from);
  const geometry = cylinderAlongZ(radius, axis.length(), segments);
  geometry.applyQuaternion(orient(axis.clone().normalize()));
  const middle = from.clone().add(to).multiplyScalar(0.5);
  geometry.translate(middle.x, middle.y, middle.z);
  return geometry;
}

function box(size: Vector3, centre: Vector3): BoxGeometry {
  const geometry = new BoxGeometry(size.x, size.y, size.z);
  geometry.translate(centre.x, centre.y, centre.z);
  return geometry;
}

function alongZ(geometry: BufferGeometry, from: number, to: number): BufferGeometry {
  geometry.translate(0, 0, (from + to) / 2);
  return geometry;
}

function bevel(teeth: number, module: number, length: number, narrow: number): BufferGeometry {
  return bevelGearGeometry({ teeth, module, length, narrowScale: narrow });
}

function coreGearGeometry(): BufferGeometry {
  const gear = bevel(CORE_GEAR.teeth, CORE_GEAR.module, CORE_GEAR.length, CORE_GEAR.narrow);
  const collar = alongZ(
    cylinderAlongZ(CORE_GEAR.collar, CORE_GEAR.length + 0.01, SEGMENTS * 2),
    0,
    CORE_GEAR.length,
  );
  return mergePlain([gear, collar]);
}

function radialShaftGeometry(): BufferGeometry {
  const pinion = bevel(
    RADIAL_PINION.teeth,
    RADIAL_PINION.module,
    RADIAL_PINION.length,
    RADIAL_PINION.narrow,
  );
  const shaftLength = FAIRING.to - RADIAL_PINION.start - RADIAL_PINION.length;
  const shaft = alongZ(
    cylinderAlongZ(SHAFT_RADIUS, shaftLength, SEGMENTS),
    RADIAL_PINION.length,
    RADIAL_PINION.length + shaftLength,
  );
  return mergePlain([pinion, shaft]);
}

function bevelReach(): number {
  return (TRAIN.bevelTeeth * TRAIN.module) / 2;
}

function bevelLength(): number {
  return bevelReach() / 2;
}

function bevelCentreZ(): number {
  return TRAIN.z + TRAIN.faceWidth / 2 + bevelReach();
}

function horizontalShaftGeometry(firstX: number): BufferGeometry {
  const pinion = bevel(TRAIN.bevelTeeth, TRAIN.module, bevelLength(), TRAIN.bevelNarrow);
  const wideX = firstX - bevelReach();
  const length = wideX - RADIAL_X;
  const shaft = alongZ(cylinderAlongZ(SHAFT_RADIUS, length, SEGMENTS), -length, 0);
  return mergePlain([pinion, shaft]);
}

function spurGear(index: number): BufferGeometry {
  const teeth = TRAIN.teeth[index];
  const radius = (teeth * TRAIN.module) / 2;
  const body = spurGearGeometry({
    teeth,
    module: TRAIN.module,
    faceWidth: TRAIN.faceWidth,
    holes: TRAIN.holes[index],
    hubRadius: radius * TRAIN.hubScale,
    hubProtrusion: 0.004,
  });
  if (index > 0) return body;
  const crown = bevel(TRAIN.bevelTeeth, TRAIN.module, bevelLength(), TRAIN.bevelNarrow);
  crown.translate(0, 0, TRAIN.faceWidth / 2);
  return mergePlain([body, crown]);
}

function housingShell(): BufferGeometry[] {
  const length = HOUSING.to - HOUSING.from;
  const depth = HOUSING.zFront - HOUSING.zBack;
  const middleX = (HOUSING.from + HOUSING.to) / 2;
  const middleZ = (HOUSING.zFront + HOUSING.zBack) / 2;
  const half = HOUSING.height / 2;
  const wall = HOUSING.wall;
  return [
    box(
      new Vector3(length, HOUSING.height, wall),
      new Vector3(middleX, AXIS_Y, HOUSING.zBack + wall / 2),
    ),
    box(new Vector3(length, wall, depth), new Vector3(middleX, AXIS_Y + half - wall / 2, middleZ)),
    box(new Vector3(length, wall, depth), new Vector3(middleX, AXIS_Y - half + wall / 2, middleZ)),
    box(
      new Vector3(wall, HOUSING.height, depth),
      new Vector3(HOUSING.from + wall / 2, AXIS_Y, middleZ),
    ),
    box(
      new Vector3(wall, HOUSING.height, depth),
      new Vector3(HOUSING.to - wall / 2, AXIS_Y, middleZ),
    ),
  ];
}

function housingFlange(): BufferGeometry[] {
  const length = HOUSING.to - HOUSING.from;
  const middleX = (HOUSING.from + HOUSING.to) / 2;
  const z = HOUSING.zFront + HOUSING.flangeDepth / 2;
  const rim = HOUSING.flange;
  const half = HOUSING.height / 2;
  const parts: BufferGeometry[] = [];
  const bar = (size: Vector3, centre: Vector3): void => {
    parts.push(box(size, centre));
  };
  const wide = length + 2 * rim;
  bar(
    new Vector3(wide, rim, HOUSING.flangeDepth),
    new Vector3(middleX, AXIS_Y + half + rim / 2, z),
  );
  bar(
    new Vector3(wide, rim, HOUSING.flangeDepth),
    new Vector3(middleX, AXIS_Y - half - rim / 2, z),
  );
  bar(
    new Vector3(rim, HOUSING.height, HOUSING.flangeDepth),
    new Vector3(HOUSING.from - rim / 2, AXIS_Y, z),
  );
  bar(
    new Vector3(rim, HOUSING.height, HOUSING.flangeDepth),
    new Vector3(HOUSING.to + rim / 2, AXIS_Y, z),
  );
  return parts;
}

function bolt(x: number, y: number): BufferGeometry {
  const z = HOUSING.zFront + HOUSING.flangeDepth;
  return cylinderBetween(
    new Vector3(x, y, z),
    new Vector3(x, y, z + HOUSING.boltRadius),
    HOUSING.boltRadius,
    BOLT_SEGMENTS,
  );
}

function housingBolts(): BufferGeometry[] {
  const length = HOUSING.to - HOUSING.from;
  const count = Math.round(length / HOUSING.boltSpacing);
  const half = HOUSING.height / 2 + HOUSING.flange / 2;
  const parts: BufferGeometry[] = [];
  for (let index = 0; index <= count; index += 1) {
    const x = HOUSING.from + (length * index) / count;
    parts.push(bolt(x, AXIS_Y + half), bolt(x, AXIS_Y - half));
  }
  const side = HOUSING.flange / 2;
  parts.push(bolt(HOUSING.from - side, AXIS_Y), bolt(HOUSING.to + side, AXIS_Y));
  return parts;
}

function gearPins(gears: readonly TrainGear[]): BufferGeometry[] {
  return gears.map((gear) =>
    cylinderBetween(
      new Vector3(gear.x, AXIS_Y + gear.y, HOUSING.zBack),
      new Vector3(gear.x, AXIS_Y + gear.y, TRAIN.z + TRAIN.faceWidth / 2 + 0.006),
      TRAIN.pin,
      BOLT_SEGMENTS,
    ),
  );
}

function radialPoint(distance: number): Vector3 {
  return RADIAL.clone().multiplyScalar(distance);
}

function radialHousing(): BufferGeometry[] {
  const drum = cylinderBetween(
    radialPoint(TRANSFER.from),
    radialPoint(TRANSFER.to),
    TRANSFER.radius,
    SEGMENTS * 2,
  );
  drum.translate(RADIAL_X, 0, 0);
  const fairing = cylinderBetween(
    radialPoint(FAIRING.from),
    radialPoint(FAIRING.to),
    FAIRING.radius,
    SEGMENTS,
  );
  fairing.translate(RADIAL_X, 0, 0);
  return [drum, fairing];
}

function housingGeometry(gears: readonly TrainGear[]): BufferGeometry {
  return mergePlain([
    ...housingShell(),
    ...housingFlange(),
    ...housingBolts(),
    ...gearPins(gears),
    ...radialHousing(),
  ]);
}

function ductElbow(): BufferGeometry[] {
  const x = (STARTER.from + STARTER.to) / 2 + 0.03;
  const top = AXIS_Y + STARTER.radius;
  const path = new CatmullRomCurve3([
    new Vector3(x, top - 0.01, AXIS_Z),
    new Vector3(x, top + 0.07, AXIS_Z),
    new Vector3(x + 0.04, top + 0.12, AXIS_Z),
    new Vector3(x + 0.11, top + 0.13, AXIS_Z),
  ]);
  const tube = new TubeGeometry(path, 24, DUCT.radius, SEGMENTS, false);
  const end = path.getPoint(1);
  const flange = cylinderBetween(
    end.clone().add(new Vector3(-0.008, 0, 0)),
    end.clone().add(new Vector3(0.008, 0, 0)),
    DUCT.flangeRadius,
    SEGMENTS,
  );
  return [tube, flange];
}

function starter(): BufferGeometry[] {
  const from = new Vector3(STARTER.from, AXIS_Y, AXIS_Z);
  const flangeEnd = new Vector3(STARTER.from + STARTER.flangeLength, AXIS_Y, AXIS_Z);
  const drum = cylinderBetween(
    flangeEnd,
    new Vector3(STARTER.to, AXIS_Y, AXIS_Z),
    STARTER.radius,
    SEGMENTS * 2,
  );
  const flange = cylinderBetween(from, flangeEnd, STARTER.flangeRadius, SEGMENTS * 2);
  const cap = cylinderBetween(
    new Vector3(STARTER.to, AXIS_Y, AXIS_Z),
    new Vector3(STARTER.to + 0.025, AXIS_Y, AXIS_Z),
    STARTER.radius * 0.6,
    SEGMENTS,
  );
  return [drum, flange, cap, ...ductElbow()];
}

function pumps(): BufferGeometry[] {
  const bottom = AXIS_Y - HOUSING.height / 2;
  return PUMPS.flatMap((pump) => {
    const top = new Vector3(pump.x, bottom, AXIS_Z);
    const base = new Vector3(pump.x, bottom - pump.height, AXIS_Z);
    const neck = new Vector3(pump.x, bottom - pump.height - pump.neck, AXIS_Z);
    return [
      cylinderBetween(top, base, pump.radius, SEGMENTS * 2),
      cylinderBetween(base, neck, pump.radius * 0.45, SEGMENTS),
    ];
  });
}

function unitsGeometry(): BufferGeometry {
  return mergePlain([...starter(), ...pumps()]);
}

export class GearboxPart {
  readonly root: Group;
  private readonly spinners: Spinner[] = [];

  constructor(context: PartContext, engine: Group) {
    this.root = namedGroup('gearbox', engine);
    const gears = layoutTrain({
      teeth: TRAIN.teeth,
      offsets: TRAIN.offsets,
      module: TRAIN.module,
      startX: TRAIN.startX,
      inputRatio: RADIAL_RATIO,
    });
    const steel = material(context, 'outerShaft', GEAR_FINISH);
    this.addSpinner(context, steel, coreGearGeometry(), {
      position: new Vector3(CORE_GEAR.x, 0, 0),
      quaternion: orient(X_AXIS),
      ratio: 1,
      phase: 0,
    });
    this.addSpinner(context, steel, radialShaftGeometry(), {
      position: radialPoint(RADIAL_PINION.start).add(new Vector3(RADIAL_X, 0, 0)),
      quaternion: orient(RADIAL),
      ratio: RADIAL_RATIO,
      phase: 0,
    });
    this.addSpinner(context, steel, horizontalShaftGeometry(gears[0].x), {
      position: new Vector3(gears[0].x - bevelReach(), AXIS_Y, bevelCentreZ()),
      quaternion: orient(X_AXIS),
      ratio: RADIAL_RATIO,
      phase: 0,
    });
    gears.forEach((gear, index) => {
      this.addSpinner(context, steel, spurGear(index), {
        position: new Vector3(gear.x, AXIS_Y + gear.y, TRAIN.z),
        quaternion: new Quaternion(),
        ratio: gear.ratio,
        phase: gear.phase,
      });
    });
    const housing = namedGroup('gearboxHousing', this.root);
    mesh(context, housing, housingGeometry(gears), material(context, 'outerShaft', HOUSING_FINISH));
    const units = namedGroup('gearboxUnits', this.root);
    mesh(context, units, unitsGeometry(), material(context, 'outerShaft', UNIT_FINISH));
  }

  update(coreAngle: number): void {
    for (const spinner of this.spinners) {
      spinner.pivot.rotation.z = spinner.phase + spinner.ratio * coreAngle;
    }
  }

  private addSpinner(
    context: PartContext,
    surface: ReturnType<typeof material>,
    geometry: BufferGeometry,
    placement: { position: Vector3; quaternion: Quaternion; ratio: number; phase: number },
  ): void {
    const mount = namedGroup('gearboxMount', this.root);
    mount.position.copy(placement.position);
    mount.quaternion.copy(placement.quaternion);
    const pivot = namedGroup('gearboxGear', mount);
    mesh(context, pivot, geometry, surface);
    this.spinners.push({ pivot, ratio: placement.ratio, phase: placement.phase });
  }
}
