import {
  BufferAttribute,
  BufferGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  SphereGeometry,
} from 'three';
import type { Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { clamp } from '@core/math';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { HORIZON_RADIUS } from '../../model';
import { SEGMENTS, SHEET_LOOK } from '../constants';
import { buildSheetGrid, sheetPoint } from '../geometry/sheetGrid';
import { SHEET } from '../layout';
import { partMesh, registered } from './context';
import type { PartContext } from './context';

const XYZ = 3;

function azimuthOf(position: Vector3): number {
  return Math.atan2(position.z, position.x);
}

export class RubberSheetPart {
  readonly object = new Group();
  readonly marker: Mesh;
  private readonly rimMarker: Mesh;
  private glow = 0;
  private glowTarget = 0;

  constructor(context: PartContext) {
    const grid = buildSheetGrid();
    const geometry = context.tracker.track(new BufferGeometry());
    geometry.setAttribute('position', new BufferAttribute(grid.positions, XYZ));
    geometry.setAttribute('color', new BufferAttribute(grid.colors, XYZ));
    const material = registered(
      context,
      STRUCTURE_GROUP,
      new LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: SHEET_LOOK.gridOpacity,
        depthWrite: false,
      }),
    );
    this.marker = partMesh(
      context,
      new SphereGeometry(SHEET_LOOK.markerRadius, SEGMENTS.sphere, SEGMENTS.sphere),
      'sheetProbe',
      context.finishes.sheetMarker,
    );
    this.rimMarker = partMesh(
      context,
      new SphereGeometry(SHEET_LOOK.rimMarkerRadius, SEGMENTS.sphere, SEGMENTS.sphere),
      'ship',
      context.finishes.rimMarker,
    );
    this.object.add(new LineSegments(geometry, material), this.marker, this.rimMarker);
    this.object.visible = false;
  }

  setShown(shown: boolean): void {
    this.object.visible = shown;
    this.glowTarget = shown ? 1 : 0;
    if (!shown) this.applyGlow(0);
  }

  set(probeAt: Vector3, probeRadius: number, shipAt: Vector3): void {
    const radius = clamp(probeRadius, HORIZON_RADIUS, SHEET.rim);
    this.marker.position.fromArray(sheetPoint(radius, azimuthOf(probeAt)));
    this.rimMarker.position.fromArray(sheetPoint(SHEET.rim, azimuthOf(shipAt)));
  }

  ease(deltaSeconds: number): boolean {
    if (this.glow === this.glowTarget) return false;
    const step = deltaSeconds / SHEET_LOOK.glowEaseSeconds;
    const next = this.glow + clamp(this.glowTarget - this.glow, -step, step);
    this.applyGlow(next);
    return this.glow !== this.glowTarget;
  }

  private applyGlow(glow: number): void {
    this.glow = glow;
    (this.marker.material as MeshStandardMaterial).emissiveIntensity = glow * SHEET_LOOK.markerGlow;
  }
}
