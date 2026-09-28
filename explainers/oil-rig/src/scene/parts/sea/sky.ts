import { BackSide, BufferAttribute, Color, MeshBasicMaterial, SphereGeometry } from 'three';
import type { Camera, Mesh } from 'three';
import { smoothstep } from '@core/math';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { RENDER_ORDER, SKY } from '../../constants';
import { registeredMesh } from '../context';
import type { PartContext } from '../context';

const RGB = 3;

function skyColor(height: number, target: Color): Color {
  const zenith = new Color(SKY.zenith);
  const horizon = new Color(SKY.horizon);
  if (height >= 0) return target.copy(horizon).lerp(zenith, smoothstep(height, 0, SKY.skyBand));
  const shallow = new Color(SKY.shallow);
  if (height > -SKY.horizonBand) {
    return target.copy(horizon).lerp(shallow, smoothstep(-height, 0, SKY.horizonBand));
  }
  return target
    .copy(shallow)
    .lerp(new Color(SKY.deep), smoothstep(-height, SKY.horizonBand, SKY.deepBand));
}

function domeGeometry(): SphereGeometry {
  const dome = new SphereGeometry(SKY.radius, SKY.widthSegments, SKY.heightSegments);
  const position = dome.getAttribute('position');
  const colors = new Float32Array(position.count * RGB);
  const color = new Color();
  for (let index = 0; index < position.count; index++) {
    skyColor(position.getY(index) / SKY.radius, color).toArray(colors, index * RGB);
  }
  dome.setAttribute('color', new BufferAttribute(colors, RGB));
  return dome;
}

export function createSky(context: PartContext): Mesh {
  const material = new MeshBasicMaterial({
    vertexColors: true,
    side: BackSide,
    depthWrite: false,
    fog: false,
  });
  const sky = registeredMesh(context, domeGeometry(), UNDIMMED_GROUP, material);
  sky.frustumCulled = false;
  sky.renderOrder = RENDER_ORDER.sky;
  sky.onBeforeRender = (_renderer, _scene, camera: Camera) => {
    sky.position.copy(camera.position);
    sky.updateMatrixWorld();
  };
  return sky;
}
