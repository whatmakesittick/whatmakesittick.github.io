import { BoxGeometry, BufferAttribute, Group, Mesh } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { FABRIC, FABRIC_BOTTOM, FABRIC_TOP } from '../../model';
import { FABRIC_SHEET } from '../constants';
import { TRANSLUCENT_COLORS } from '../finishes';
import type { TranslucentMaterial } from '../translucency';
import type { PartContext } from './context';

export interface FabricPart {
  object: Group;
  labelAnchor: Object3D;
  setTravel(millimetres: number): void;
  setCutaway(cutaway: boolean): void;
}

const RGBA = 4;
const ALPHA = 3;
const LAYER_RENDER_ORDER = 2;
const FABRIC_SURFACE = { metalness: 0, roughness: 0.92, vertexColors: true } as const;
const LABEL_POSITION = { x: FABRIC_SHEET.right - 2, z: -22 } as const;

function fade(z: number): number {
  const { back, front, fade: length } = FABRIC_SHEET;
  return Math.min(1, (z - back) / length, (front - z) / length);
}

function layerGeometry(bottom: number): BufferGeometry {
  const { left, right, back, front, segments } = FABRIC_SHEET;
  const thickness = FABRIC.layerThickness;
  const geometry = new BoxGeometry(right - left, thickness, front - back, 1, 1, segments);
  geometry.translate((left + right) / 2, bottom + thickness / 2, (back + front) / 2);
  const positions = geometry.getAttribute('position');
  const colors = new Float32Array(positions.count * RGBA).fill(1);
  for (let index = 0; index < positions.count; index++) {
    colors[index * RGBA + ALPHA] = Math.max(0, fade(positions.getZ(index)));
  }
  geometry.setAttribute('color', new BufferAttribute(colors, RGBA));
  return geometry;
}

export function createFabric(context: PartContext): FabricPart {
  const object = new Group();
  const sheet = new Group();
  const layers: TranslucentMaterial[] = [
    TRANSLUCENT_COLORS.fabricBottom,
    TRANSLUCENT_COLORS.fabricTop,
  ].map((color, index) => {
    const layer = context.translucency.create(
      context.tracker,
      'fabric',
      { color, ...FABRIC_SURFACE },
      FABRIC_SHEET.opacity.whole,
    );
    const mesh = new Mesh(
      context.tracker.track(layerGeometry(FABRIC_BOTTOM + index * FABRIC.layerThickness)),
      layer.material,
    );
    mesh.renderOrder = LAYER_RENDER_ORDER + index;
    sheet.add(mesh);
    return layer;
  });
  object.add(sheet);
  return {
    object,
    labelAnchor: anchorAt(object, LABEL_POSITION.x, FABRIC_TOP, LABEL_POSITION.z),
    setTravel: (millimetres) => {
      sheet.position.z = -millimetres;
    },
    setCutaway: (cutaway) => {
      const opacity = cutaway ? FABRIC_SHEET.opacity.cutaway : FABRIC_SHEET.opacity.whole;
      layers.forEach((layer) => {
        layer.opacity = opacity;
      });
    },
  };
}
