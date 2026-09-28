import { Group, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { PUMPS, PUMP_IDS, spanLength } from '../../../model/scale';
import type { PlanPoint, PumpId } from '../../../model/scale';
import { DETAIL, PUMP_FORM } from '../../constants';
import { FINISHES } from '../../finishes';
import { mergeParts } from '../../geometry/merge';
import { capsuleBetween, latheY, sphereAt } from '../../geometry/solids';
import { finishMesh } from '../context';
import type { PartContext } from '../context';

function vector({ x, y, z }: PlanPoint): Vector3 {
  return new Vector3(x, y, z);
}

function bodyGeometry(id: PumpId): BufferGeometry {
  const plan = PUMPS[id];
  const body = latheY(PUMP_FORM.profile, spanLength(plan.span), plan.radius, DETAIL.hero);
  body.scale(1, 1, PUMP_FORM.depthSquash);
  return body.translate(plan.x, plan.span[0], 0);
}

function complexOneGeometry(): BufferGeometry {
  const plan = PUMPS.complexOne;
  const { membraneArm, matrixArm } = PUMP_FORM;
  const reach = plan.radius - membraneArm.radius;
  const arm = capsuleBetween(
    new Vector3(plan.x - reach, membraneArm.y, 0),
    new Vector3(plan.x + reach, membraneArm.y, 0),
    membraneArm.radius,
    DETAIL.hero,
  );
  arm.scale(1, 1, PUMP_FORM.depthSquash);
  return mergeParts([
    arm,
    capsuleBetween(vector(matrixArm.from), vector(matrixArm.to), matrixArm.radius, DETAIL.hero),
  ]);
}

function pumpGeometry(id: PumpId): BufferGeometry {
  const body = id === 'complexOne' ? complexOneGeometry() : bodyGeometry(id);
  const lumps = PUMP_FORM.lumps[id].map((lump) => sphereAt(vector(lump), lump.radius, DETAIL.hero));
  return mergeParts([body, ...lumps]);
}

export class PumpsPart {
  readonly object = new Group();
  readonly label: Object3D;
  readonly anchor: Object3D;

  constructor(context: PartContext) {
    const geometry = mergeParts(PUMP_IDS.map(pumpGeometry));
    this.object.add(finishMesh(context, geometry, 'pumps', FINISHES.pump));
    const { label, centre } = PUMP_FORM;
    this.label = anchorAt(this.object, label.x, label.y, label.z);
    this.anchor = anchorAt(this.object, centre.x, centre.y, centre.z);
  }
}
