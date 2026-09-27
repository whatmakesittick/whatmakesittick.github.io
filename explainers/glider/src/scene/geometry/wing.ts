import type { BufferGeometry } from 'three';
import { bladeGeometry } from '@core/scene/geometry/airfoil';
import { lerp } from '../../model';

export interface WingPlan {
  rootChord: number;
  tipChord: number;
  thickness: number;
  halfSpan: number;
}

export function wingPanel(plan: WingPlan, fromShare: number, toShare: number): BufferGeometry {
  const section = { chord: 1, thickness: plan.thickness };
  const geometry = bladeGeometry(section, fromShare * plan.halfSpan, toShare * plan.halfSpan);
  const position = geometry.getAttribute('position');
  for (let index = 0; index < position.count; index++) {
    const chord = lerp(plan.rootChord, plan.tipChord, position.getX(index) / plan.halfSpan);
    position.setY(index, position.getY(index) * chord);
    position.setZ(index, position.getZ(index) * chord);
  }
  geometry.computeVertexNormals();
  geometry.rotateY(-Math.PI / 2);
  return geometry;
}
