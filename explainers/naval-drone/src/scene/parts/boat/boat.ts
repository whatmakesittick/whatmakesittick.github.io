import { Group, Mesh } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import type { Steps } from '@core/scene/pacing';
import type { AssemblyState } from '../../../ids';
import { applyBoatPose } from '../../pose';
import { ANIMATION, JET_SHAPE } from '../../constants';
import { MAX_RPM } from '../../../model/jet';
import { FINISHES } from '../../finishes';
import { mergeParts } from '../context';
import type { PartContext } from '../context';
import { wetSurface } from '../water/wetSurface';
import { CutawaySwitch } from './cutaway';
import { buildDeckItems } from './deckItems';
import type { DeckItems } from './deckItems';
import { buildFairing } from './fairing';
import { buildInternals } from './internals';
import type { Internals } from './internals';
import { buildHullShell } from './hullShell';
import type { Look, ShellGroup, ShellPiece } from './hullShell';
import { buildWaterjet } from './waterjet';
import type { Waterjet } from './waterjet';

function finishOf(context: PartContext, look: Look): MaterialFinish {
  switch (look) {
    case 'side':
      return context.looks.side;
    case 'deck':
      return context.looks.deck;
    case 'inner':
      return FINISHES.inner;
    default:
      return FINISHES.section;
  }
}

function shellMesh(
  context: PartContext,
  pieces: readonly ShellPiece[],
  group: ShellGroup,
  look: Look,
): Mesh {
  const geometry = context.tracker.track(mergeParts(pieces.map((piece) => piece.geometry)));
  const material = context.materials.get(group, finishOf(context, look));
  if (look === 'side') wetSurface(material);
  return new Mesh(geometry, material);
}

function* buildShell(context: PartContext, cutaway: CutawaySwitch): Steps<Mesh[]> {
  const pieces = buildHullShell();
  yield;
  const keys = new Set(pieces.map((piece) => `${piece.group}|${piece.look}|${piece.side}`));
  const meshes: Mesh[] = [];
  for (const key of keys) {
    const [group, look, side] = key.split('|') as [ShellGroup, Look, ShellPiece['side']];
    const chosen = pieces.filter(
      (piece) => piece.group === group && piece.look === look && piece.side === side,
    );
    const mesh = shellMesh(context, chosen, group, look);
    if (side === 'portAft') cutaway.whole(mesh);
    if (side === 'opened') cutaway.opened(mesh);
    meshes.push(mesh);
    yield;
  }
  const fairing = buildFairing();
  const { tracker, materials, looks } = context;
  const deck = materials.get('hull', looks.deck);
  const pocket = materials.get('hull', FINISHES.pocket);
  meshes.push(
    new Mesh(tracker.track(fairing.outer), deck),
    cutaway.whole(new Mesh(tracker.track(fairing.outerPort), deck)),
    new Mesh(tracker.track(fairing.pockets), pocket),
    cutaway.whole(new Mesh(tracker.track(fairing.pocketsPort), pocket)),
    cutaway.opened(new Mesh(tracker.track(fairing.inner), materials.get('hull', FINISHES.inner))),
    cutaway.opened(new Mesh(tracker.track(fairing.cut), materials.get('hull', FINISHES.section))),
  );
  return meshes;
}

interface BoatParts {
  cutaway: CutawaySwitch;
  shell: readonly Mesh[];
  deck: DeckItems;
  jet: Waterjet;
  internals: Internals;
}

export function* buildBoat(context: PartContext): Steps<BoatPart> {
  const cutaway = new CutawaySwitch();
  const shell = yield* buildShell(context, cutaway);
  const deck = buildDeckItems(context);
  yield;
  const jet = buildWaterjet(context, cutaway);
  yield;
  const internals = buildInternals(context);
  return new BoatPart({ cutaway, shell, deck, jet, internals });
}

export class BoatPart {
  readonly object = new Group();
  readonly body = new Group();
  readonly cutaway: CutawaySwitch;
  readonly deck: DeckItems;
  readonly jet: Waterjet;
  readonly internals: Internals;
  private clock = 0;

  constructor({ cutaway, shell, deck, jet, internals }: BoatParts) {
    this.cutaway = cutaway;
    this.deck = deck;
    this.jet = jet;
    this.internals = internals;
    this.object.add(this.body);
    this.body.add(...shell, deck.object, jet.object, cutaway.opened(internals.object));
  }

  advance(deltaSeconds: number, state: AssemblyState): void {
    this.clock += deltaSeconds;
    const hertz = state.jet.impellerShare * MAX_RPM * ANIMATION.rpmToHertz;
    const shown = Math.min(hertz, ANIMATION.impellerCap);
    this.jet.impeller.rotation.x += Math.PI * 2 * shown * deltaSeconds;
    this.jet.blur.visible = hertz > ANIMATION.blurFrom;
    this.deck.dome.rotation.y = ANIMATION.domeScan * Math.sin(this.clock * ANIMATION.domeRate);
  }

  setState(state: AssemblyState): void {
    applyBoatPose(this.object, state.boat, state.planing);
    const hertz = state.jet.impellerShare * MAX_RPM * ANIMATION.rpmToHertz;
    this.jet.blur.visible = hertz > ANIMATION.blurFrom;
    this.cutaway.set(state.view.cutaway);
    this.jet.steering.rotation.y = state.jet.nozzleAngle;
    this.jet.bucket.rotation.z = JET_SHAPE.bucket.stow * (1 - state.jet.bucket);
  }
}
