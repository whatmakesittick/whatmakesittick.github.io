import type { Object3D } from 'three';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { buildDamper } from './detailedDamper';
import { buildHammer } from './detailedHammer';
import { buildKey } from './detailedKey';
import { buildLevers } from './detailedLevers';
import { addFixtures } from './fixtures';
import type { DetailedPose } from './layout';
import type { Piece } from './meshes';

export class DetailedAction {
  readonly root: Object3D;
  readonly damper: Object3D;
  private readonly pieces: readonly Piece[];
  private key: number | null = null;

  constructor(context: PartContext) {
    this.root = namedGroup('playedAction');
    this.damper = namedGroup('playedDamper');
    addFixtures(context, this.root);
    this.pieces = [
      buildKey(context, this.root),
      buildLevers(context, this.root),
      buildHammer(context, this.root),
      buildDamper(context, this.damper),
    ];
  }

  setKey(key: number): void {
    if (key === this.key) return;
    this.key = key;
    this.pieces.forEach((piece) => piece.setKey?.(key));
  }

  pose(pose: DetailedPose): void {
    this.pieces.forEach((piece) => piece.pose?.(pose));
  }

  focus(close: boolean): void {
    this.pieces.forEach((piece) => piece.focus?.(close));
  }
}
