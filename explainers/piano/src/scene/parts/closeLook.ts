import type { IUniform } from 'three';
import type { CameraView } from '../../ids';
import { Ease } from './ease';

const CLOSE_VIEWS: ReadonlySet<CameraView> = new Set<CameraView>(['action', 'escapement']);
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

  step(deltaSeconds: number): boolean {
    const easing = this.ease.running;
    this.ease.step(deltaSeconds);
    this.amount.value = this.ease.value;
    return easing;
  }
}
