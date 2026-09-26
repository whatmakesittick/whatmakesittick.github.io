import { CanvasTexture, SRGBColorSpace } from 'three';
import type { Texture } from 'three';

const TEXTURE_SIZE = 128;

export interface SceneTextures {
  dot: Texture;
  glow: Texture;
  shadow: Texture;
  dispose(): void;
}

interface GradientStop {
  offset: number;
  color: string;
}

function radialTexture(stops: readonly GradientStop[]): CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = TEXTURE_SIZE;
  canvas.height = TEXTURE_SIZE;
  const context = canvas.getContext('2d');
  if (context) {
    const half = TEXTURE_SIZE / 2;
    const gradient = context.createRadialGradient(half, half, 0, half, half, half);
    stops.forEach((stop) => gradient.addColorStop(stop.offset, stop.color));
    context.fillStyle = gradient;
    context.fillRect(0, 0, TEXTURE_SIZE, TEXTURE_SIZE);
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

export function softDotTexture(): CanvasTexture {
  return radialTexture([
    { offset: 0, color: 'rgba(255,255,255,1)' },
    { offset: 0.35, color: 'rgba(255,255,255,0.85)' },
    { offset: 1, color: 'rgba(255,255,255,0)' },
  ]);
}

export function glowTexture(): CanvasTexture {
  return radialTexture([
    { offset: 0, color: 'rgba(255,255,255,1)' },
    { offset: 0.15, color: 'rgba(255,255,255,0.7)' },
    { offset: 0.5, color: 'rgba(255,255,255,0.15)' },
    { offset: 1, color: 'rgba(255,255,255,0)' },
  ]);
}

export function contactShadowTexture(): CanvasTexture {
  return radialTexture([
    { offset: 0, color: 'rgba(0,0,0,0.75)' },
    { offset: 0.45, color: 'rgba(0,0,0,0.4)' },
    { offset: 1, color: 'rgba(0,0,0,0)' },
  ]);
}

export function createSceneTextures(): SceneTextures {
  const dot = softDotTexture();
  const glow = glowTexture();
  const shadow = contactShadowTexture();
  return {
    dot,
    glow,
    shadow,
    dispose: () => [dot, glow, shadow].forEach((texture) => texture.dispose()),
  };
}
