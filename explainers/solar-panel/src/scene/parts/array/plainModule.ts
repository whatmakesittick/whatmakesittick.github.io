import { Group } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { MODULE } from '../../../model';
import { block } from '../../geometry/blocks';
import { junctionBoxCentres, junctionBoxGeometry } from '../../geometry/junctionBox';
import { mergeParts } from '../../geometry/merge';
import { moduleFrameGeometry } from '../../geometry/moduleFrame';
import { FRAME_WALL_CM, LAMINATE } from '../../geometry/moduleLayout';
import { layerFront, stackLayout } from '../../geometry/stack';
import { finishMesh, partMesh } from '../context';
import type { PartContext } from '../context';

const FACE_LIFT_CM = 0.01;

export function createPlainModule(context: PartContext, face: MaterialFinish): Group {
  const layers = stackLayout(0);
  const x = [-LAMINATE.width / 2, LAMINATE.width / 2] as const;
  const y = [FRAME_WALL_CM, MODULE.height - FRAME_WALL_CM] as const;
  const back = layers.backsheet.back;
  const cellFront = layerFront(layers.cellSheet) + FACE_LIFT_CM;
  const module = new Group();
  module.add(
    partMesh(context, moduleFrameGeometry(), STRUCTURE_GROUP, 'frame'),
    partMesh(context, block(x, y, [back, cellFront - FACE_LIFT_CM]), STRUCTURE_GROUP, 'backsheet'),
    finishMesh(context, block(x, y, [cellFront - FACE_LIFT_CM, cellFront]), STRUCTURE_GROUP, face),
    partMesh(
      context,
      block(x, y, [layers.glass.back, layerFront(layers.glass)]),
      STRUCTURE_GROUP,
      'glass',
    ),
    partMesh(
      context,
      mergeParts(junctionBoxCentres().map((centre) => junctionBoxGeometry(back, centre))),
      STRUCTURE_GROUP,
      'junctionBox',
    ),
  );
  return module;
}
