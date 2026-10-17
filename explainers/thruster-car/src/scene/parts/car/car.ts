import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { CAR_ANCHOR_IDS } from '../../../ids';
import type { AssemblyState, CarAnchorId, NozzleId, PartId } from '../../../ids';
import { CAR_ANCHORS } from '../../../model/layout';
import { applyCarPose } from '../../pose';
import type { PartContext } from '../context';
import type { CarView } from '../types';
import { createBody } from './body';
import type { BodyUnit } from './body';
import { createCabin } from './cabin';
import { createNozzles } from './nozzles';
import type { NozzleSet } from './nozzles';
import { carSilhouette } from './silhouette';
import { createTank } from './tank';
import type { TankUnit } from './tank';
import { createWheels } from './wheels';
import type { WheelSet } from './wheels';

type Anchors = Record<CarAnchorId, Object3D>;

function carAnchors(root: Object3D): Readonly<Anchors> {
  return Object.fromEntries(
    CAR_ANCHOR_IDS.map((id) => [id, anchorAt(root, ...CAR_ANCHORS[id])]),
  ) as Anchors;
}

export class CarPart implements CarView {
  readonly object = new Group();
  readonly labels: ReadonlyMap<PartId, Object3D>;
  readonly anchors: Readonly<Anchors>;
  private readonly context: PartContext;
  private readonly body: BodyUnit;
  private readonly wheels: WheelSet;
  private readonly tank: TankUnit;
  private readonly nozzles: NozzleSet;
  private outline?: BufferGeometry;

  constructor(context: PartContext) {
    this.context = context;
    this.body = createBody(context);
    const cabin = createCabin(context);
    this.wheels = createWheels(context);
    this.tank = createTank(context);
    this.nozzles = createNozzles(context);
    this.object.add(
      this.body.object,
      cabin.object,
      this.wheels.object,
      this.tank.object,
      this.nozzles.object,
    );
    this.anchors = carAnchors(this.object);
    this.labels = new Map<PartId, Object3D>([
      ['body', this.body.label],
      ['seat', cabin.label],
      ['wheels', this.wheels.label],
      ...this.tank.labels,
      ...this.nozzles.labels,
    ]);
  }

  nozzle(id: NozzleId): Object3D {
    return this.nozzles.mouth(id);
  }

  silhouette(): BufferGeometry {
    this.outline ??= this.context.tracker.track(carSilhouette(this.body.silhouetteParts()));
    return this.outline;
  }

  setState(state: AssemblyState): void {
    applyCarPose(this.object, state.car);
    this.body.setCutaway(state.view.tank);
    this.wheels.setState(state);
    this.tank.setState(state);
    this.nozzles.setState(state);
  }
}
