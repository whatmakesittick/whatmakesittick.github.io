import { Matrix4 } from 'three';
import type { Group } from 'three';
import type { FigureBody } from '@core/figure/body/figureBody';
import type { FigureRig } from '@core/figure/body/figureRig';
import type { GaitReading, SideId } from '../../../ids';
import { SIDE_IDS } from '../../../ids';
import type { RunnerFigure } from '../../runnerSlot';
import type { ShoeFrames } from './body/skinShader';
import type { Shoe } from './shoes/shoe';
import type { SkeletonCache } from './skeletons';

const MIRROR_Z = new Matrix4().makeScale(1, 1, -1);

interface RunnerParts {
  readonly root: Group;
  readonly rig: FigureRig;
  readonly body: FigureBody;
  readonly skeletons: SkeletonCache;
  readonly shoes: Readonly<Record<SideId, Shoe>>;
  readonly followers: readonly (() => void)[];
  readonly shoeFrames: ShoeFrames;
}

export class Runner implements RunnerFigure {
  readonly root: Group;
  private readonly parts: RunnerParts;
  private applied: GaitReading | null = null;

  constructor(parts: RunnerParts) {
    this.root = parts.root;
    this.parts = parts;
  }

  apply(reading: GaitReading): void {
    if (reading === this.applied) return;
    this.applied = reading;
    const { rig, body, skeletons, shoes, followers, shoeFrames } = this.parts;
    const skeleton = skeletons.at(reading);
    rig.pose(skeleton);
    body.update();
    followers.forEach((follow) => follow());
    SIDE_IDS.forEach((side) => shoes[side].update(skeleton.legs[side].solution.chain));
    shoeFrames[0].copy(shoes.right.group.matrix).invert();
    shoeFrames[1].copy(shoes.left.group.matrix).invert().premultiply(MIRROR_Z);
  }

  dispose(): void {
    this.root.removeFromParent();
  }
}
