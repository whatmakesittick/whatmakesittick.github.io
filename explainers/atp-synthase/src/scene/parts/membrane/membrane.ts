import type { Mesh, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { MEMBRANE } from '../../../model/scale';
import { THEME } from '../../../theme';
import { MEMBRANE_FORM } from '../../constants';
import { SLAB_SURFACES, slabGeometry } from '../../geometry/slab';
import type { SlabSurface } from '../../geometry/slab';
import { surfacedMesh } from '../context';
import type { PartContext } from '../context';
import { lipidSurfaces } from './lipidTextures';
import type { LipidSurface } from './lipidTextures';

const LIPID_ROUGHNESS = 0.8;
const LABEL_AT = { x: 7.5, z: 7 } as const;

function lipidFinish(color: string, surface: LipidSurface): MaterialFinish {
  return {
    color,
    map: surface.map,
    normalMap: surface.normalMap,
    metalness: 0,
    roughness: LIPID_ROUGHNESS,
    transparent: true,
    opacity: MEMBRANE_FORM.opacity,
    depthWrite: false,
  };
}

export class MembranePart {
  readonly object: Mesh;
  readonly label: Object3D;

  constructor(context: PartContext, frame: Object3D) {
    const surfaces = lipidSurfaces();
    [surfaces.face, surfaces.edge].forEach(({ map, normalMap }) => {
      context.tracker.track(map);
      context.tracker.track(normalMap);
    });
    const finishes: Record<SlabSurface, MaterialFinish> = {
      face: lipidFinish(THEME.lipid, surfaces.face),
      edge: lipidFinish(THEME.lipidHead, surfaces.edge),
    };
    const geometry = slabGeometry({
      x: MEMBRANE.patchX,
      y: MEMBRANE.bilayer,
      z: MEMBRANE.patchZ,
      faceTile: MEMBRANE_FORM.faceTileNm,
    });
    this.object = surfacedMesh(
      context,
      geometry,
      'membrane',
      SLAB_SURFACES.map((surface) => finishes[surface]),
    );
    frame.add(this.object);
    this.label = anchorAt(frame, LABEL_AT.x, MEMBRANE.bilayer[1], LABEL_AT.z);
  }

  setVisible(visible: boolean): void {
    this.object.visible = visible;
    this.label.visible = visible;
  }
}
