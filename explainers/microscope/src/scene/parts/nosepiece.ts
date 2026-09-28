import { Group } from 'three';
import type { Object3D } from 'three';
import { wrapAngle } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { OBJECTIVE_IDS, SHOULDER } from '../../model';
import type { ObjectiveId } from '../../model';
import { QUARTER_TURN } from '../../turns';
import { NOSEPIECE, SEGMENTS } from '../constants';
import { FINISHES } from '../finishes';
import { cutSection } from '../geometry/lathe';
import type { Section } from '../geometry/lathe';
import { cutShell } from './context';
import type { CutShell, PartContext } from './context';
import { createObjective, objectiveLabelPoint } from './objective';

const SETTLED_RADIANS = 1e-4;
const BEARING = { radius: 14, height: 9 } as const;

function plateSection(): Section {
  const { plateRadius, plateThickness } = NOSEPIECE;
  const top = plateThickness + BEARING.height;
  return [
    [0, 0],
    [plateRadius, 0],
    [plateRadius, plateThickness],
    [BEARING.radius, plateThickness],
    [BEARING.radius, top],
    [0, top],
  ];
}

function turretPivot(): readonly [number, number, number] {
  const { tilt, mountRadius } = NOSEPIECE;
  return [0, SHOULDER + mountRadius * Math.sin(tilt), -mountRadius * Math.cos(tilt)];
}

function holder(mounted: Object3D, index: number): Group {
  mounted.position.set(0, 0, NOSEPIECE.mountRadius);
  mounted.rotation.x = -NOSEPIECE.tilt;
  const group = new Group();
  group.rotation.y = index * QUARTER_TURN;
  group.add(mounted);
  return group;
}

function turnFor(objective: ObjectiveId): number {
  return -OBJECTIVE_IDS.indexOf(objective) * QUARTER_TURN;
}

export class Nosepiece {
  readonly object = new Group();
  readonly anchors: { nosepiece: Object3D; objective: Object3D };
  private readonly spinner = new Group();
  private readonly plate: CutShell;
  private readonly objectives: Map<ObjectiveId, CutShell>;
  private active: ObjectiveId = OBJECTIVE_IDS[0];
  private cutaway = false;
  private angle = 0;

  constructor(context: PartContext) {
    const turret = new Group();
    turret.position.set(...turretPivot());
    turret.rotation.x = NOSEPIECE.tilt;
    this.plate = cutShell(
      context,
      cutSection(plateSection(), SEGMENTS.round, { gap: NOSEPIECE.cutGap }),
      'nosepiece',
      FINISHES.chrome,
    );
    this.objectives = new Map(OBJECTIVE_IDS.map((id) => [id, createObjective(context, id)]));
    this.objectives.forEach((objective, id) =>
      this.spinner.add(holder(objective.object, OBJECTIVE_IDS.indexOf(id))),
    );
    turret.add(this.plate.object, this.spinner);
    this.object.add(turret);
    this.anchors = {
      nosepiece: anchorAt(turret, 0, NOSEPIECE.plateThickness / 2, -NOSEPIECE.plateRadius),
      objective: anchorAt(this.object, 0, SHOULDER, 0),
    };
  }

  setCutaway(cutaway: boolean): void {
    this.cutaway = cutaway;
    this.plate.setCut(cutaway);
    this.applyCut();
  }

  setObjective(objective: ObjectiveId): void {
    this.active = objective;
    const { height, reach } = objectiveLabelPoint(objective);
    this.anchors.objective.position.set(0, SHOULDER + height, reach);
    this.applyCut();
  }

  update(deltaSeconds: number): boolean {
    const step = wrapAngle(turnFor(this.active) - this.angle);
    const turning = Math.abs(step) >= SETTLED_RADIANS;
    const blend = 1 - Math.exp(-NOSEPIECE.turnRate * deltaSeconds);
    this.angle += turning ? step * blend : step;
    this.spinner.rotation.y = this.angle;
    return turning;
  }

  snap(): void {
    this.angle = turnFor(this.active);
    this.spinner.rotation.y = this.angle;
  }

  private applyCut(): void {
    this.objectives.forEach((objective, id) =>
      objective.setCut(this.cutaway && id === this.active),
    );
  }
}
