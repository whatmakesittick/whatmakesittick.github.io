import { ConeGeometry, CylinderGeometry, Group } from 'three';
import type { Object3D } from 'three';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { TERRACE } from '../../../model';
import { ANCHOR_LIFT_CM, FLOOR, VENT_PIPE } from '../../constants';
import { block } from '../../geometry/blocks';
import { FinishBatch } from '../batch';
import { repeating } from '../canvas';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { addBulkhead } from './bulkhead';
import { addParapet } from './parapet';
import { PAVER_TILES_PER_TEXTURE, paverTexture } from './paverTexture';
import { addWalls } from './walls';

const ROOF_LABEL = { x: 200, z: 120 } as const;
const FLOOR_ROUGHNESS = 0.9;

export interface HousePart {
  readonly object: Group;
  readonly roof: Object3D;
}

function addVentPipe(batch: FinishBatch): void {
  const { radius, height, cap, segments } = VENT_PIPE;
  const pipe = new CylinderGeometry(radius, radius, height, segments);
  pipe.translate(VENT_PIPE.x, TERRACE.y + height / 2, VENT_PIPE.z);
  const hood = new ConeGeometry(cap.radius, cap.height, segments);
  hood.translate(VENT_PIPE.x, TERRACE.y + height + cap.height / 2, VENT_PIPE.z);
  batch.add('pvc', pipe, hood);
}

function createFloor(context: PartContext): Object3D {
  const width = TERRACE.x[1] - TERRACE.x[0];
  const depth = TERRACE.z[1] - TERRACE.z[0];
  const tilesPerRepeat = FLOOR.tile * PAVER_TILES_PER_TEXTURE;
  const map = context.tracker.track(
    repeating(paverTexture(), width / tilesPerRepeat, depth / tilesPerRepeat),
  );
  const finish = { color: '#ffffff', map, roughness: FLOOR_ROUGHNESS, metalness: 0 };
  return finishMesh(
    context,
    block(TERRACE.x, [TERRACE.y - FLOOR.thickness, TERRACE.y], TERRACE.z),
    UNDIMMED_GROUP,
    finish,
  );
}

export function createHouse(context: PartContext): HousePart {
  const batch = new FinishBatch();
  addWalls(batch);
  addParapet(batch);
  addBulkhead(batch);
  addVentPipe(batch);
  const object = new Group();
  object.add(batch.build(context, STRUCTURE_GROUP), createFloor(context));
  const roof = anchorAt(object, ROOF_LABEL.x, TERRACE.y + ANCHOR_LIFT_CM, ROOF_LABEL.z);
  return { object, roof };
}
