import { Group } from 'three';
import type { Object3D } from 'three';
import type { AssemblyState, PartId } from '../../../ids';
import type { PartContext } from '../context';
import type { CarView, EffectsView } from '../types';
import { ContactShadow } from './contactShadow';
import { FanGlow } from './fanGlow';
import { ForceArrows } from './forceArrows';
import { GhostPath } from './ghostPath';
import { Plumes } from './plumes';

export type EffectLabel = Extract<PartId, 'jets' | 'forceArrows' | 'fans' | 'ghostPath'>;

export const EFFECTS_NAME = 'effects';

export class EffectsPart implements EffectsView {
  readonly object = new Group();
  readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly plumes: Plumes;
  private readonly arrows: ForceArrows;
  private readonly fanGlow: FanGlow;
  private readonly shadow: ContactShadow;
  private readonly ghost: GhostPath;

  constructor(context: PartContext, car: CarView) {
    this.plumes = new Plumes(context, car);
    this.arrows = new ForceArrows(context, car);
    this.fanGlow = new FanGlow(context, car);
    this.shadow = new ContactShadow(context);
    this.ghost = new GhostPath(context, car.silhouette());
    this.object.name = EFFECTS_NAME;
    this.object.add(this.shadow.mesh, this.ghost.object, this.arrows.object);
    this.labels = new Map<EffectLabel, Object3D>([
      ['jets', this.plumes.label],
      ['forceArrows', this.arrows.label],
      ['fans', this.fanGlow.label],
      ['ghostPath', this.ghost.label],
    ]);
  }

  setState(state: AssemblyState): void {
    this.plumes.setState(state);
    this.arrows.setState(state);
    this.fanGlow.setState(state.fans);
    this.shadow.setState(state.car);
    this.ghost.setState(state.view.ghost);
  }

  advance(deltaSeconds: number): boolean {
    const puffing = this.plumes.advance(deltaSeconds);
    const glowing = this.fanGlow.advance(deltaSeconds);
    const easing = this.arrows.advance(deltaSeconds);
    return puffing || glowing || easing;
  }
}
