import {
  BoxGeometry,
  DataTexture,
  LinearFilter,
  MathUtils,
  Matrix4,
  PlaneGeometry,
  RGBAFormat,
  SRGBColorSpace,
  Vector3,
} from 'three';
import type { BufferGeometry } from 'three';
import { ROOM, SCREEN } from '../../../model/layout';
import { ROOM_DETAIL } from '../../constants';
import { mergeParts } from '../context';

const QUARTER = Math.PI / 2;
const CHANNELS = 4;
const FULL = 255;
const BAR_LEVEL = 7;
const SURFACE_LIFT = 0.002;
const WALL_X = ROOM.x[1];
const MOUNT = {
  bezel: 0.018,
  depth: 0.03,
  hump: { width: 0.36, height: 0.26, depth: 0.03 },
  arm: 0.045,
  plate: { thickness: 0.016, height: 0.22, width: 0.12 },
} as const;

const PICTURE_ROWS = ROOM_DETAIL.pictureSize;
export const PICTURE_COLUMNS = Math.round((PICTURE_ROWS * SCREEN.width) / SCREEN.height);
const BAR_COLUMNS = Math.floor((PICTURE_COLUMNS - PICTURE_ROWS) / 2);

function monitorMatrix(): Matrix4 {
  return new Matrix4().makeRotationY(SCREEN.yawTowardTable - QUARTER).setPosition(...SCREEN.centre);
}

function wallArm(matrix: Matrix4): BufferGeometry[] {
  const { depth, hump, arm, plate } = MOUNT;
  const back = depth + hump.depth;
  const reach = (WALL_X - SCREEN.centre[0]) / Math.cos(SCREEN.yawTowardTable) - back;
  const end = new Vector3(0, 0, -(back + reach)).applyMatrix4(matrix);
  return [
    new BoxGeometry(arm, arm, reach).translate(0, 0, -(back + reach / 2)).applyMatrix4(matrix),
    new BoxGeometry(plate.thickness, plate.height, plate.width).translate(
      WALL_X - plate.thickness / 2,
      end.y,
      end.z,
    ),
  ];
}

export function monitorGeometry(): { housing: BufferGeometry; display: BufferGeometry } {
  const { bezel, depth, hump } = MOUNT;
  const matrix = monitorMatrix();
  const frame = new BoxGeometry(SCREEN.width + 2 * bezel, SCREEN.height + 2 * bezel, depth);
  const back = new BoxGeometry(hump.width, hump.height, hump.depth);
  return {
    housing: mergeParts([
      frame.translate(0, 0, -depth / 2).applyMatrix4(matrix),
      back.translate(0, 0, -depth - hump.depth / 2).applyMatrix4(matrix),
      ...wallArm(matrix),
    ]),
    display: new PlaneGeometry(SCREEN.width, SCREEN.height)
      .translate(0, 0, SURFACE_LIFT)
      .applyMatrix4(matrix),
  };
}

export function pictureTexture(): DataTexture {
  const data = new Uint8Array(PICTURE_COLUMNS * PICTURE_ROWS * CHANNELS).fill(BAR_LEVEL);
  for (let at = CHANNELS - 1; at < data.length; at += CHANNELS) data[at] = FULL;
  const texture = new DataTexture(data, PICTURE_COLUMNS, PICTURE_ROWS, RGBAFormat);
  texture.colorSpace = SRGBColorSpace;
  texture.magFilter = LinearFilter;
  texture.minFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

export function writePicture(texture: DataTexture, picture: Float32Array): void {
  const data = texture.image.data as Uint8Array;
  for (let row = 0; row < PICTURE_ROWS; row += 1) {
    for (let column = 0; column < PICTURE_ROWS; column += 1) {
      const value = MathUtils.clamp(picture[row * PICTURE_ROWS + column] ?? 0, 0, 1);
      const pixel = (PICTURE_ROWS - 1 - row) * PICTURE_COLUMNS + BAR_COLUMNS + column;
      data.fill(Math.round(value * FULL), pixel * CHANNELS, (pixel + 1) * CHANNELS - 1);
    }
  }
  texture.needsUpdate = true;
}
