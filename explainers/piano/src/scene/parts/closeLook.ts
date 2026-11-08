import { MathUtils } from 'three';
import type { IUniform } from 'three';
import type { CameraView } from '../../ids';
import { Ease } from './ease';

const CLOSE_VIEWS: ReadonlySet<CameraView> = new Set<CameraView>(['action', 'escapement']);
const NEAR = { full: 1.8, none: 2.8 } as const;
const OPEN = 0;
const CLOSE = 1;

export function isCloseView(view: CameraView): boolean {
  return CLOSE_VIEWS.has(view);
}

export class CloseLook {
  readonly amount: IUniform<number> = { value: OPEN };
  private readonly ease = new Ease(OPEN);

  get value(): number {
    return this.amount.value;
  }

  focus(view: CameraView): void {
    this.ease.aim(isCloseView(view) ? CLOSE : OPEN);
  }

  step(deltaSeconds: number, cameraDistance: number): boolean {
    const easing = this.ease.running;
    this.ease.step(deltaSeconds);
    const near = 1 - MathUtils.smoothstep(cameraDistance, NEAR.full, NEAR.none);
    this.amount.value = this.ease.value * near;
    return easing;
  }
}
