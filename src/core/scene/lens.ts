import type { PerspectiveCamera } from 'three';
import { toDegrees, toRadians } from '../math';
import { CAMERA_FOV } from './constants';

export interface SafeArea {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export type GaugeSide = 'right' | 'top';

export interface ViewportSize {
  width: number;
  height: number;
  safe: SafeArea;
}

export interface FramingSlopes {
  vertical: number;
  horizontal: number;
}

export const NO_SAFE_AREA: SafeArea = { top: 0, right: 0, bottom: 0, left: 0 };

const BASE_SLOPE = Math.tan(toRadians(CAMERA_FOV / 2));

function safeWidth({ width, safe }: ViewportSize): number {
  return width - safe.left - safe.right;
}

function safeHeight({ height, safe }: ViewportSize): number {
  return height - safe.top - safe.bottom;
}

export function applyLens(camera: PerspectiveCamera, size: ViewportSize): void {
  const { width, height, safe } = size;
  const shiftX = (safe.left - safe.right) / 2;
  const shiftY = (safe.top - safe.bottom) / 2;
  const fullWidth = width + 2 * Math.abs(shiftX);
  const fullHeight = height + 2 * Math.abs(shiftY);
  camera.fov = toDegrees(2 * Math.atan((BASE_SLOPE * fullHeight) / height));
  camera.aspect = fullWidth / fullHeight;
  if (shiftX === 0 && shiftY === 0) {
    camera.clearViewOffset();
  } else {
    const offsetX = fullWidth / 2 - (width / 2 + shiftX);
    const offsetY = fullHeight / 2 - (height / 2 + shiftY);
    camera.setViewOffset(fullWidth, fullHeight, offsetX, offsetY, width, height);
  }
  camera.updateProjectionMatrix();
}

export function framingSlopes(size: ViewportSize): FramingSlopes {
  return {
    vertical: (BASE_SLOPE * safeHeight(size)) / size.height,
    horizontal: (BASE_SLOPE * safeWidth(size)) / size.height,
  };
}
