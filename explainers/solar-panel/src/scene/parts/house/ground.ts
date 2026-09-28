import { CircleGeometry, Group, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { CanvasTexture } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { HOUSE_WALL_BOTTOM_CM, TERRACE } from '../../../model';
import { GROUND, RENDER_ORDER } from '../../constants';
import { FINISHES } from '../../finishes';
import { canvasTexture } from '../canvas';
import { finishMesh, registeredMesh } from '../context';
import type { PartContext } from '../context';

const FADE_TEXTURE_SIZE = 256;
const QUARTER_TURN = Math.PI / 2;

function fadeTexture(): CanvasTexture {
  return canvasTexture(FADE_TEXTURE_SIZE, FADE_TEXTURE_SIZE, (context, size) => {
    const half = size / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, '#ffffff');
    gradient.addColorStop(GROUND.fadeFrom, '#ffffff');
    gradient.addColorStop(1, '#000000');
    context.fillStyle = gradient;
    context.fillRect(0, 0, size, size);
  });
}

export function createGround(context: PartContext): Group {
  const lawn = new CircleGeometry(GROUND.radius, GROUND.segments);
  lawn.rotateX(-QUARTER_TURN);
  lawn.translate(0, HOUSE_WALL_BOTTOM_CM, 0);
  const finish = {
    ...FINISHES.lawn,
    alphaMap: context.tracker.track(fadeTexture()),
    depthWrite: false,
  };
  const ground = finishMesh(context, lawn, UNDIMMED_GROUP, finish);
  ground.renderOrder = RENDER_ORDER.ground;
  const { spread, opacity, lift } = GROUND.shadow;
  const footprint = new PlaneGeometry(
    (TERRACE.x[1] - TERRACE.x[0]) * spread,
    (TERRACE.z[1] - TERRACE.z[0]) * spread,
  );
  footprint.rotateX(-QUARTER_TURN);
  footprint.translate(0, HOUSE_WALL_BOTTOM_CM + lift, 0);
  const shade = new MeshBasicMaterial({
    map: context.textures.shadow,
    transparent: true,
    opacity,
    depthWrite: false,
  });
  const shadow = registeredMesh(context, footprint, UNDIMMED_GROUP, shade);
  shadow.renderOrder = RENDER_ORDER.ground;
  const object = new Group();
  object.add(ground, shadow);
  return object;
}
