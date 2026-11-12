import { lerp, smoothstep } from '@core/math';
import { CLOSE_UP } from './dims';

export function closeUpFactor(cameraDistance: number): number {
  return lerp(CLOSE_UP.floor, 1, smoothstep(cameraDistance, CLOSE_UP.nearM, CLOSE_UP.farM));
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
