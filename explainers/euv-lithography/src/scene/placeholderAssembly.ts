import { BoxGeometry, Group, Mesh, MeshBasicMaterial, Object3D, SphereGeometry } from 'three';
import type { BufferGeometry } from 'three';
import { localRegions } from '@core/scene/regions';
import { ANCHOR_IDS, PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, ChaseTarget, PartId, Point } from '../ids';
import {
  ANCHOR_POINTS,
  BEAM_WAYPOINTS,
  DRIVE_LASER_ROOM,
  MASK_STAGE,
  PART_POINTS,
  PROJECTION_BOX,
  REGION_SPECS,
  VESSEL,
  WAFER_STAGE,
} from '../model/layout';
import type { Box } from '../model/scale';
import { MARKER_RADIUS_M, MIRROR_THICKNESS_M } from './constants';
import { THEME } from '../theme';
import { mirrorSizeM } from '../model/layout';
import type { Assembly } from './assembly';

const VESSEL_LENGTH = VESSEL.xRange[1] - VESSEL.xRange[0];
const VESSEL_BOX: Box = {
  centre: [(VESSEL.xRange[0] + VESSEL.xRange[1]) / 2, VESSEL.centreY, 0],
  size: [VESSEL_LENGTH, VESSEL.radius * 2, VESSEL.radius * 2],
};
const INSET_RADIUS_M = 0.5;

const resolveRegion = localRegions(REGION_SPECS);

function place(object: Object3D, point: Point): void {
  object.position.set(point[0], point[1], point[2]);
}

function addBox(root: Group, box: Box, color: string, geometries: BufferGeometry[]): void {
  const geometry = new BoxGeometry(...box.size);
  geometries.push(geometry);
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ color }));
  place(mesh, box.centre);
  root.add(mesh);
}

function addMirrors(root: Group, state: AssemblyState, geometries: BufferGeometry[]): void {
  BEAM_WAYPOINTS.filter((entry) => entry.bounce).forEach((entry) => {
    const size = mirrorSizeM(entry.id, state.optics);
    addBox(
      root,
      { centre: entry.point, size: [size, MIRROR_THICKNESS_M, size] },
      THEME.mirror,
      geometries,
    );
  });
}

function addSphere(root: Group, radius: number, color: string, geometries: BufferGeometry[]): Mesh {
  const geometry = new SphereGeometry(radius);
  geometries.push(geometry);
  const mesh = new Mesh(geometry, new MeshBasicMaterial({ color }));
  root.add(mesh);
  return mesh;
}

export function createPlaceholderAssembly(initial: AssemblyState): Assembly {
  const root = new Group();
  const geometries: BufferGeometry[] = [];
  addBox(root, DRIVE_LASER_ROOM, THEME.laser, geometries);
  addBox(root, VESSEL_BOX, THEME.shell, geometries);
  addBox(root, MASK_STAGE, THEME.machine, geometries);
  addBox(root, PROJECTION_BOX, THEME.shell, geometries);
  addBox(root, WAFER_STAGE, THEME.machine, geometries);
  addMirrors(root, initial, geometries);

  const marker = addSphere(root, MARKER_RADIUS_M, THEME.plasma, geometries);
  const dropletInset = addSphere(root, INSET_RADIUS_M, THEME.tin, geometries);
  const patternInset = addSphere(root, INSET_RADIUS_M, THEME.euv, geometries);
  place(dropletInset, ANCHOR_POINTS.dropletInset);
  place(patternInset, ANCHOR_POINTS.patternInset);

  const anchors = new Map<AnchorId, Object3D>(
    ANCHOR_IDS.map((id) => {
      const object = new Object3D();
      place(object, ANCHOR_POINTS[id]);
      root.add(object);
      return [id, object];
    }),
  );
  const labels = new Map<PartId, Object3D>(
    PART_IDS.map((id) => {
      const object = new Object3D();
      place(object, PART_POINTS[id]);
      root.add(object);
      return [id, object];
    }),
  );
  let target: ChaseTarget = { position: initial.flash.position, span: initial.flash.span };

  function setState(state: AssemblyState): void {
    place(marker, state.flash.position);
    place(anchors.get('flash') as Object3D, state.flash.position);
    place(labels.get('flash') as Object3D, state.flash.position);
    dropletInset.visible = state.view.inset && state.inset === 'droplet';
    patternInset.visible = state.view.inset && state.inset === 'pattern';
    target = { position: state.flash.position, span: state.flash.span };
  }

  function dispose(): void {
    geometries.forEach((geometry) => geometry.dispose());
    root.traverse((object) => {
      if (object instanceof Mesh) object.material.dispose();
    });
  }

  setState(initial);
  return {
    root,
    setState,
    update: () => false,
    labelAnchors: () => labels,
    anchor: (id) => anchors.get(id) as Object3D,
    region: (id) => resolveRegion(id),
    chaseTarget: () => target,
    dispose,
  };
}
