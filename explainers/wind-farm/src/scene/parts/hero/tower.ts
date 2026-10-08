import { LatheGeometry, Vector2 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { bandGeometry, crispProfile } from '../../geometry/band';
import { mergeParts } from '../../geometry/merge';
import { groupMesh, label, partMesh, sceneAnchor } from '../context';
import type { PartContext } from '../context';
import { PLINTH, TOWER, towerRadiusAt } from './constants';
import { buildTowerDoor } from './towerDoor';

function plinthGeometry(): BufferGeometry {
  const profile = crispProfile([
    [0, PLINTH.buriedY],
    [PLINTH.radius, PLINTH.buriedY],
    [PLINTH.radius, PLINTH.shoulderY],
    [PLINTH.chamferRadius, PLINTH.topY],
    [0, PLINTH.topY],
  ]);
  return new LatheGeometry(profile, PLINTH.segments);
}

function shellGeometry(): BufferGeometry {
  const profile = Array.from({ length: TOWER.rows + 1 }, (_, row) => {
    const y = (TOWER.topY * row) / TOWER.rows;
    return new Vector2(towerRadiusAt(y), y);
  });
  return new LatheGeometry(profile, TOWER.segments);
}

function flangeGeometry(): BufferGeometry {
  const rings = TOWER.flangeYs.map((y) => {
    const radius = towerRadiusAt(y);
    return bandGeometry(
      {
        inner: radius - TOWER.flangeProud,
        outer: radius + TOWER.flangeProud,
        bottom: y - TOWER.flangeHeight / 2,
        top: y + TOWER.flangeHeight / 2,
      },
      TOWER.flangeSegments,
    );
  });
  const top = bandGeometry(
    {
      inner: TOWER.topRadius - TOWER.topFlange.proud,
      outer: TOWER.topRadius + TOWER.topFlange.proud,
      bottom: TOWER.topY - TOWER.topFlange.height,
      top: TOWER.topY,
    },
    TOWER.flangeSegments,
  );
  return mergeParts([...rings, top]);
}

export interface TowerParts {
  readonly shell: BufferGeometry;
  readonly mesh: Object3D;
}

export function buildTower(context: PartContext, parent: Object3D): TowerParts {
  const foundation = partMesh(context, plinthGeometry(), 'foundation');
  const shell = shellGeometry();
  const tower = partMesh(context, shell, 'tower');
  tower.add(groupMesh(context, flangeGeometry(), 'tower', 'paintShade'));
  buildTowerDoor(context, tower);
  parent.add(foundation, tower);
  label(context, 'foundation', foundation, [0, PLINTH.topY, PLINTH.chamferRadius]);
  label(context, 'tower', tower, [0, TOWER.topY / 2, towerRadiusAt(TOWER.topY / 2)]);
  sceneAnchor(context, 'towerBase', parent, [0, 0, 0]);
  return { shell, mesh: tower };
}
