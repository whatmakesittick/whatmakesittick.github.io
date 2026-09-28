import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Group,
  Quaternion,
  TorusGeometry,
  Vector3,
} from 'three';
import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { VALVE_PARTS } from '../../../ids';
import type { ValveId } from '../../../ids';
import { VALVES } from '../../../model';
import { VALVE_DETAIL } from '../../constants';
import type { ValveDesign } from '../../constants';
import { FINISHES } from '../../finishes';
import {
  freeEdgePoint,
  leafletIndex,
  leafletPoint,
  leafletVertexCount,
  ringFrame,
  writeLeaflet,
} from '../../geometry/leaflet';
import type { RingFrame } from '../../geometry/leaflet';
import { ringCentre } from '../../regions';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const XYZ = 3;
const Z_AXIS = new Vector3(0, 0, 1);

export interface ChordAttachment {
  readonly leaflet: number;
  readonly share: number;
}

function ringGeometry(frame: RingFrame): TorusGeometry {
  const ring = new TorusGeometry(
    frame.radius,
    VALVE_DETAIL.ringTubeMm,
    VALVE_DETAIL.ringRadialSegments,
    VALVE_DETAIL.ringSegments,
  );
  ring.applyQuaternion(new Quaternion().setFromUnitVectors(Z_AXIS, frame.normal));
  ring.translate(frame.centre.x, frame.centre.y, frame.centre.z);
  return ring;
}

function leafletsGeometry(design: ValveDesign): BufferGeometry {
  const perLeaflet = leafletVertexCount(design.shape);
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new BufferAttribute(new Float32Array(perLeaflet * design.leaflets.length * XYZ), XYZ),
  );
  const single = leafletIndex(design.shape);
  const index: number[] = [];
  design.leaflets.forEach((_, leaflet) =>
    single.forEach((vertex) => index.push(vertex + leaflet * perLeaflet)),
  );
  geometry.setIndex(index);
  return geometry;
}

export class ValvePart {
  readonly id: ValveId;
  readonly object = new Group();
  readonly anchor: Object3D;
  readonly frame: RingFrame;
  readonly design: ValveDesign;
  private readonly ring: Mesh;
  private readonly leaflets: Mesh;
  private readonly pulse = new Color(VALVE_DETAIL.pulseColour);
  private opening = Number.NaN;

  constructor(context: PartContext, id: ValveId, design: ValveDesign) {
    this.id = id;
    this.design = design;
    const { normal, radius } = VALVES[id];
    this.frame = ringFrame(ringCentre(id), normal, radius);
    const group = VALVE_PARTS[id];
    this.ring = partMesh(context, ringGeometry(this.frame), group, FINISHES.ring);
    this.leaflets = partMesh(context, leafletsGeometry(design), group, FINISHES.leaflet);
    this.object.add(this.ring, this.leaflets);
    const { x, y, z } = this.frame.centre;
    this.anchor = anchorAt(this.object, x, y, z);
    this.setOpening(0);
  }

  setOpening(opening: number): void {
    if (opening === this.opening) return;
    this.opening = opening;
    const geometry = this.leaflets.geometry;
    const positions = geometry.getAttribute('position').array as Float32Array;
    const perLeaflet = leafletVertexCount(this.design.shape) * XYZ;
    this.design.leaflets.forEach((leaflet, index) => {
      writeLeaflet(
        this.frame,
        leaflet,
        this.design.shape,
        opening,
        positions.subarray(index * perLeaflet),
      );
    });
    geometry.getAttribute('position').needsUpdate = true;
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
  }

  setPulse(level: number): void {
    const material = this.ring.material as MeshStandardMaterial;
    material.emissive.copy(this.pulse).multiplyScalar(level * VALVE_DETAIL.pulseGlow);
  }

  edgePoint(attachment: ChordAttachment, out: Vector3): Vector3 {
    const leaflet = this.design.leaflets[attachment.leaflet];
    return leafletPoint(
      this.frame,
      leaflet,
      this.design.shape,
      this.opening,
      attachment.share,
      VALVE_DETAIL.chordEdgeInset,
      out,
    );
  }

  closedEdgePoint(attachment: ChordAttachment): Vector3 {
    const leaflet = this.design.leaflets[attachment.leaflet];
    return freeEdgePoint(this.frame, leaflet, this.design.shape, attachment.share);
  }
}
