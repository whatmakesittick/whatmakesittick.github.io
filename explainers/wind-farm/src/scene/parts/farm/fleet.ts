import { Color, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Group, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { clamp } from '@core/math';
import type { FarmSite } from '../../../ids';
import {
  COLUMN_COUNT,
  HERO_SITE,
  TIP_HEIGHT_M,
  TURBINE_COUNT,
  TURBINE_GEOMETRY,
  terrainHeight,
} from '../../../model';
import { namedGroup } from '../context';
import type { Motion, PartContext } from '../context';
import { rotorGeometry } from './blade';
import {
  BLADE_WIDEN,
  DEFICIT_SHADE,
  NACELLE_FINISH,
  TURBINE_FINISH,
  TURBINE_WIDEN,
} from './turbineConstants';
import { RotorDiscs } from './discs';
import { TurbineShadows } from './shadows';
import { nacelleGeometry, spinnerGeometry, towerGeometry } from './turbine';
import { Widening } from './widening';

const PART = 'farmTurbines';
const LABELLED_TURBINE = COLUMN_COUNT + HERO_SITE;
const X_AXIS = new Vector3(1, 0, 0);
const Y_AXIS = new Vector3(0, 1, 0);
const UNIT = new Vector3(1, 1, 1);
const HUB = new Vector3(...TURBINE_GEOMETRY.hub);

function named(mesh: InstancedMesh, piece: string, parent: Group): InstancedMesh {
  mesh.name = `${PART}.${piece}`;
  parent.add(mesh);
  return mesh;
}

export function sitePosition(site: FarmSite, target = new Vector3()): Vector3 {
  return target.set(site.x, terrainHeight(site.x, site.z), site.z);
}

const spinTurn = new Quaternion();
const hubFrame = new Matrix4();

export function rotorMatrix(base: Matrix4, azimuth: number, target = new Matrix4()): Matrix4 {
  spinTurn.setFromAxisAngle(X_AXIS, azimuth);
  return target.multiplyMatrices(base, hubFrame.compose(HUB, spinTurn, UNIT));
}

function widenedInstances(
  context: PartContext,
  geometry: BufferGeometry,
  widening: Widening,
): InstancedMesh {
  return context.tracker.track(
    new InstancedMesh(context.tracker.track(geometry), widening.material, TURBINE_COUNT),
  );
}

export class Fleet {
  readonly group: Group;
  private readonly towers: InstancedMesh;
  private readonly nacelles: InstancedMesh;
  private readonly hubs: InstancedMesh;
  private readonly rotors: InstancedMesh;
  private readonly discs: RotorDiscs;
  private readonly shadows: TurbineShadows;
  private readonly widenings: readonly Widening[];
  private readonly positions = Array.from({ length: TURBINE_COUNT }, () => new Vector3());
  private readonly base = new Matrix4();
  private readonly spin = new Matrix4();
  private readonly heading = new Quaternion();
  private readonly shade = new Color();
  private readonly plain = new Color(1, 1, 1);
  private readonly cool = new Color(DEFICIT_SHADE.colour);
  private readonly label: Object3D;
  private deficits?: readonly number[];

  constructor(context: PartContext) {
    this.group = namedGroup(PART);
    const tower = new Widening(context, PART, TURBINE_FINISH, TURBINE_WIDEN);
    const nacelle = new Widening(context, PART, NACELLE_FINISH, TURBINE_WIDEN);
    const hub = new Widening(context, PART, TURBINE_FINISH, TURBINE_WIDEN);
    const blades = new Widening(context, PART, TURBINE_FINISH, BLADE_WIDEN);
    this.widenings = [tower, nacelle, hub, blades];
    this.towers = named(widenedInstances(context, towerGeometry(), tower), 'tower', this.group);
    this.nacelles = named(
      widenedInstances(context, nacelleGeometry(), nacelle),
      'nacelle',
      this.group,
    );
    this.hubs = named(widenedInstances(context, spinnerGeometry(), hub), 'hub', this.group);
    this.rotors = named(widenedInstances(context, rotorGeometry(), blades), 'rotor', this.group);
    this.discs = new RotorDiscs(context);
    this.shadows = new TurbineShadows(context);
    this.group.add(this.discs.mesh, this.shadows.mesh);
    for (let index = 0; index < TURBINE_COUNT; index += 1)
      this.nacelles.setColorAt(index, this.plain);
    this.label = anchorAt(this.group, 0, 0, 0);
    context.labels.set(PART, this.label);
  }

  place(sites: readonly FarmSite[], yaw: number, azimuth: number): void {
    sites.forEach((site, index) => {
      sitePosition(site, this.positions[index]);
      this.towers.setMatrixAt(index, this.base.makeTranslation(this.positions[index]));
    });
    this.towers.instanceMatrix.needsUpdate = true;
    this.shadows.place(sites);
    const labelled = this.positions[LABELLED_TURBINE];
    this.label.position.set(labelled.x, labelled.y + TIP_HEIGHT_M, labelled.z);
    this.turn(yaw, azimuth);
    [this.towers, this.nacelles, this.hubs, this.rotors, this.discs.mesh].forEach((mesh) =>
      mesh.computeBoundingSphere(),
    );
  }

  animate(motion: Motion, yaw: number): void {
    this.turn(yaw, motion.azimuth);
    this.discs.spin(motion.rpm);
    this.widenings.forEach((widening) => widening.update(motion.cameraDistance));
  }

  turn(yaw: number, azimuth: number): void {
    this.heading.setFromAxisAngle(Y_AXIS, yaw);
    this.positions.forEach((position, index) => {
      this.base.compose(position, this.heading, UNIT);
      this.nacelles.setMatrixAt(index, this.base);
      this.hubs.setMatrixAt(index, this.base);
      this.rotors.setMatrixAt(index, rotorMatrix(this.base, azimuth, this.spin));
      this.discs.setMatrixAt(index, this.base);
    });
    [this.nacelles, this.hubs, this.rotors, this.discs.mesh].forEach((mesh) => {
      mesh.instanceMatrix.needsUpdate = true;
    });
  }

  shadeBy(deficits: readonly number[]): void {
    if (deficits === this.deficits) return;
    this.deficits = deficits;
    deficits.forEach((deficit, index) => {
      const share = clamp(deficit / DEFICIT_SHADE.full, 0, 1);
      this.nacelles.setColorAt(index, this.shade.copy(this.plain).lerp(this.cool, share));
    });
    if (this.nacelles.instanceColor) this.nacelles.instanceColor.needsUpdate = true;
  }
}
