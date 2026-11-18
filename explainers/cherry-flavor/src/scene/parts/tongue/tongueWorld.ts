import { Vector3 } from 'three';
import type { Object3D } from 'three';
import type { AssemblyState, Point } from '../../../ids';
import { label } from '../context';
import type { PartContext, Section } from '../context';
import { AromaStream } from '../stream';
import type { StreamLook } from '../stream';
import { Scoop } from './scoop';
import { buildTongueSurface } from './surface';
import type { TongueSurface } from './surface';

const PLUME: StreamLook = {
  perOdorant: 44,
  size: 3.4,
  width: 4.5,
  speed: 0.16,
  gain: 3,
  seed: 71,
  wobble: 1.1,
  fadeIn: 0.06,
  fadeOut: 0.3,
};

const PLUME_RISE: readonly Point[] = [
  [1.2, 9, -0.8],
  [-1.4, 17, 1],
  [2, 26, -0.5],
];

class TongueWorld implements Section {
  readonly root: Object3D;
  private readonly surface: TongueSurface;
  private readonly scoop: Scoop;
  private readonly plume: AromaStream;
  private readonly path = [new Vector3(), ...PLUME_RISE.map((point) => new Vector3(...point))];

  constructor(context: PartContext, root: Object3D) {
    this.root = root;
    this.surface = buildTongueSurface(context, root);
    this.scoop = new Scoop(context, root);
    this.plume = new AromaStream(context, root, 'aromaCloud', PLUME);
    label(context, 'aromaCloud', this.plume.cloud.points, PLUME_RISE[1]);
  }

  setState(state: AssemblyState): void {
    this.surface.setTaste(state.reading.taste);
    this.scoop.setState(state);
    const start = this.scoop.top(this.path[0]);
    this.path[1].setY(Math.max(PLUME_RISE[0][1], start.y + 2));
    this.plume.setPath(this.path);
    this.plume.setLevels(state.reading.mouth);
  }

  update(deltaSeconds: number): boolean {
    const plume = this.plume.update(deltaSeconds);
    const held = this.scoop.update(deltaSeconds);
    return plume || held;
  }
}

export function buildTongueWorld(context: PartContext, root: Object3D): Section {
  return new TongueWorld(context, root);
}
