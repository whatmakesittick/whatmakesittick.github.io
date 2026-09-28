import { CanvasTexture, Mesh, MeshStandardMaterial, PlaneGeometry, SRGBColorSpace } from 'three';
import type { Object3D } from 'three';
import { toRadians } from '@core/math';
import { WHEEL_CENTRES } from '../../../model/layout';
import { BRIDGE_LEVEL, ENGRAVING } from '../../constants';
import { polarDeg } from '../../geometry/outline';
import type { PartContext } from '../context';

const DECAL_LIFT = 0.004;
const SHADOW_OFFSET = 3;
const ANISOTROPY = 8;

function engravingTexture(): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = ENGRAVING.texture.width;
  canvas.height = ENGRAVING.texture.height;
  const context = canvas.getContext('2d');
  if (context) {
    context.font = ENGRAVING.font;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    const x = canvas.width / 2;
    const y = canvas.height / 2;
    context.fillStyle = ENGRAVING.shadow;
    context.fillText(ENGRAVING.text, x + SHADOW_OFFSET, y + SHADOW_OFFSET);
    context.fillStyle = ENGRAVING.fill;
    context.fillText(ENGRAVING.text, x, y);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = ANISOTROPY;
  return texture;
}

export function createEngraving(context: PartContext, frame: Object3D): Object3D {
  const { tracker, materials } = context;
  const material = new MeshStandardMaterial({
    map: tracker.track(engravingTexture()),
    transparent: true,
    depthWrite: false,
    metalness: 0.8,
    roughness: 0.3,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  materials.register('barrelBridge', tracker.track(material));
  const plane = tracker.track(new PlaneGeometry(ENGRAVING.size.width, ENGRAVING.size.height));
  const mesh = new Mesh(plane, material);
  const at = polarDeg(WHEEL_CENTRES.barrel, ENGRAVING.radius, ENGRAVING.deg);
  mesh.position.set(at.x, at.y, BRIDGE_LEVEL.barrel[1] + DECAL_LIFT);
  mesh.rotation.z = toRadians(ENGRAVING.deg - 90);
  frame.add(mesh);
  return mesh;
}
