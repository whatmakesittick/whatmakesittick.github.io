import { Group } from 'three';
import type { AssemblyState } from '../../../ids';
import type { RunnerPose } from '../../runnerPose';
import type { PartContext } from '../context';
import { FootPath } from './footPath';
import { ForceArrow } from './forces';
import { FormLines } from './formLines';
import type { OverlayTag } from './tag';

export interface Overlay {
  readonly root: Group;
  setState(state: AssemblyState, pose: RunnerPose): void;
  update(deltaSeconds: number): boolean;
  tags(): readonly OverlayTag[];
  dispose(): void;
}

export type Overlays = Overlay;

class OverlayGroup implements Overlays {
  readonly root = new Group();
  private readonly members: readonly Overlay[];

  constructor(members: readonly Overlay[]) {
    this.members = members;
    this.root.name = 'overlays';
    members.forEach((member) => this.root.add(member.root));
  }

  setState(state: AssemblyState, pose: RunnerPose): void {
    this.members.forEach((member) => member.setState(state, pose));
  }

  update(deltaSeconds: number): boolean {
    return this.members.reduce((moving, member) => member.update(deltaSeconds) || moving, false);
  }

  tags(): readonly OverlayTag[] {
    return this.members.flatMap((member) => member.tags());
  }

  dispose(): void {
    this.members.forEach((member) => member.dispose());
  }
}

export function buildOverlays(context: PartContext): Overlays {
  return new OverlayGroup([new ForceArrow(context), new FormLines(context), new FootPath(context)]);
}
