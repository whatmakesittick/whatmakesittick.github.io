import type { Object3D } from 'three';
import { lerp, smoothstep } from '@core/math';

export const CLOSE_UP = { nearM: 0.8, farM: 8, floor: 0.06, openBelowM: 3 } as const;

export function closeUpFactor(cameraDistance: number): number {
  return lerp(CLOSE_UP.floor, 1, smoothstep(cameraDistance, CLOSE_UP.nearM, CLOSE_UP.farM));
}

export function opensUp(cameraDistance: number): boolean {
  return cameraDistance < CLOSE_UP.openBelowM;
}

export class CloseUp {
  private current = 1;

  get factor(): number {
    return this.current;
  }

  follow(cameraDistance: number): boolean {
    const next = closeUpFactor(cameraDistance);
    if (next === this.current) return false;
    this.current = next;
    return true;
  }
}

export class Reveal {
  private readonly covers: Object3D[] = [];
  private open = false;

  add(...covers: readonly Object3D[]): this {
    this.covers.push(...covers);
    return this;
  }

  follow(cameraDistance: number): boolean {
    const next = opensUp(cameraDistance);
    if (next === this.open) return false;
    this.open = next;
    this.covers.forEach((cover) => (cover.visible = !next));
    return true;
  }
}
