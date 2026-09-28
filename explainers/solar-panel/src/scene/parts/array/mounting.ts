import { CylinderGeometry, Group } from 'three';
import type { BufferGeometry } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import {
  HERO_PANEL_INDEX,
  HINGE,
  MODULE,
  PANEL_COUNT,
  TERRACE,
  panelCentreX,
} from '../../../model';
import { around, block } from '../../geometry/blocks';
import {
  AXLE,
  BALLAST,
  BASE_RAIL,
  HINGE_BRACKET,
  POST,
  RAIL,
  railOffsets,
} from '../../geometry/tiltFrame';
import { FinishBatch } from '../batch';
import type { EmphasisGroup, PartContext } from '../context';

const AXLE_INSET_CM = 4;
const QUARTER_TURN = Math.PI / 2;

export function mountingGroup(index: number): EmphasisGroup {
  return index === HERO_PANEL_INDEX ? 'frame' : STRUCTURE_GROUP;
}

function baseRailPieces(x: number): { rail: BufferGeometry[]; ballast: BufferGeometry[] } {
  const [rear, front] = BASE_RAIL.z;
  const ballastY = [BASE_RAIL.height, BASE_RAIL.height + BALLAST.height] as const;
  return {
    rail: [
      block(around(x, BASE_RAIL.width), [TERRACE.y, BASE_RAIL.height], BASE_RAIL.z),
      block(around(x, POST.width), [BASE_RAIL.height, HINGE.y], around(HINGE.z, POST.depth)),
    ],
    ballast: [
      block(around(x, BALLAST.width), ballastY, [front - BALLAST.length, front]),
      block(around(x, BALLAST.width), ballastY, [rear, rear + BALLAST.length]),
    ],
  };
}

function axle(centreX: number): BufferGeometry {
  const length = MODULE.width - 2 * AXLE_INSET_CM;
  const geometry = new CylinderGeometry(AXLE.radius, AXLE.radius, length, AXLE.segments);
  geometry.rotateZ(QUARTER_TURN);
  geometry.translate(centreX, HINGE.y, HINGE.z);
  return geometry;
}

export function createGroundMounting(context: PartContext): Group {
  const object = new Group();
  for (let index = 0; index < PANEL_COUNT; index += 1) {
    const centreX = panelCentreX(index);
    const steel = new FinishBatch();
    const concrete = new FinishBatch();
    railOffsets().forEach((offset) => {
      const pieces = baseRailPieces(centreX + offset);
      steel.add('rail', ...pieces.rail);
      concrete.add('ballast', ...pieces.ballast);
    });
    steel.add('darkSteel', axle(centreX));
    object.add(
      steel.build(context, mountingGroup(index)),
      concrete.build(context, STRUCTURE_GROUP),
    );
  }
  return object;
}

export function createPanelRails(context: PartContext, index: number): Group {
  const batch = new FinishBatch();
  railOffsets().forEach((offset) => {
    batch.add('rail', block(around(offset, RAIL.width), [0, RAIL.end], [-RAIL.depth, 0]));
    batch.add(
      'darkSteel',
      block(
        around(offset, HINGE_BRACKET.width),
        around(0, HINGE_BRACKET.size),
        around(-RAIL.depth / 2, HINGE_BRACKET.size),
      ),
    );
  });
  return batch.build(context, mountingGroup(index));
}
