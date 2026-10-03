import { Group, Mesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { AssemblyState } from '../../../ids';
import { applyBoatPose } from '../../pose';
import { JET_SHAPE } from '../../constants';
import { FINISHES } from '../../finishes';
import { mergeParts } from '../context';
import type { PartContext } from '../context';
import { wetSurface } from '../water/wetSurface';
import { CutawaySwitch } from './cutaway';
import { buildDeckItems } from './deckItems';
import type { DeckItems } from './deckItems';
import { buildFairing } from './fairing';
import { buildHullShell } from './hullShell';
import type { Look, ShellGroup, ShellPiece } from './hullShell';
import { buildWaterjet } from './waterjet';
import type { Waterjet } from './waterjet';

export class BoatPart {
  readonly object = new Group();
  readonly body = new Group();
  readonly cutaway = new CutawaySwitch();
  readonly deck: DeckItems;
  readonly jet: Waterjet;
  private readonly context: PartContext;

  constructor(context: PartContext) {
    this.context = context;
    this.object.add(this.body);
    this.buildShell();
    this.deck = buildDeckItems(context);
    this.jet = buildWaterjet(context, this.cutaway);
    this.body.add(this.deck.object, this.jet.object);
  }

  private finish(look: Look): MaterialFinish {
    switch (look) {
      case 'side':
        return this.context.looks.side;
      case 'deck':
        return this.context.looks.deck;
      case 'inner':
        return FINISHES.inner;
      default:
        return FINISHES.section;
    }
  }

  private mesh(pieces: readonly ShellPiece[], group: ShellGroup, look: Look): Mesh {
    const geometry = this.context.tracker.track(mergeParts(pieces.map((piece) => piece.geometry)));
    const material = this.context.materials.get(group, this.finish(look));
    if (look === 'side') wetSurface(material);
    return new Mesh(geometry, material);
  }

  private buildShell(): void {
    const pieces = buildHullShell();
    const keys = new Set(pieces.map((piece) => `${piece.group}|${piece.look}|${piece.side}`));
    keys.forEach((key) => {
      const [group, look, side] = key.split('|') as [ShellGroup, Look, ShellPiece['side']];
      const chosen = pieces.filter(
        (piece) => piece.group === group && piece.look === look && piece.side === side,
      );
      const mesh = this.mesh(chosen, group, look);
      if (side === 'portAft') this.cutaway.whole(mesh);
      if (side === 'opened') this.cutaway.opened(mesh);
      this.body.add(mesh);
    });
    const fairing = buildFairing();
    const { tracker, materials, looks } = this.context;
    const deck = materials.get('hull', looks.deck);
    const pocket = materials.get('hull', FINISHES.pocket);
    this.body.add(
      new Mesh(tracker.track(fairing.outer), deck),
      this.cutaway.whole(new Mesh(tracker.track(fairing.outerPort), deck)),
      new Mesh(tracker.track(fairing.pockets), pocket),
      this.cutaway.whole(new Mesh(tracker.track(fairing.pocketsPort), pocket)),
      this.cutaway.opened(
        new Mesh(tracker.track(fairing.inner), materials.get('hull', FINISHES.inner)),
      ),
      this.cutaway.opened(
        new Mesh(tracker.track(fairing.cut), materials.get('hull', FINISHES.section)),
      ),
    );
  }

  setState(state: AssemblyState): void {
    applyBoatPose(this.object, state.boat, state.planing);
    this.cutaway.set(state.view.cutaway);
    this.jet.steering.rotation.y = state.jet.nozzleAngle;
    this.jet.bucket.rotation.z = JET_SHAPE.bucket.stow * (1 - state.jet.bucket);
  }
}
