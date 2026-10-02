import { Box3, Group, Vector3 } from 'three';
import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { MOTOR_PART_IDS } from '../../../ids';
import type { AssemblyState, MotorPartId, PartId } from '../../../ids';
import { DRONE_SCALE, droneUnits } from '../../../model/scale';
import { BODY_DROP, DRONE_BOX, PROP } from '../../constants';
import { applyDronePose } from '../../pose';
import type { PartContext } from '../context';
import { DownwashPart } from '../effects/downwash';
import { SpinArrowsPart } from '../effects/spinArrows';
import { buildGps, buildReceiverAntennas, VideoAntennaPart } from './antennas';
import { buildBattery } from './battery';
import { CameraModulePart } from './cameraModule';
import { buildFrame, frameLabelSpot } from './frame';
import { buildMotor } from './motor';
import { PropellerSet } from './propeller';
import { buildStack } from './stack';

export type DroneLabel = Extract<
  PartId,
  | 'frame'
  | MotorPartId
  | 'propellers'
  | 'battery'
  | 'stack'
  | 'camera'
  | 'videoAntenna'
  | 'receiverAntenna'
  | 'gpsModule'
  | 'spinArrows'
>;

const PROPELLER_LABEL_MOTOR: MotorPartId = 'motorFrontRight';

export class DronePart {
  readonly object = new Group();
  readonly body = new Group();
  readonly labels: ReadonlyMap<DroneLabel, Object3D>;
  readonly cameraAnchor: Object3D;
  readonly videoAntennaTop: Object3D;
  readonly receiverEnd: Object3D;
  readonly propellers: PropellerSet;
  private readonly cameraModule: CameraModulePart;
  private readonly videoAntenna: VideoAntennaPart;
  private readonly arrows: SpinArrowsPart;
  private readonly downwash: DownwashPart;
  private readonly localBox = new Box3(
    new Vector3(DRONE_BOX.x[0], DRONE_BOX.y[0], DRONE_BOX.z[0]),
    new Vector3(DRONE_BOX.x[1], DRONE_BOX.y[1], DRONE_BOX.z[1]),
  );

  constructor(context: PartContext) {
    this.body.scale.setScalar(DRONE_SCALE);
    this.body.position.y = -droneUnits(BODY_DROP);
    const motors = MOTOR_PART_IDS.map((id) => [id, buildMotor(context, id)] as const);
    this.propellers = new PropellerSet(context);
    const battery = buildBattery(context);
    const stack = buildStack(context);
    const receiver = buildReceiverAntennas(context);
    const gps = buildGps(context);
    this.cameraModule = new CameraModulePart(context);
    this.videoAntenna = new VideoAntennaPart(context);
    this.arrows = new SpinArrowsPart(context);
    this.downwash = new DownwashPart(context, this.propellers);
    this.body.add(
      buildFrame(context),
      ...motors.map(([, motor]) => motor.object),
      this.propellers.object,
      battery.object,
      stack.object,
      this.cameraModule.object,
      this.videoAntenna.object,
      receiver.object,
      gps.object,
      this.arrows.object,
      this.downwash.mesh,
    );
    this.object.add(this.body);
    this.cameraAnchor = this.cameraModule.lens;
    this.videoAntennaTop = this.videoAntenna.top;
    this.receiverEnd = receiver.linkEnd;
    const propeller = this.propellers.of(PROPELLER_LABEL_MOTOR);
    this.labels = new Map<DroneLabel, Object3D>([
      ['frame', anchorAt(this.body, ...frameLabelSpot())],
      ...motors.map(([id, motor]) => [id, motor.label] as const),
      ['propellers', anchorAt(propeller.object, 0, PROP.hub.height, PROP.radius * 0.6)],
      ['battery', battery.label],
      ['stack', stack.label],
      ['camera', this.cameraModule.label],
      ['videoAntenna', this.videoAntenna.label],
      ['receiverAntenna', receiver.label],
      ['gpsModule', gps.label],
      ['spinArrows', this.arrows.label],
    ]);
  }

  setState(state: AssemblyState): void {
    applyDronePose(this.object, state.flight);
    this.object.updateMatrixWorld(true);
    this.propellers.setRate(state.flight.propRate);
    this.cameraModule.setVideo(state.video);
    this.videoAntenna.setVideo(state.video);
    this.arrows.setState(state.view.arrows, state.motors.shares);
    this.downwash.setState(state.motors.shares, state.flight);
  }

  advance(deltaSeconds: number): void {
    this.propellers.advance(deltaSeconds);
    this.downwash.advance(deltaSeconds);
  }

  worldBox(target: Box3): Box3 {
    return target.copy(this.localBox).applyMatrix4(this.body.matrixWorld);
  }
}
