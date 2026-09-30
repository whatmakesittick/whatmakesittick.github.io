import { BoxGeometry, CapsuleGeometry, Group, SphereGeometry } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { SEGMENTS, SHIP } from '../constants';
import { shipAngle, shipPosition } from '../layout';
import { partMesh } from './context';
import type { PartContext } from './context';

const HULL_ALONG_X = -Math.PI / 2;

export class ShipPart {
  readonly object = new Group();

  constructor(context: PartContext) {
    const hull = partMesh(
      context,
      new CapsuleGeometry(SHIP.hullRadius, SHIP.hullLength, SEGMENTS.capsule, SEGMENTS.radial),
      'ship',
      context.finishes.shipHull,
    );
    hull.rotation.z = HULL_ALONG_X;
    const wing = partMesh(
      context,
      new BoxGeometry(SHIP.wing.width, SHIP.wing.thickness, SHIP.wing.span),
      'ship',
      context.finishes.shipHull,
    );
    const half = SHIP.wing.span / 2;
    this.object.add(
      hull,
      wing,
      this.light(context, context.finishes.portLight, -half),
      this.light(context, context.finishes.starboardLight, half),
    );
  }

  set(tau: number): void {
    shipPosition(tau, this.object.position);
    this.object.rotation.z = shipAngle(tau) + SHIP.quarterTurn;
  }

  private light(context: PartContext, finish: MaterialFinish, z: number) {
    const light = partMesh(
      context,
      new SphereGeometry(SHIP.lightRadius, SEGMENTS.sphere, SEGMENTS.sphere),
      'ship',
      finish,
    );
    light.position.z = z;
    return light;
  }
}
