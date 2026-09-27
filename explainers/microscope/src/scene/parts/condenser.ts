import { Group } from 'three';
import type { Mesh, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { OBJECTIVE_IDS, STATIONS, irisOpening } from '../../model';
import type { ObjectiveId } from '../../model';
import { CONDENSER, CONDENSER_BRACKET, CONDENSER_LABEL_HEIGHT, IRIS, SEGMENTS } from '../constants';
import { boxBetween } from '../geometry/box';
import { cutSection, innerWall, ringSection } from '../geometry/lathe';
import { backHalfRing } from '../geometry/ring';
import { FINISHES } from '../finishes';
import { cutShell, partMesh } from './context';
import type { CutShell, PartContext } from './context';
import { glassLens } from './glassLens';

export interface CondenserPart {
  object: Group;
  anchors: { condenser: Object3D; irisDiaphragm: Object3D };
  setCutaway(cutaway: boolean): void;
  setObjective(objective: ObjectiveId): void;
}

function irisRing(context: PartContext, objective: ObjectiveId): Mesh {
  const opening = Math.max(IRIS.minOpening, irisOpening(objective));
  return partMesh(
    context,
    backHalfRing(opening, IRIS.outer, STATIONS.iris, SEGMENTS.round),
    'irisDiaphragm',
    'rubber',
  );
}

function housing(context: PartContext): CutShell {
  const { inner, outer, bottom, top } = CONDENSER;
  return cutShell(
    context,
    cutSection(ringSection(inner, outer, bottom, top), SEGMENTS.round, {
      lining: innerWall(inner, bottom, top),
    }),
    'condenser',
    FINISHES.stage,
  );
}

function bracket(context: PartContext): Mesh {
  const { halfWidth, bottom, top, back } = CONDENSER_BRACKET;
  const geometry = boxBetween([-halfWidth, bottom, back], [halfWidth, top, -CONDENSER.inner]);
  return partMesh(context, geometry, 'condenser', 'stage');
}

export function createCondenser(context: PartContext): CondenserPart {
  const shell = housing(context);
  const lens = glassLens(
    context,
    'condenser',
    { radius: CONDENSER.lensRadius, thickness: CONDENSER.lensThickness },
    STATIONS.condenser,
  );
  const irises = new Map(OBJECTIVE_IDS.map((id) => [id, irisRing(context, id)]));
  const object = new Group();
  object.add(shell.object, lens, bracket(context), ...irises.values());
  return {
    object,
    anchors: {
      condenser: anchorAt(object, 0, CONDENSER_LABEL_HEIGHT, CONDENSER.outer),
      irisDiaphragm: anchorAt(object, 0, STATIONS.iris, -CONDENSER.outer),
    },
    setCutaway: (cutaway) => shell.setCut(cutaway),
    setObjective: (objective) => irises.forEach((ring, id) => (ring.visible = id === objective)),
  };
}
