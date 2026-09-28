import { CylinderGeometry } from 'three';
import type { Mesh } from 'three';
import { COVERSLIP_MM, OBJECTIVES } from '../../model';
import type { ObjectiveId, OpticalLayout } from '../../model';
import { OIL_DROP, RENDER_ORDER, SEGMENTS } from '../constants';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface OilDropPart {
  mesh: Mesh;
  place(objective: ObjectiveId, layout: OpticalLayout): void;
}

export function createOilDrop(context: PartContext): OilDropPart {
  const geometry = new CylinderGeometry(1, 1, 1, SEGMENTS.small).translate(0, 1 / 2, 0);
  const mesh = partMesh(context, geometry, 'objective', 'oil');
  mesh.renderOrder = RENDER_ORDER.glass;
  return {
    mesh,
    place: (objective, layout) => {
      const bottom = layout.specimen + COVERSLIP_MM - OIL_DROP.overlap;
      mesh.visible = OBJECTIVES[objective].immersion === 'oil';
      mesh.position.y = bottom;
      mesh.scale.set(
        OIL_DROP.radius,
        layout.objectiveFront + OIL_DROP.overlap - bottom,
        OIL_DROP.radius,
      );
    },
  };
}
