import { Group } from 'three';
import type { Object3D } from 'three';
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

export class RigPart {
  readonly object = new Group();
  readonly topDrive: TopDrivePart;
  readonly flame: FlamePart;
  readonly flareBoom: FlareBoomPart;
  readonly anchors: Record<RigAnchorId, Object3D>;

  constructor(context: PartContext) {
    const hull = createHull(context);
    const thrusters = createThrusters(context);
    const derrick = createDerrick(context);
    const drillFloor = createDrillFloor(context);
    const accommodation = createAccommodation(context);
    const cranes = createCranes(context);
    const mooring = createMooring(context);
    this.flareBoom = createFlareBoom(context);
    this.topDrive = new TopDrivePart(context);
    this.flame = new FlamePart(context, this.flareBoom.tip, this.flareBoom.direction);
    this.object.add(
      hull.object,
      thrusters.object,
      createDeck(context),
      drillFloor.object,
      derrick.object,
      this.topDrive.object,
      accommodation.object,
      createLifeboats(context),
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
