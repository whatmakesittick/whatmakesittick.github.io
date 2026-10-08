import type { BufferGeometry, Group, Mesh, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { PartId, Point, SpacingD } from '../../ids';
import {
  COLUMN_COUNT,
  HERO_SITE,
  HUB_HEIGHT_M,
  SHEAR_EXPONENT,
  SHEAR_HEIGHTS_M,
  TIP_HEIGHT_M,
  collectorRoutes,
  farmLayout,
  shearProfileAt,
  terrainHeight,
  windArrowsX,
} from '../../model';
import type { GroundPoint } from '../../model';
import { arrowAlongX, boxBetween, groundPath, merged, namedGroup, partMesh, ribbon } from './build';
import type { Labels, PlaceholderContext } from './build';

const ROAD_LIFT_M = 2;
const ROAD_WIDTH_M = 8;
const ROAD_THICKNESS_M = 0.5;
const CABLE_LIFT_M = 3;
const CABLE_WIDTH_M = 3;
const MARKER_LIFT_M = 4;
const MARKER_WIDTH_M = 5;
const WIND_ARROW_COUNT = 9;
const WIND_ARROW_LENGTH_M = 300;
const WIND_ARROW_WIDTH_M = 6;
const SHEAR_ARROW_LENGTH_M = 160;
const SHEAR_ARROW_WIDTH_M = 3;
const SHEAR_POLE_WIDTH_M = 3;
const PREVAILING_OFFSET_M = 900;
const PREVAILING_HEIGHT_M = 400;
const PREVAILING_LENGTH_M = 700;
const PREVAILING_WIDTH_M = 20;

export type OverlayPart = Extract<
  PartId,
  | 'accessRoads'
  | 'collectorCables'
  | 'spacingMarker'
  | 'windArrows'
  | 'shearProfile'
  | 'prevailingWind'
>;

interface OverlayShape {
  geometry: BufferGeometry;
  label: Point;
}

const lastLeg = (route: readonly GroundPoint[]): GroundPoint => {
  const [fromX, fromZ] = route[route.length - 2];
  const [toX, toZ] = route[route.length - 1];
  return [(fromX + toX) / 2, (fromZ + toZ) / 2];
};

const onGround = ([x, z]: GroundPoint, lift: number): Point => [x, terrainHeight(x, z) + lift, z];

function routesShape(
  spacing: SpacingD,
  lift: number,
  width: number,
  thickness: number,
): OverlayShape {
  const routes = collectorRoutes(spacing);
  const geometry = merged(routes.map((route) => ribbon(groundPath(route, lift), width, thickness)));
  return { geometry, label: onGround(lastLeg(routes[1]), lift) };
}

function markerShape(spacing: SpacingD): OverlayShape {
  const sites = farmLayout(spacing);
  const hero = sites[HERO_SITE];
  const next = sites[HERO_SITE + COLUMN_COUNT];
  const path = groundPath(
    [
      [hero.x, hero.z],
      [next.x, hero.z],
    ],
    MARKER_LIFT_M,
  );
  return {
    geometry: ribbon(path, MARKER_WIDTH_M),
    label: onGround([(hero.x + next.x) / 2, hero.z], MARKER_LIFT_M),
  };
}

function windArrowsShape(spacing: SpacingD): OverlayShape {
  const x = windArrowsX(spacing);
  const zs = farmLayout(spacing).map((site) => site.z);
  const minZ = Math.min(...zs);
  const step = (Math.max(...zs) - minZ) / (WIND_ARROW_COUNT - 1);
  const arrows = Array.from({ length: WIND_ARROW_COUNT }, (_, index) => {
    const z = minZ + index * step;
    return arrowAlongX(WIND_ARROW_LENGTH_M, WIND_ARROW_WIDTH_M, onGround([x, z], HUB_HEIGHT_M));
  });
  const middleZ = minZ + step * Math.floor(WIND_ARROW_COUNT / 2);
  return { geometry: merged(arrows), label: onGround([x, middleZ], HUB_HEIGHT_M) };
}

function shearShape(spacing: SpacingD): OverlayShape {
  const [x, z] = shearProfileAt(spacing);
  const ground = terrainHeight(x, z);
  const half = SHEAR_POLE_WIDTH_M / 2;
  const pole = boxBetween(
    [x - half, ground, z - half],
    [x + half, ground + TIP_HEIGHT_M, z + half],
  );
  const arrows = SHEAR_HEIGHTS_M.map((height) => {
    const length = SHEAR_ARROW_LENGTH_M * (height / HUB_HEIGHT_M) ** SHEAR_EXPONENT;
    return arrowAlongX(length, SHEAR_ARROW_WIDTH_M, [x, ground + height, z]);
  });
  return { geometry: merged([pole, ...arrows]), label: [x, ground + TIP_HEIGHT_M, z] };
}

function prevailingShape(spacing: SpacingD): OverlayShape {
  const x = windArrowsX(spacing) - PREVAILING_OFFSET_M;
  const origin = onGround([x, 0], PREVAILING_HEIGHT_M);
  const geometry = arrowAlongX(PREVAILING_LENGTH_M, PREVAILING_WIDTH_M, origin);
  return { geometry, label: [x + PREVAILING_LENGTH_M / 2, origin[1], 0] };
}

const SHAPES: Readonly<Record<OverlayPart, (spacing: SpacingD) => OverlayShape>> = {
  accessRoads: (spacing) => routesShape(spacing, ROAD_LIFT_M, ROAD_WIDTH_M, ROAD_THICKNESS_M),
  collectorCables: (spacing) => routesShape(spacing, CABLE_LIFT_M, CABLE_WIDTH_M, CABLE_WIDTH_M),
  spacingMarker: markerShape,
  windArrows: windArrowsShape,
  shearProfile: shearShape,
  prevailingWind: prevailingShape,
};

const OVERLAY_PARTS = Object.keys(SHAPES) as OverlayPart[];

interface Overlay {
  group: Group;
  anchor: Object3D;
  mesh?: Mesh;
}

export class FarmOverlays {
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly overlays: Record<OverlayPart, Overlay>;
  private spacing?: SpacingD;

  constructor(context: PlaceholderContext, parent: Group, labels: Labels) {
    this.materials = context.materials;
    context.tracker.track(this.tracker);
    this.overlays = Object.fromEntries(
      OVERLAY_PARTS.map((part) => {
        const group = namedGroup(part, parent);
        const anchor = anchorAt(group, 0, 0, 0);
        labels.set(part, anchor);
        return [part, { group, anchor }];
      }),
    ) as Record<OverlayPart, Overlay>;
  }

  group(part: OverlayPart): Group {
    return this.overlays[part].group;
  }

  layOut(spacing: SpacingD): void {
    if (spacing === this.spacing) return;
    this.spacing = spacing;
    this.tracker.dispose();
    const context = { materials: this.materials, tracker: this.tracker };
    OVERLAY_PARTS.forEach((part) => {
      const overlay = this.overlays[part];
      const shape = SHAPES[part](spacing);
      overlay.mesh?.removeFromParent();
      overlay.mesh = partMesh(context, part, shape.geometry, overlay.group);
      overlay.anchor.position.set(...shape.label);
    });
  }
}
