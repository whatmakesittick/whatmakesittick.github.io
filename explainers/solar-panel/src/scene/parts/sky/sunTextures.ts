import type { CanvasTexture } from 'three';
import { RAYS, SUN_DISC } from '../../constants';
import { canvasTexture, repeating } from '../canvas';

export function sunDiscTexture(): CanvasTexture {
  const size = SUN_DISC.textureSize;
  return canvasTexture(size, size, (context) => {
    const half = size / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(1 - SUN_DISC.limb, 'rgba(255, 250, 240, 1)');
    gradient.addColorStop(0.97, 'rgba(255, 236, 210, 1)');
    gradient.addColorStop(1, 'rgba(255, 236, 210, 0)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(half, half, half, 0, Math.PI * 2);
    context.fill();
  });
}

const RAY_TEXTURE = { width: 8, height: 128 } as const;

export function rayDashTexture(): CanvasTexture {
  const { width, height } = RAY_TEXTURE;
  const texture = canvasTexture(width, height, (context) => {
    const glow = context.createLinearGradient(0, 0, 0, height);
    glow.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
    glow.addColorStop(0.7, 'rgba(255, 255, 255, 1)');
    glow.addColorStop(1, 'rgba(255, 255, 255, 0.25)');
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);
  });
  return repeating(texture, 1, RAYS.dashes);
}

export function rayFadeTexture(): CanvasTexture {
  const { width, height } = RAY_TEXTURE;
  return canvasTexture(width, height, (context) => {
    const fade = context.createLinearGradient(0, 0, 0, height);
    fade.addColorStop(0, '#000000');
    fade.addColorStop(0.6, '#8a8a8a');
    fade.addColorStop(1, '#ffffff');
    context.fillStyle = fade;
    context.fillRect(0, 0, width, height);
  });
}
