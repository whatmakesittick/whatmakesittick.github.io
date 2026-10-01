import { ExtrudeGeometry, Group, LatheGeometry, Shape, SphereGeometry, Vector2 } from 'three';
import type { Mesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { SEGMENTS, SHIP } from '../constants';
import type { Outline } from '../constants';
import { SHIP_SIZE, shipAngle, shipPosition } from '../layout';
import { partMesh } from './context';
import type { PartContext } from './context';

const HULL_ALONG_X = -Math.PI / 2;
const WING_FLAT = Math.PI / 2;

function sized(outline: Outline): Vector2[] {
  return outline.map(([x, y]) => new Vector2(x * SHIP_SIZE, y * SHIP_SIZE));
}

export class ShipPart {
  readonly object = new Group();

  constructor(context: PartContext) {
    const hull = partMesh(
      context,
      new LatheGeometry(sized(SHIP.hullProfile), SEGMENTS.radial),
      'ship',
      context.finishes.shipHull,
    );
    hull.rotation.z = HULL_ALONG_X;
    const wing = this.plate(context, SHIP.wingOutline);
    wing.rotation.x = WING_FLAT;
    this.object.add(
      hull,
      wing,
      this.plate(context, SHIP.finOutline),
      this.glow(context, context.finishes.engine, SHIP.engine.radius, SHIP.engine.x, 0),
      this.glow(
        context,
        context.finishes.portLight,
        SHIP.light.radius,
        SHIP.light.x,
        -SHIP.light.z,
      ),
      this.glow(
        context,
        context.finishes.starboardLight,
        SHIP.light.radius,
        SHIP.light.x,
        SHIP.light.z,
      ),
    );
  }

  set(tau: number): void {
    shipPosition(tau, this.object.position);
    this.object.rotation.z = shipAngle(tau) + SHIP.quarterTurn;
  }

  private plate(context: PartContext, outline: Outline): Mesh {
    const geometry = new ExtrudeGeometry(new Shape(sized(outline)), {
      depth: SHIP.plateThickness,
      bevelEnabled: false,
    });
    geometry.translate(0, 0, -SHIP.plateThickness / 2);
    return partMesh(context, geometry, 'ship', context.finishes.shipHull);
  }

  private glow(
    context: PartContext,
    finish: MaterialFinish,
    radius: number,
    x: number,
    z: number,
  ): Mesh {
    const glow = partMesh(
      context,
      new SphereGeometry(radius, SEGMENTS.sphere, SEGMENTS.sphere),
      'ship',
      finish,
    );
    glow.position.set(x, 0, z);
    return glow;
  }
}
