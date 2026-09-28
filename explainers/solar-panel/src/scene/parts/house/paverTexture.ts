import type { CanvasTexture } from 'three';
import { seededRandom } from '../../geometry/random';
import { PAINT } from '../../finishes';
import { canvasTexture } from '../canvas';

const SIZE = 256;
const TILES = 4;
const JOINT_SHARE = 0.03;
const SPECKLES = 900;
const SPECKLE_ALPHA = 0.06;
const TILE_SHADE = 0.05;
const SEED = 17;
const SPECKLE_SPLIT = 0.5;
const CHANNEL_MAX = 255;
const SPECKLE_PX = 1.5;

export const PAVER_TILES_PER_TEXTURE = TILES;

export function paverTexture(): CanvasTexture {
  return canvasTexture(SIZE, SIZE, (context, width) => {
    const random = seededRandom(SEED);
    const tile = width / TILES;
    const joint = Math.max(1, tile * JOINT_SHARE);
    context.fillStyle = PAINT.paverJoint;
    context.fillRect(0, 0, width, width);
    for (let row = 0; row < TILES; row += 1) {
      for (let column = 0; column < TILES; column += 1) {
        context.fillStyle = PAINT.paver;
        context.fillRect(
          column * tile + joint / 2,
          row * tile + joint / 2,
          tile - joint,
          tile - joint,
        );
        context.fillStyle = `rgba(0, 0, 0, ${random() * TILE_SHADE})`;
        context.fillRect(
          column * tile + joint / 2,
          row * tile + joint / 2,
          tile - joint,
          tile - joint,
        );
      }
    }
    for (let index = 0; index < SPECKLES; index += 1) {
      const shade = random() > SPECKLE_SPLIT ? CHANNEL_MAX : 0;
      context.fillStyle = `rgba(${shade}, ${shade}, ${shade}, ${SPECKLE_ALPHA})`;
      context.fillRect(random() * width, random() * width, SPECKLE_PX, SPECKLE_PX);
    }
  });
}
