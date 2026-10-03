import { BoxGeometry, Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { MISSILE_FIT } from '../../../model/layout';
import { MISSILE_SHAPE } from '../../constants';
import { FINISHES } from '../../finishes';
import { deckYAt } from '../../geometry/hullLines';
import { lathe } from '../../geometry/solids';
import { mergeParts, partMesh } from '../context';
import type { PartContext } from '../context';

export interface MissileFit {
  object: Group;
  anchor: Object3D;
}

const QUARTER_TURN = Math.PI / 2;
const FIN_COUNT = 4;

function finSet(fins: typeof MISSILE_SHAPE.fins, radius: number): BufferGeometry[] {
  return Array.from({ length: FIN_COUNT }, (_, index) => {
    const fin = new BoxGeometry(fins.root, fins.span, fins.thickness);
    const position = fin.getAttribute('position');
    for (let at = 0; at < position.count; at += 1) {
      if (position.getY(at) > 0) {
        position.setX(at, position.getX(at) * (fins.tip / fins.root) + (fins.root - fins.tip) / 2);
      }
    }
    fin.computeVertexNormals();
    fin.translate(-(fins.from + fins.root / 2), radius + fins.span / 2, 0);
    fin.rotateX(QUARTER_TURN / 2 + index * QUARTER_TURN);
    return fin;
  });
}

function turnedBody(points: readonly (readonly [number, number])[], grow: number): BufferGeometry {
  return lathe(
    points.map(([along, radius]) => [radius * grow, along]),
    MISSILE_SHAPE.segments,
  ).rotateZ(QUARTER_TURN);
}

function missile(): { body: BufferGeometry; seeker: BufferGeometry } {
  const { profile, fins, seekerGrow } = MISSILE_SHAPE;
  const radius = MISSILE_FIT.missile.diameter / 2;
  return {
    body: mergeParts([turnedBody(profile, 1), ...finSet(fins, radius)]),
    seeker: turnedBody(profile.slice(0, 2), seekerGrow),
  };
}

export function buildMissileFit(context: PartContext): MissileFit {
  const object = new Group();
  const { rail, pylons, pylonLength, pylonWidth, hanger } = MISSILE_SHAPE;
  const [aftX, foreX] = MISSILE_FIT.x;
  const slope = Math.tan(MISSILE_FIT.raise);
  const railTopAt = (x: number) => MISSILE_FIT.railTop + (x - aftX) * slope;
  const { body, seeker } = missile();
  const missileLength = MISSILE_FIT.missile.length;
  const radius = MISSILE_FIT.missile.diameter / 2;
  [-1, 1].forEach((side) => {
    const z = side * MISSILE_FIT.railZ;
    const group = new Group();
    const railBar = new BoxGeometry(rail.length, rail.height, rail.width);
    railBar.translate(rail.length / 2, -rail.height / 2, 0);
    const mount = new Group();
    mount.position.set(aftX, MISSILE_FIT.railTop, z);
    mount.rotation.z = MISSILE_FIT.raise;
    const missileBody = body.clone();
    missileBody.translate((rail.length + missileLength) / 2, radius + hanger, 0);
    const missileTip = seeker.clone();
    missileTip.translate((rail.length + missileLength) / 2, radius + hanger, 0);
    mount.add(
      partMesh(context, railBar, 'missileRails', FINISHES.rail),
      partMesh(context, missileBody, 'missileRails', FINISHES.missile),
      partMesh(context, missileTip, 'missileRails', FINISHES.glass),
    );
    const posts = pylons.map((x) => {
      const top = railTopAt(x) - rail.height;
      const bottom = deckYAt(x, z) - hanger;
      const post = new BoxGeometry(pylonLength, top - bottom, pylonWidth);
      post.translate(x, (top + bottom) / 2, z);
      return post;
    });
    group.add(mount, partMesh(context, mergeParts(posts), 'missileRails', FINISHES.rail));
    object.add(group);
  });
  body.dispose();
  seeker.dispose();
  const anchor = new Group();
  anchor.position.set(
    (aftX + foreX) / 2,
    railTopAt((aftX + foreX) / 2) + MISSILE_FIT.missile.diameter,
    -MISSILE_FIT.railZ,
  );
  object.add(anchor);
  object.visible = false;
  return { object, anchor };
}
