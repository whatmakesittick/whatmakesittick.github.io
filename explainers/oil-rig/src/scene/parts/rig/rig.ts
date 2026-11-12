import { Group } from 'three';
import type { Object3D } from 'three';
import type { Steps } from '@core/scene/pacing';
import { anchorAt } from '@core/scene/parts';
import { HULL } from '../../constants';
import type { PartContext } from '../context';
import { createAccommodation } from './accommodation';
import { createCranes } from './cranes';
import { createDeck } from './deck';
import { createDerrick } from './derrick';
import { createDrillFloor } from './drillFloor';
import { FlamePart } from './flame';
import { createFlareBoom } from './flareBoom';
import type { FlareBoomPart } from './flareBoom';
import { createHull } from './hull';
import { createLifeboats } from './lifeboats';
import { createMooring } from './mooring';
import { createThrusters } from './thrusters';
import { TopDrivePart } from './topDrive';

export type RigAnchorId =
  | 'derrick'
  | 'drillFloor'
  | 'helideck'
  | 'crane'
  | 'flareBoom'
  | 'column'
  | 'pontoon'
  | 'thruster'
  | 'mooring'
  | 'moonpool';

const MOONPOOL_LIP = 4;

type Unit<F extends (context: PartContext) => unknown> = ReturnType<F>;

interface RigUnits {
  hull: Unit<typeof createHull>;
  thrusters: Unit<typeof createThrusters>;
  derrick: Unit<typeof createDerrick>;
  drillFloor: Unit<typeof createDrillFloor>;
  accommodation: Unit<typeof createAccommodation>;
  cranes: Unit<typeof createCranes>;
  mooring: Unit<typeof createMooring>;
  flareBoom: FlareBoomPart;
  topDrive: TopDrivePart;
  flame: FlamePart;
  deck: Unit<typeof createDeck>;
  lifeboats: Unit<typeof createLifeboats>;
}

export class RigPart {
  readonly object = new Group();
  readonly topDrive: TopDrivePart;
  readonly flame: FlamePart;
  readonly flareBoom: FlareBoomPart;
  readonly anchors: Record<RigAnchorId, Object3D>;

  constructor(units: RigUnits) {
    const { hull, thrusters, derrick, drillFloor, accommodation, cranes, mooring } = units;
    this.flareBoom = units.flareBoom;
    this.topDrive = units.topDrive;
    this.flame = units.flame;
    this.object.add(
      hull.object,
      thrusters.object,
      units.deck,
      drillFloor.object,
      derrick.object,
      this.topDrive.object,
      accommodation.object,
      units.lifeboats,
      cranes.object,
      this.flareBoom.object,
      this.flame.object,
      mooring.object,
    );
    this.anchors = {
      derrick: derrick.anchor,
      drillFloor: drillFloor.anchor,
      helideck: accommodation.helideckAnchor,
      crane: cranes.anchor,
      flareBoom: this.flareBoom.anchor,
      column: hull.anchors.column,
      pontoon: hull.anchors.pontoon,
      thruster: thrusters.anchor,
      mooring: mooring.anchor,
      moonpool: anchorAt(
        this.object,
        -HULL.deck.moonpoolX / 2,
        HULL.deck.underside - MOONPOOL_LIP,
        HULL.deck.moonpoolZ / 2,
      ),
    };
  }
}

export function* buildRig(context: PartContext): Steps<RigPart> {
  const hull = createHull(context);
  yield;
  const thrusters = createThrusters(context);
  const derrick = createDerrick(context);
  const drillFloor = createDrillFloor(context);
  const accommodation = createAccommodation(context);
  const cranes = createCranes(context);
  yield;
  const mooring = createMooring(context);
  yield;
  const flareBoom = createFlareBoom(context);
  const topDrive = new TopDrivePart(context);
  const flame = new FlamePart(context, flareBoom.tip, flareBoom.direction);
  const deck = createDeck(context);
  const lifeboats = createLifeboats(context);
  return new RigPart({
    hull,
    thrusters,
    derrick,
    drillFloor,
    accommodation,
    cranes,
    mooring,
    flareBoom,
    topDrive,
    flame,
    deck,
    lifeboats,
  });
}
