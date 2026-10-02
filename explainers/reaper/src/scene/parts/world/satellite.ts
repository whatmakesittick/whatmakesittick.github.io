import {
  BoxGeometry,
  CylinderGeometry,
  Group,
  LatheGeometry,
  Sprite,
  SpriteMaterial,
  Vector2,
  Vector3,
} from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { LOITER, SATELLITE_POSITION } from '../../../model/layout';
import { SATELLITE_SHAPE } from '../../constants';
import { GLOW_SPRITE, WORLD_FINISHES, solarPanelFinish } from '../../finishes';
import { cellTexture } from '../../geometry/surfaceMaps';
import { mergeParts, partMesh, registered } from '../context';
import type { PartContext } from '../context';

const SIDES = [1, -1] as const;
const QUARTER_TURN = Math.PI / 2;
const X_AXIS = new Vector3(1, 0, 0);

function dishGeometry(): BufferGeometry {
  const { radius, depth, segments, samples } = SATELLITE_SHAPE.dish;
  const { feed: horn, boom } = SATELLITE_SHAPE;
  const profile = Array.from({ length: samples + 1 }, (_, index) => {
    const share = index / samples;
    return new Vector2(share * radius, depth * share * share);
  });
  const bowl = new LatheGeometry(profile, segments);
  const feed = new CylinderGeometry(
    horn.radius * horn.tip,
    horn.radius,
    horn.length,
    boom.segments,
  );
  feed.translate(0, horn.length / 2, 0);
  return mergeParts([bowl, feed]);
}

function panelGeometry(): BufferGeometry {
  const { body, panel } = SATELLITE_SHAPE;
  return mergeParts(
    SIDES.map((side) => {
      const wing = new BoxGeometry(panel.width, panel.thickness, panel.length);
      wing.translate(0, 0, side * (body[2] / 2 + panel.boom + panel.length / 2));
      return wing;
    }),
  );
}

function boomGeometry(): BufferGeometry {
  const { body, panel, boom } = SATELLITE_SHAPE;
  return mergeParts(
    SIDES.map((side) => {
      const arm = new CylinderGeometry(boom.radius, boom.radius, panel.boom, boom.segments);
      arm.rotateX(QUARTER_TURN);
      arm.translate(0, 0, side * (body[2] / 2 + panel.boom / 2));
      return arm;
    }),
  );
}

export interface SatellitePart {
  object: Group;
  anchor: Object3D;
}

export function createSatellite(context: PartContext): SatellitePart {
  const { body, cells, colours, glow } = SATELLITE_SHAPE;
  const object = new Group();
  object.position.set(...SATELLITE_POSITION);
  const facing = new Vector3(LOITER.centre[0], 0, LOITER.centre[1])
    .sub(object.position)
    .normalize();
  const map = context.tracker.track(
    cellTexture({ ...cells, cell: colours.cell, frame: colours.frame }),
  );
  const dish = partMesh(context, dishGeometry(), 'satellite', WORLD_FINISHES.satelliteDish);
  dish.position.set(body[0] / 2, 0, 0);
  dish.rotation.z = -QUARTER_TURN;
  const craft = new Group();
  craft.add(
    partMesh(context, new BoxGeometry(...body), 'satellite', WORLD_FINISHES.foil),
    partMesh(context, panelGeometry(), 'satellite', solarPanelFinish(map)),
    partMesh(context, boomGeometry(), 'satellite', WORLD_FINISHES.satelliteFrame),
    dish,
  );
  craft.quaternion.setFromUnitVectors(X_AXIS, facing);
  const halo = new Sprite(
    registered(
      context,
      'satellite',
      new SpriteMaterial({
        ...GLOW_SPRITE,
        map: context.textures.glow,
        color: colours.glow,
        opacity: glow.opacity,
        fog: false,
      }),
    ),
  );
  halo.scale.setScalar(glow.size);
  object.add(halo, craft);
  return { object, anchor: anchorAt(object, 0, 0, 0) };
}
