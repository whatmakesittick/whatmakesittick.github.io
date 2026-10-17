import type { CameraView } from '../ids';
import { PHASE_RANGES } from '../model';

export interface ViewFramer {
  frame(view: CameraView, animate: boolean, variant?: string): void;
}

const HANDOVER_VIEWS: Readonly<Partial<Record<CameraView, CameraView>>> = {
  tankClose: 'boostSide',
};

export const HANDOVER_AFTER_S = PHASE_RANGES.sprint.start;

export class ViewHandover implements ViewFramer {
  private readonly views: ViewFramer;
  private requested: CameraView | null = null;
  private shown: CameraView | null = null;
  private variant: string | undefined;
  private moving = false;

  constructor(views: ViewFramer) {
    this.views = views;
  }

  frame(view: CameraView, animate: boolean, variant?: string): void {
    this.requested = view;
    this.variant = variant;
    this.show(animate);
  }

  setPhase(phase: number): void {
    this.moving = phase > HANDOVER_AFTER_S;
    if (this.requested && this.resolved() !== this.shown) this.show(true);
  }

  private resolved(): CameraView | null {
    const handover = this.requested ? HANDOVER_VIEWS[this.requested] : undefined;
    return this.moving && handover ? handover : this.requested;
  }

  private show(animate: boolean): void {
    const view = this.resolved();
    if (!view) return;
    this.shown = view;
    this.views.frame(view, animate, this.variant);
  }
}
