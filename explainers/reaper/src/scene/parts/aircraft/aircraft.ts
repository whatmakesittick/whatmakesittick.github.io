import { Box3, Group, Matrix4, Vector3 } from 'three';
import type { Object3D } from 'three';
import { lerp } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import type { AssemblyState, PartId, Point } from '../../../ids';
import { AIRCRAFT_LAYOUT, SATELLITE_POSITION } from '../../../model/layout';
import { applyFlightPose } from '../../pose';
import {
  AIRCRAFT_BOX,
  AIRFOIL_SAMPLES,
  LAUNCHED_STAGES,
  PROPELLER,
  SAT_DISH,
  TAIL,
} from '../../constants';
import { airfoilLoop } from '../../geometry/airfoilSurface';
import { finTip, wingPoint } from '../../geometry/wing';
import type { PartContext } from '../context';
import { CutawaySwitch } from './cutaway';
import { buildFuselage } from './fuselage';
import { GearPart } from './gear';
import { buildInternals } from './internals';
import { NavLightsPart } from './lights';
import { PropellerPart } from './propeller';
import { SatDishPart, SensorBallPart } from './sensorBall';
import { WeaponsPart } from './weapons';
import { buildTail, buildWing } from './wing';

export type AircraftLabel = Extract<
  PartId,
  | 'fuselage'
  | 'wing'
  | 'vTail'
  | 'ventralFin'
  | 'noseHump'
  | 'satelliteDish'
  | 'sensorBall'
  | 'fuelTank'
  | 'engine'
  | 'propeller'
  | 'landingGear'
  | 'pylons'
  | 'hellfire'
  | 'bombs'
>;

const LABEL_SPOTS = {
  fuselage: [-1.6, 0.06, 0.44],
  wing: { span: 6.4, chordShare: 0.35 },
  finShare: 0.5,
  propellerTop: 0.85,
  ventral: { depthShare: 0.55, chordShare: 0.35 },
} as const;

export class AircraftPart {
  readonly object = new Group();
  readonly labels: ReadonlyMap<AircraftLabel, Object3D>;
  readonly ball: Object3D;
  readonly hump: Object3D;
  readonly launchRail: Object3D;
  readonly weapons: WeaponsPart;
  private readonly cutaway = new CutawaySwitch();
  private readonly sensor: SensorBallPart;
  private readonly dish: SatDishPart;
  private readonly propeller: PropellerPart;
  private readonly gear: GearPart;
  private readonly lights: NavLightsPart;
  private readonly localBox = new Box3(
    new Vector3(AIRCRAFT_BOX.x[0], AIRCRAFT_BOX.y[0], AIRCRAFT_BOX.z[0]),
    new Vector3(AIRCRAFT_BOX.x[1], AIRCRAFT_BOX.y[1], AIRCRAFT_BOX.z[1]),
  );
  private readonly inverse = new Matrix4();
  private readonly scratch = new Vector3();

  constructor(context: PartContext) {
    const wingLoop = airfoilLoop(AIRFOIL_SAMPLES.wing);
    const finLoop = airfoilLoop(AIRFOIL_SAMPLES.fin);
    const internals = buildInternals(context, wingLoop);
    this.sensor = new SensorBallPart(context);
    this.dish = new SatDishPart(context);
    this.propeller = new PropellerPart(context, airfoilLoop(AIRFOIL_SAMPLES.blade));
    this.gear = new GearPart(context);
    this.lights = new NavLightsPart(context);
    this.weapons = new WeaponsPart(context, airfoilLoop(AIRFOIL_SAMPLES.pylon));
    this.cutaway.opened(internals.object);
    this.cutaway.opened(this.dish.object);
    this.object.add(
      buildFuselage(context, this.cutaway, finLoop),
      buildWing(context, this.cutaway, wingLoop),
      buildTail(context, finLoop),
      internals.object,
      this.dish.object,
      this.sensor.object,
      this.propeller.object,
      this.gear.object,
      this.weapons.object,
      this.lights.object,
    );
    this.ball = this.sensor.turret;
    this.hump = anchorAt(this.object, ...AIRCRAFT_LAYOUT.hump);
    this.launchRail = this.weapons.launchRail;
    this.labels = this.buildLabels(internals.fuelAnchor, internals.engineAnchor);
  }

  setState(state: AssemblyState): void {
    applyFlightPose(this.object, state.flight);
    this.object.updateMatrixWorld(true);
    this.cutaway.set(state.view.cutaway);
    this.gear.set(state.flight.gear, state.view.cutaway);
    this.propeller.setRate(state.flight.propRate);
    this.weapons.set(state.load, LAUNCHED_STAGES.includes(state.strike.stage));
    this.inverse.copy(this.object.matrixWorld).invert();
    this.sensor.aim(this.localDirection(state.sensor.aim, this.ball.position));
    this.dish.aim(this.localDirection(SATELLITE_POSITION, this.dish.object.position));
  }

  advance(deltaSeconds: number): void {
    this.propeller.advance(deltaSeconds);
    this.lights.advance(deltaSeconds);
  }

  worldBox(target: Box3): Box3 {
    return target.copy(this.localBox).applyMatrix4(this.object.matrixWorld);
  }

  private localDirection(point: Point, from: Vector3): Vector3 {
    return this.scratch
      .set(...point)
      .applyMatrix4(this.inverse)
      .sub(from);
  }

  private buildLabels(fuel: Object3D, engine: Object3D): ReadonlyMap<AircraftLabel, Object3D> {
    const at = (point: readonly [number, number, number]) => anchorAt(this.object, ...point);
    const { wing, finShare, ventral } = LABEL_SPOTS;
    const tip = finTip(1);
    const root = TAIL.fin.root;
    const fin: [number, number, number] = [
      lerp(root[0] - TAIL.fin.rootChord / 2, tip[0], finShare),
      lerp(root[1], tip[1], finShare),
      lerp(root[2], tip[2], finShare),
    ];
    const ventralDepth = TAIL.ventral.depth * ventral.depthShare;
    const ventralChord = lerp(TAIL.ventral.rootChord, TAIL.ventral.tipChord, ventral.depthShare);
    return new Map<AircraftLabel, Object3D>([
      ['fuselage', at(LABEL_SPOTS.fuselage)],
      ['wing', at(wingPoint(wing.span, wing.chordShare, true))],
      ['vTail', at(fin)],
      [
        'ventralFin',
        at([
          TAIL.ventral.root[0] -
            ventralDepth * Math.tan(TAIL.ventral.sweep) -
            ventralChord * ventral.chordShare,
          TAIL.ventral.root[1] - ventralDepth,
          0,
        ]),
      ],
      ['noseHump', at(AIRCRAFT_LAYOUT.hump)],
      ['satelliteDish', anchorAt(this.dish.head, 0, SAT_DISH.depth, 0)],
      ['sensorBall', anchorAt(this.sensor.object, ...AIRCRAFT_LAYOUT.sensorBall)],
      ['fuelTank', fuel],
      ['engine', engine],
      [
        'propeller',
        anchorAt(this.propeller.object, 0, PROPELLER.radius * LABEL_SPOTS.propellerTop, 0),
      ],
      ['landingGear', anchorAt(this.gear.mainWheel, 0, 0, 0)],
      ['pylons', this.weapons.anchors.pylon],
      ['hellfire', this.weapons.anchors.hellfire],
      ['bombs', this.weapons.anchors.bomb],
    ]);
  }
}
