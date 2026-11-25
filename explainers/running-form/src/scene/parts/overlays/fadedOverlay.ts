import { Group } from 'three';
import { smoothstep } from '@core/math';
import type { AssemblyState, ViewOptions } from '../../../ids';
import type { RunnerPose } from '../../runnerPose';
import type { Overlay } from './overlays';
import { Fade } from './strokes';
import type { OverlayTag } from './tag';

const FADE_SECONDS = 0.3;

export abstract class FadedOverlay implements Overlay {
  readonly root = new Group();
  protected readonly fade = new Fade(FADE_SECONDS);
  private readonly viewFlag: keyof ViewOptions;
  private state: AssemblyState | null = null;
  private pose: RunnerPose | null = null;

  protected constructor(viewFlag: keyof ViewOptions) {
    this.viewFlag = viewFlag;
    this.root.visible = false;
  }

  abstract tags(): readonly OverlayTag[];
  abstract dispose(): void;
  protected abstract render(state: AssemblyState, pose: RunnerPose, share: number): void;

  setState(state: AssemblyState, pose: RunnerPose): void {
    this.state = state;
    this.pose = pose;
    this.fade.aim(state.view[this.viewFlag]);
    this.apply();
  }

  update(deltaSeconds: number): boolean {
    const moving = this.fade.step(deltaSeconds);
    if (moving) this.apply();
    return moving;
  }

  protected apply(): void {
    this.root.visible = this.fade.share > 0;
    const { state, pose } = this;
    if (!state || !pose || !this.root.visible) return;
    this.render(state, pose, smoothstep(this.fade.share));
  }
}
