import { BoxGeometry, Group } from 'three';
import type { BufferGeometry } from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { AssemblyState, ShotReading } from '../../ids';
import { BULLET_SEAT_X, CARTRIDGE } from '../../model/layout';
import type { Point } from '../../model/scale';
import {
  BULLET_SHAPE,
  MAGAZINE_ARC,
  MAGAZINE_SHAPE,
  ROUND_SEGMENTS,
  SHEET,
  magazinePoint,
} from '../constants';
import type { Look } from '../finishes';
import { bulletStrands, caseStrands, powderStrands, primerStrands } from '../geometry/cartridge';
import { boxGeometry, turnedPiece } from '../geometry/pieces';
import type { SplitPiece } from '../geometry/pieces';
import {
  boltTravel,
  casePose,
  feedPose,
  stackArc,
  stackCount,
  stackPose,
} from '../geometry/roundPaths';
import type { RoundPose } from '../geometry/roundPaths';
import { turnStrands } from '../geometry/turned';
import type { TurnStrand } from '../geometry/turned';
import { markDynamic, partMesh } from './context';
import type { EmphasisGroup, PartContext } from './context';

export type Representation = 'whole' | 'section' | 'hidden';

export interface RoundGeometry {
  case: SplitPiece;
  primer: SplitPiece;
  powder: SplitPiece;
  bullet: BufferGeometry;
  engraving: BufferGeometry;
}

interface RoundGroups {
  case: EmphasisGroup;
  primer: EmphasisGroup;
  powder?: EmphasisGroup;
  bullet?: EmphasisGroup;
}

const FULL_TURN = Math.PI * 2;
const ENGRAVING_LIFT = 0.05;
const FOLLOWER = { gap: 1.5, thickness: 2.4, clearance: 0.2 } as const;

function engravingGeometry(): BufferGeometry {
  const { heel, bearingEnd, engraving } = BULLET_SHAPE;
  const length = bearingEnd - heel;
  const parts = Array.from({ length: engraving.count }, (_, index) => {
    const groove = new BoxGeometry(length, engraving.depth + ENGRAVING_LIFT, engraving.width);
    groove.translate(
      heel + length / 2,
      CARTRIDGE.bulletRadius - (engraving.depth - ENGRAVING_LIFT) / 2,
      0,
    );
    return groove.rotateX((index / engraving.count) * FULL_TURN);
  });
  const merged = mergeGeometries(parts);
  parts.forEach((part) => part.dispose());
  if (!merged) throw new Error('Cannot merge the bullet engraving');
  return merged;
}

export function createRoundGeometry(context: PartContext): RoundGeometry {
  const turned = (strands: readonly TurnStrand[]) =>
    turnedPiece({ strands, segments: ROUND_SEGMENTS });
  const { tracker } = context;
  const pieces = {
    case: turned(caseStrands()),
    primer: turned(primerStrands()),
    powder: turned(powderStrands()),
  };
  for (const piece of Object.values(pieces)) {
    [piece.whole, piece.half, piece.face].forEach(
      (geometry) => geometry && tracker.track(geometry),
    );
  }
  return {
    ...pieces,
    bullet: tracker.track(turnStrands(bulletStrands(), ROUND_SEGMENTS)),
    engraving: tracker.track(engravingGeometry()),
  };
}

function bulletMeshes(context: PartContext, geometry: RoundGeometry, group: EmphasisGroup): Group {
  const bullet = new Group();
  bullet.add(partMesh(context, geometry.bullet, group, context.looks.copper.surface));
  bullet.add(partMesh(context, geometry.engraving, group, context.looks.engraving.surface));
  return bullet;
}

function seatedBullet(bullet: Group): Group {
  bullet.position.x = BULLET_SEAT_X;
  return bullet;
}

function place(object: Group, base: Point, tilt: number): void {
  object.position.set(...base);
  object.rotation.set(0, 0, tilt);
}

export class RoundView {
  readonly object = new Group();
  private readonly whole = new Group();
  private readonly section = new Group();
  private readonly context: PartContext;

  constructor(context: PartContext, geometry: RoundGeometry, groups: RoundGroups) {
    this.context = context;
    const { looks } = context;
    this.addSplit(geometry.case, groups.case, looks.case);
    this.addSplit(geometry.primer, groups.primer, looks.primer);
    if (groups.powder) this.addSection(geometry.powder, groups.powder, looks.powder);
    if (groups.bullet) {
      this.object.add(seatedBullet(bulletMeshes(context, geometry, groups.bullet)));
    }
    this.object.add(this.whole, this.section);
    markDynamic(this.object);
  }

  show(representation: Representation): void {
    this.object.visible = representation !== 'hidden';
    this.whole.visible = representation === 'whole';
    this.section.visible = representation === 'section';
  }

  private addSplit(piece: SplitPiece, group: EmphasisGroup, look: Look): void {
    this.whole.add(partMesh(this.context, piece.whole, group, look.surface));
    this.addSection(piece, group, look);
  }

  private addSection(piece: SplitPiece, group: EmphasisGroup, look: Look): void {
    this.section.add(partMesh(this.context, piece.half, group, look.surface));
    if (piece.face) this.section.add(partMesh(this.context, piece.face, group, look.cut));
  }
}

export class BulletPart {
  readonly object = new Group();
  private readonly spinner = new Group();

  constructor(context: PartContext, geometry: RoundGeometry) {
    this.spinner.add(bulletMeshes(context, geometry, 'bullet'));
    this.object.add(this.spinner);
    markDynamic(this.object);
  }

  set(shot: ShotReading): void {
    this.object.visible = shot.stage !== 'gone';
    this.object.position.x = BULLET_SEAT_X + shot.travel;
    this.spinner.rotation.x = shot.turns * FULL_TURN;
  }
}

export class RoundsPart {
  readonly object = new Group();
  readonly fired = new Group();
  readonly bullet: BulletPart;
  readonly next: RoundView;
  private readonly live: RoundView;
  private readonly spent: RoundView;

  constructor(context: PartContext, geometry: RoundGeometry) {
    this.live = new RoundView(context, geometry, {
      case: 'cartridgeCase',
      primer: 'primer',
      powder: 'powder',
    });
    this.spent = new RoundView(context, geometry, { case: 'spentCase', primer: 'spentCase' });
    this.next = new RoundView(context, geometry, {
      case: 'cartridgeCase',
      primer: 'primer',
      powder: 'powder',
      bullet: 'bullet',
    });
    this.bullet = new BulletPart(context, geometry);
    this.fired.add(this.live.object, this.spent.object);
    this.object.add(this.fired, this.next.object, this.bullet.object);
    markDynamic(this.object);
  }

  setState(state: AssemblyState): void {
    this.placeFired(state);
    this.bullet.set(state.shot);
    const pose = feedPose(state.motion.feed, state.motion.carrier);
    place(this.next.object, pose.base, pose.tilt);
    this.next.show(pose.chambered && state.view.cutaway ? 'section' : 'whole');
  }

  private placeFired({ motion, shot, view }: AssemblyState): void {
    const flight = motion.caseFlight;
    const flying = flight > 0;
    if (flying) {
      const pose = casePose(flight);
      this.fired.position.set(...pose.base);
      this.fired.rotation.set(0, pose.yaw, pose.roll);
    } else {
      this.fired.position.set(-boltTravel(motion.carrier), 0, 0);
      this.fired.rotation.set(0, 0, 0);
    }
    const shown: Representation =
      flight >= 1 ? 'hidden' : flying || !view.cutaway ? 'whole' : 'section';
    const live = shot.stage === 'seated';
    this.live.show(live ? shown : 'hidden');
    this.spent.show(live ? 'hidden' : shown);
  }
}

function addStackRound(
  context: PartContext,
  parent: Group,
  geometry: RoundGeometry,
  pose: RoundPose,
): void {
  const { looks } = context;
  const round = new Group();
  const bullet = new Group();
  bullet.add(partMesh(context, geometry.bullet, 'magazine', looks.copper.surface));
  round.add(
    partMesh(context, geometry.case.whole, 'magazine', looks.case.surface),
    partMesh(context, geometry.primer.whole, 'magazine', looks.primer.surface),
    seatedBullet(bullet),
  );
  place(round, pose.base, pose.tilt);
  parent.add(context.cutaway.opened(round));
}

function addFollower(context: PartContext, parent: Group, count: number): void {
  const arc = stackArc(count - 1) + CARTRIDGE.rimRadius + FOLLOWER.gap;
  const angle = arc / MAGAZINE_ARC.radius;
  const depth = MAGAZINE_ARC.rear - MAGAZINE_ARC.front - 2 * SHEET - FOLLOWER.clearance;
  const halfWidth = MAGAZINE_SHAPE.halfWidth - SHEET - FOLLOWER.clearance;
  const follower = new Group();
  follower.add(
    partMesh(
      context,
      boxGeometry({
        x: [FOLLOWER.clearance, depth],
        y: [-FOLLOWER.thickness / 2, FOLLOWER.thickness / 2],
        z: [-halfWidth, halfWidth],
      }),
      'magazine',
      context.looks.blued.surface,
    ),
  );
  const [x, y] = magazinePoint(MAGAZINE_ARC.rear - SHEET, angle);
  place(follower, [x, y, 0], angle);
  parent.add(context.cutaway.opened(follower));
}

export function addMagazineStack(
  context: PartContext,
  parent: Group,
  geometry: RoundGeometry,
): void {
  const count = stackCount();
  for (let index = 1; index < count; index += 1) {
    addStackRound(context, parent, geometry, stackPose(index));
  }
  addFollower(context, parent, count);
}
