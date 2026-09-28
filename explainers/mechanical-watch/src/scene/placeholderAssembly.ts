import { BoxGeometry, CylinderGeometry, Group, Mesh, TorusGeometry } from 'three';
import type { Box3, BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { regionFromSpec } from '@core/scene/regions';
import type { RegionSpec } from '@core/scene/regions';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId, WheelId } from '../ids';
import { WHEEL_IDS } from '../ids';
import { balanceAngle, forkAngle, motionWorksAngles, wheelAngles } from '../model/kinematics';
import { BALANCE, BALANCE_CENTRE, LEVER, PALLET_STAFF, WHEEL_CENTRES } from '../model/layout';
import type { Point } from '../model/layout';
import {
  CASE_HEIGHT_MM,
  CASE_INNER_RADIUS_MM,
  CASE_OUTER_RADIUS_MM,
  CROWN_RADIUS_MM,
  CROWN_SPAN_X_MM,
  DIAL_RADIUS_MM,
  LEVELS,
  MOVEMENT_RADIUS_MM,
  STEM_AXIS_Z_MM,
  levelHeight,
  levelMiddle,
  mm,
} from '../model/scale';
import type { LevelId, Span } from '../model/scale';
import { wheelSpec } from '../model/train';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';

const FINISH = {
  brass: { color: THEME.brass, metalness: 0.7, roughness: 0.35 },
  steel: { color: THEME.steel, metalness: 0.8, roughness: 0.3 },
  dial: { color: THEME.dialFace, metalness: 0.05, roughness: 0.8 },
  hand: { color: THEME.bluedSteel, metalness: 0.6, roughness: 0.4 },
} as const satisfies Record<string, MaterialFinish>;

const WHEEL_LEVEL: Readonly<Record<WheelId, LevelId>> = {
  barrel: 'barrelDrum',
  centreWheel: 'centreWheel',
  thirdWheel: 'thirdWheel',
  fourthWheel: 'fourthWheel',
  escapeWheel: 'escapeWheel',
};

const HAND = { width: 0.4, hourLength: 6, minuteLength: 9.5, secondLength: 2.6 } as const;
const FORK = { width: 0.5 } as const;
const RADIAL_SEGMENTS = 48;
const TUBE_SEGMENTS = 12;

function span(level: LevelId): Span {
  return LEVELS[level];
}

function box(x: Span, y: Span, z: Span): RegionSpec {
  return {
    x: [mm(x[0]), mm(x[1])],
    y: [mm(y[0]), mm(y[1])],
    z: [mm(z[0]), mm(z[1])],
  };
}

function around(centre: Point, radius: number, z: Span): RegionSpec {
  return box([centre.x - radius, centre.x + radius], [centre.y - radius, centre.y + radius], z);
}

function trainRegion(): RegionSpec {
  const wheels = WHEEL_IDS.filter((id) => id !== 'barrel');
  const xs = wheels.flatMap((id) => [
    WHEEL_CENTRES[id].x - wheelSpec(id).radiusMm,
    WHEEL_CENTRES[id].x + wheelSpec(id).radiusMm,
  ]);
  const ys = wheels.flatMap((id) => [
    WHEEL_CENTRES[id].y - wheelSpec(id).radiusMm,
    WHEEL_CENTRES[id].y + wheelSpec(id).radiusMm,
  ]);
  return box(
    [Math.min(...xs), Math.max(...xs)],
    [Math.min(...ys), Math.max(...ys)],
    [span('centrePinion')[0], span('fourthPinion')[1]],
  );
}

function regionSpecs(): Readonly<Record<RegionId, RegionSpec>> {
  const escape = WHEEL_CENTRES.escapeWheel;
  const escapeRadius = wheelSpec('escapeWheel').radiusMm;
  const barrel = WHEEL_CENTRES.barrel;
  return {
    scene: box(
      [-CASE_OUTER_RADIUS_MM, CROWN_SPAN_X_MM[1]],
      [-CASE_OUTER_RADIUS_MM, CASE_OUTER_RADIUS_MM],
      CASE_HEIGHT_MM,
    ),
    movement: box(
      [-MOVEMENT_RADIUS_MM, MOVEMENT_RADIUS_MM],
      [-MOVEMENT_RADIUS_MM, MOVEMENT_RADIUS_MM],
      [span('mainplate')[0], span('balanceCock')[1]],
    ),
    barrel: box(
      [barrel.x - wheelSpec('barrel').radiusMm, CROWN_SPAN_X_MM[1]],
      [-CROWN_RADIUS_MM, barrel.y + wheelSpec('barrel').radiusMm],
      [span('barrelDrum')[0], span('ratchetWheel')[1]],
    ),
    train: trainRegion(),
    escapement: box(
      [
        Math.min(escape.x - escapeRadius, BALANCE_CENTRE.x - BALANCE.rollerRadiusMm),
        Math.max(escape.x + escapeRadius, BALANCE_CENTRE.x + BALANCE.rollerRadiusMm),
      ],
      [
        Math.min(escape.y - escapeRadius, BALANCE_CENTRE.y - BALANCE.rollerRadiusMm),
        Math.max(escape.y + escapeRadius, BALANCE_CENTRE.y + BALANCE.rollerRadiusMm),
      ],
      [span('palletBody')[0], span('roller')[1]],
    ),
    balance: around(BALANCE_CENTRE, BALANCE.radiusMm + 0.2, [
      span('balanceWheel')[0],
      span('balanceCock')[1],
    ]),
    dial: box(
      [-DIAL_RADIUS_MM, DIAL_RADIUS_MM],
      [-DIAL_RADIUS_MM, DIAL_RADIUS_MM],
      [span('secondHand')[0], span('dial')[1]],
    ),
    motionWorks: around({ x: 0, y: 0 }, 3, [span('hourWheel')[0], span('cannonPinionTube')[1]]),
  };
}

export class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly anchors = new Map<AnchorId, Object3D>();
  private readonly labels = new Map<PartId, Object3D>();
  private readonly wheels = new Map<WheelId, Group>();
  private readonly regions = regionSpecs();
  private readonly balance = new Group();
  private readonly fork = new Group();
  private readonly hourHand = new Group();
  private readonly minuteHand = new Group();
  private readonly secondHand = new Group();
  private readonly dialSide = new Group();
  private readonly resources: AssemblyResources;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    this.build();
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const angles = wheelAngles(state.phase, state.cycles, state.amplitude);
    for (const [id, group] of this.wheels) group.rotation.z = toRadians(angles[id]);
    const theta = balanceAngle(state.phase, state.amplitude);
    this.balance.rotation.z = toRadians(theta);
    this.fork.rotation.z = toRadians(forkAngle(theta));
    const hands = motionWorksAngles(state.phase, state.cycles);
    this.hourHand.rotation.z = toRadians(hands.hour);
    this.minuteHand.rotation.z = toRadians(hands.minute);
    this.secondHand.rotation.z = toRadians(hands.second);
    this.dialSide.visible = state.view.dial;
  }

  update(): void {}

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    const anchor = this.anchors.get(id);
    if (!anchor) throw new Error(`No anchor ${id}`);
    return anchor;
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    return regionFromSpec(this.regions[id]).applyMatrix4(this.root.matrixWorld);
  }

  dispose(): void {
    this.tracker.dispose();
    this.resources.materials.clearRegistered();
  }

  private mesh(geometry: BufferGeometry, group: PartId, finish: MaterialFinish): Mesh {
    return new Mesh(this.tracker.track(geometry), this.resources.materials.get(group, finish));
  }

  private disc(radiusMm: number, level: LevelId, group: PartId, finish: MaterialFinish): Mesh {
    const geometry = new CylinderGeometry(
      mm(radiusMm),
      mm(radiusMm),
      mm(levelHeight(level)),
      RADIAL_SEGMENTS,
    );
    const mesh = this.mesh(geometry, group, finish);
    mesh.rotation.x = Math.PI / 2;
    return mesh;
  }

  private bar(
    lengthMm: number,
    widthMm: number,
    level: LevelId,
    group: PartId,
    finish: MaterialFinish,
  ): Mesh {
    const geometry = new BoxGeometry(mm(widthMm), mm(lengthMm), mm(levelHeight(level)));
    const mesh = this.mesh(geometry, group, finish);
    mesh.position.y = mm(lengthMm / 2);
    return mesh;
  }

  private place(group: Group, centre: Point, level: LevelId): Group {
    group.position.set(mm(centre.x), mm(centre.y), mm(levelMiddle(level)));
    this.root.add(group);
    return group;
  }

  private build(): void {
    this.buildCase();
    this.buildTrain();
    this.buildEscapement();
    this.buildDialSide();
  }

  private buildCase(): void {
    const ring = this.mesh(
      new TorusGeometry(
        mm((CASE_INNER_RADIUS_MM + CASE_OUTER_RADIUS_MM) / 2),
        mm((CASE_OUTER_RADIUS_MM - CASE_INNER_RADIUS_MM) / 2),
        TUBE_SEGMENTS,
        RADIAL_SEGMENTS * 2,
      ),
      'case',
      FINISH.steel,
    );
    ring.position.z = mm((CASE_HEIGHT_MM[0] + CASE_HEIGHT_MM[1]) / 2);
    this.dialSide.add(ring);
    const plate = this.disc(MOVEMENT_RADIUS_MM, 'mainplate', 'mainplate', FINISH.brass);
    plate.position.z = mm(levelMiddle('mainplate'));
    this.root.add(plate);
    const crown = this.mesh(
      new CylinderGeometry(
        mm(CROWN_RADIUS_MM),
        mm(CROWN_RADIUS_MM),
        mm(CROWN_SPAN_X_MM[1] - CROWN_SPAN_X_MM[0]),
        TUBE_SEGMENTS,
      ),
      'crown',
      FINISH.steel,
    );
    crown.rotation.z = Math.PI / 2;
    crown.position.set(mm((CROWN_SPAN_X_MM[0] + CROWN_SPAN_X_MM[1]) / 2), 0, mm(STEM_AXIS_Z_MM));
    this.dialSide.add(crown);
    this.root.add(this.dialSide);
    this.anchors.set('crown', anchorAt(this.root, mm(CROWN_SPAN_X_MM[1]), 0, mm(STEM_AXIS_Z_MM)));
    this.labels.set('crown', this.anchor('crown'));
    this.labels.set('mainplate', anchorAt(this.root, 0, mm(-MOVEMENT_RADIUS_MM + 1), mm(0.2)));
  }

  private buildTrain(): void {
    for (const id of WHEEL_IDS) {
      const spec = wheelSpec(id);
      const level = WHEEL_LEVEL[id];
      const group = this.place(new Group(), WHEEL_CENTRES[id], level);
      group.add(this.disc(spec.radiusMm, level, id, FINISH.brass));
      group.add(this.bar(spec.radiusMm, 0.3, level, id, FINISH.steel));
      this.wheels.set(id, group);
      const top = anchorAt(
        this.root,
        mm(WHEEL_CENTRES[id].x),
        mm(WHEEL_CENTRES[id].y),
        mm(LEVELS[level][1] + 0.3),
      );
      this.anchors.set(id, top);
      this.labels.set(id, top);
    }
  }

  private buildEscapement(): void {
    this.place(this.fork, PALLET_STAFF, 'palletBody');
    const arm = this.bar(LEVER.forkLengthMm, FORK.width, 'palletBody', 'palletFork', FINISH.steel);
    arm.rotation.z = toRadians(150 - 90);
    arm.position.set(0, 0, 0);
    this.fork.add(arm);
    const forkTop = anchorAt(
      this.root,
      mm(PALLET_STAFF.x),
      mm(PALLET_STAFF.y),
      mm(span('palletHorns')[1] + 0.3),
    );
    this.anchors.set('fork', forkTop);
    this.labels.set('palletFork', forkTop);
    this.place(this.balance, BALANCE_CENTRE, 'balanceWheel');
    const rim = this.mesh(
      new TorusGeometry(
        mm(BALANCE.radiusMm - BALANCE.rimWidthMm / 2),
        mm(BALANCE.rimWidthMm / 2),
        TUBE_SEGMENTS,
        RADIAL_SEGMENTS,
      ),
      'balanceWheel',
      FINISH.brass,
    );
    this.balance.add(rim);
    this.balance.add(this.bar(BALANCE.radiusMm, 0.5, 'balanceWheel', 'balanceWheel', FINISH.brass));
    const balanceTop = anchorAt(
      this.root,
      mm(BALANCE_CENTRE.x),
      mm(BALANCE_CENTRE.y),
      mm(span('balanceCock')[1] + 0.3),
    );
    this.anchors.set('balance', balanceTop);
    this.labels.set('balanceWheel', balanceTop);
  }

  private buildDialSide(): void {
    const dial = this.disc(DIAL_RADIUS_MM, 'dial', 'dial', FINISH.dial);
    dial.position.z = mm(levelMiddle('dial'));
    this.dialSide.add(dial);
    this.place(this.hourHand, { x: 0, y: 0 }, 'hourHand').add(
      this.bar(HAND.hourLength, HAND.width, 'hourHand', 'hourHand', FINISH.hand),
    );
    this.place(this.minuteHand, { x: 0, y: 0 }, 'minuteHand').add(
      this.bar(HAND.minuteLength, HAND.width, 'minuteHand', 'minuteHand', FINISH.hand),
    );
    this.place(this.secondHand, WHEEL_CENTRES.fourthWheel, 'secondHand').add(
      this.bar(HAND.secondLength, HAND.width / 2, 'secondHand', 'secondHand', FINISH.hand),
    );
    for (const hand of [this.hourHand, this.minuteHand, this.secondHand]) {
      hand.removeFromParent();
      this.dialSide.add(hand);
    }
    this.labels.set(
      'dial',
      anchorAt(this.root, 0, mm(DIAL_RADIUS_MM - 2), mm(span('dial')[0] - 0.3)),
    );
  }
}
