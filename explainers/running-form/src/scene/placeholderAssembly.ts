import { BoxGeometry, Group, Mesh, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { Box3, Material, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { Steps } from '@core/scene/pacing';
import { ResourceTracker } from '@core/scene/resources';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, GroupId, PartId, RegionId } from '../ids';
import {
  CENTRE_LINE_DASH_M,
  CENTRE_LINE_Z_M,
  PATTERN_PERIODS_M,
  ROAD,
  WALL,
  WINDOW_AHEAD_M,
  WINDOW_BEHIND_M,
} from '../model/layout';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources, ChaseTarget } from './assembly';
import { regionBox } from './regions';
import { referencePose } from './runnerPose';
import type { RunnerPose } from './runnerPose';

const LIMB_M = 0.09;
const PELVIS_THICKNESS_M = 0.14;
const TRUNK_THICKNESS_M = 0.2;
const HEAD_RADIUS_M = 0.1;
const FOOT_THICKNESS_M = 0.07;
const WINDOW_M = WINDOW_BEHIND_M + WINDOW_AHEAD_M;
const WINDOW_CENTRE_X_M = (WINDOW_AHEAD_M - WINDOW_BEHIND_M) / 2;
const DASH_COUNT = Math.round(WINDOW_M / PATTERN_PERIODS_M.centreLine);
const DASH_WINDOW_M = DASH_COUNT * PATTERN_PERIODS_M.centreLine;
const ROAD_Y_M = -0.01;
const ROAD_THICKNESS_M = 0.02;
const SEA_WIDTH_M = 60;
const LABEL_Z_M = 0.06;
const ROAD_LABEL_AT = [0.6, 0, 0.7] as const;
const SPAN_AXIS = new Vector3(0, 1, 0);
const MIDDLE = 0.5;

const middle = (a: Vector3, b: Vector3): Vector3 => a.clone().lerp(b, MIDDLE);

class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly resources: AssemblyResources;
  private readonly spans = new Map<string, { mesh: Mesh; thickness: number }>();
  private readonly head: Mesh;
  private readonly dashes: Mesh[] = [];
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchorObjects: Record<AnchorId, Object3D>;
  private pose: RunnerPose;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.resources = resources;
    this.pose = referencePose(state.reading);
    this.addSpan('pelvis', 'pelvis', THEME.shorts, PELVIS_THICKNESS_M);
    this.addSpan('trunk', 'trunk', THEME.singlet, TRUNK_THICKNESS_M);
    (['right', 'left'] as const).forEach((side) => {
      const accent = side === 'right' ? THEME.rightAccent : THEME.leftAccent;
      this.addSpan(`thigh-${side}`, 'thigh', THEME.skin, LIMB_M);
      this.addSpan(`shin-${side}`, 'shin', THEME.skin, LIMB_M);
      this.addSpan(`foot-${side}`, 'shoe', accent, FOOT_THICKNESS_M);
      this.addSpan(`upper-${side}`, 'arm', THEME.skin, LIMB_M);
      this.addSpan(`forearm-${side}`, 'arm', THEME.skin, LIMB_M);
    });
    this.head = new Mesh(
      this.tracker.track(new SphereGeometry(HEAD_RADIUS_M, 12, 8)),
      this.material('head', THEME.skin),
    );
    this.root.add(this.head);
    this.buildRoad();
    this.labels = this.buildLabels();
    this.anchorObjects = this.buildAnchors();
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    this.pose = referencePose(state.reading);
    const { pose } = this;
    this.place('pelvis', pose.legs.left.hip, pose.legs.right.hip);
    this.place('trunk', pose.pelvis, pose.chest);
    this.head.position.copy(pose.headCentre);
    (['right', 'left'] as const).forEach((side) => {
      const leg = pose.legs[side];
      const arm = pose.arms[side];
      this.place(`thigh-${side}`, leg.hip, leg.knee);
      this.place(`shin-${side}`, leg.knee, leg.ankle);
      this.place(`foot-${side}`, leg.heel, leg.toe);
      this.place(`upper-${side}`, arm.shoulder, arm.elbow);
      this.place(`forearm-${side}`, arm.elbow, arm.wrist);
    });
    this.scrollRoad(state.scrollM);
    this.moveAnchors();
  }

  update(): boolean {
    return false;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.anchorObjects[id];
  }

  region(id: RegionId): Box3 {
    return regionBox(id);
  }

  chaseTarget(): ChaseTarget {
    const { x, y, z } = this.pose.pelvis;
    return { position: { x, y, z }, heading: 0 };
  }

  warmUp(compile: (object: Object3D) => void): void {
    compile(this.root);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.resources.materials.clearRegistered();
    this.tracker.dispose();
  }

  private material(group: GroupId, color: string): Material {
    return this.resources.materials.get(group, { color, roughness: 0.8 });
  }

  private box(
    x: number,
    y: number,
    z: number,
    group: GroupId,
    color: string,
    at: readonly [number, number, number],
  ): Mesh {
    const mesh = new Mesh(
      this.tracker.track(new BoxGeometry(x, y, z)),
      this.material(group, color),
    );
    mesh.position.set(...at);
    this.root.add(mesh);
    return mesh;
  }

  private addSpan(id: string, group: GroupId, color: string, thickness: number): void {
    const mesh = this.box(thickness, 1, thickness, group, color, [0, 0, 0]);
    this.spans.set(id, { mesh, thickness });
  }

  private place(id: string, from: Vector3, to: Vector3): void {
    const span = this.spans.get(id);
    if (!span) return;
    const direction = to.clone().sub(from);
    span.mesh.position.copy(middle(from, to));
    span.mesh.quaternion.copy(
      new Quaternion().setFromUnitVectors(SPAN_AXIS, direction.clone().normalize()),
    );
    span.mesh.scale.set(1, direction.length(), 1);
  }

  private buildRoad(): void {
    this.box(WINDOW_M, ROAD_THICKNESS_M, ROAD.zMaxM - ROAD.zMinM, 'backdrop', THEME.road, [
      WINDOW_CENTRE_X_M,
      ROAD_Y_M,
      (ROAD.zMaxM + ROAD.zMinM) / 2,
    ]);
    this.box(WINDOW_M, WALL.heightM, WALL.thicknessM, 'backdrop', THEME.wall, [
      WINDOW_CENTRE_X_M,
      WALL.heightM / 2,
      WALL.zM,
    ]);
    this.box(WINDOW_M, ROAD_THICKNESS_M, SEA_WIDTH_M, 'backdrop', THEME.sea, [
      WINDOW_CENTRE_X_M,
      ROAD_Y_M,
      WALL.zM - WALL.thicknessM - SEA_WIDTH_M / 2,
    ]);
    for (let i = 0; i < DASH_COUNT; i += 1) {
      this.dashes.push(
        this.box(CENTRE_LINE_DASH_M, ROAD_THICKNESS_M, 0.12, 'backdrop', THEME.roadLine, [
          0,
          0,
          CENTRE_LINE_Z_M,
        ]),
      );
    }
  }

  private scrollRoad(scrollM: number): void {
    const period = PATTERN_PERIODS_M.centreLine;
    this.dashes.forEach((dash, index) => {
      const offset = (((index * period - scrollM) % DASH_WINDOW_M) + DASH_WINDOW_M) % DASH_WINDOW_M;
      dash.position.x = -WINDOW_BEHIND_M + offset;
    });
  }

  private anchorPoints(): Record<PartId, Vector3> {
    const { pose } = this;
    const leg = pose.legs.right;
    const arm = pose.arms.right;
    const front = pose.trunkForward.clone().multiplyScalar(0.1);
    return {
      head: pose.headCentre,
      shoulder: arm.shoulder,
      arm: middle(arm.shoulder, arm.elbow),
      elbow: arm.elbow,
      trunk: middle(pose.pelvis, pose.chest).add(front),
      pelvis: pose.pelvis,
      hip: leg.hip,
      thigh: middle(leg.hip, leg.knee),
      knee: leg.knee,
      shin: middle(leg.knee, leg.ankle),
      achilles: leg.ankle.clone().add(new Vector3(-0.05, 0, 0)),
      arch: middle(leg.heel, leg.ball),
      heel: leg.heel,
      shoe: leg.toe,
      road: new Vector3(...ROAD_LABEL_AT),
    };
  }

  private buildLabels(): ReadonlyMap<PartId, Object3D> {
    return new Map(PART_IDS.map((id) => [id, anchorAt(this.root, 0, 0, 0)]));
  }

  private buildAnchors(): Record<AnchorId, Object3D> {
    const anchors = {
      runner: anchorAt(this.root, 0, 0, 0),
      pelvis: anchorAt(this.root, 0, 0, 0),
      rightFoot: anchorAt(this.root, 0, 0, 0),
      head: anchorAt(this.root, 0, 0, 0),
    };
    return anchors;
  }

  private moveAnchors(): void {
    const points = this.anchorPoints();
    this.labels.forEach((object, id) => {
      object.position.copy(points[id]);
      if (id !== 'road') object.position.z += LABEL_Z_M;
    });
    this.anchorObjects.runner.position.set(this.pose.pelvis.x, 0, 0);
    this.anchorObjects.pelvis.position.copy(this.pose.pelvis);
    this.anchorObjects.rightFoot.position.copy(this.pose.legs.right.ankle);
    this.anchorObjects.head.position.copy(this.pose.headCentre);
  }
}

export function* createPlaceholderAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Steps<Assembly> {
  yield;
  return new PlaceholderAssembly(resources, state);
}
