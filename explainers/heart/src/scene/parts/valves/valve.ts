import { BufferAttribute, BufferGeometry, Color, Group } from 'three';
import type { Mesh, MeshStandardMaterial, Object3D, Vector3 } from 'three';
import { anchorAt } from '@core/scene/parts';
import { VALVE_PARTS } from '../../../ids';
import type { ValveId } from '../../../ids';
import { CUT_PLANE_Z, VALVES } from '../../../model';
import { VALVE_DETAIL } from '../../constants';
import type { CuspValveDesign, FlapValveDesign, ValveDesign } from '../../constants';
import { FINISHES } from '../../finishes';
import { crownLift, cuspIndex, cuspVertexCount, writeCusp } from '../../geometry/cusp';
import type { CuspValve } from '../../geometry/cusp';
import { flapColumns, flapIndex, flapVertexCount, writeFlap } from '../../geometry/leaflet';
import type { Field } from '../../geometry/field';
import { openRim, thicken, thickLayout } from '../../geometry/thickSheet';
import type { Edge, ThickLayout } from '../../geometry/thickSheet';
import type { FlapValve } from '../../geometry/leaflet';
import { clipCapacity, clipSheet } from '../../geometry/clipSheet';
import { FRONTAL_PLANE, insertPlane, sideFilter, subsetGeometry } from '../../geometry/planeCut';
import { ringFrame, ringTube, saddle } from '../../geometry/valveFrame';
import type { AnnulusLift, RingFrame } from '../../geometry/valveFrame';
import { ringCentre } from '../../regions';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const XYZ = 3;
const LEAFLETS_NAME = 'leaflets';

export interface CordAttachment {
  readonly leaflet: number;
  readonly share: number;
  readonly row: number;
}

interface Sheets {
  readonly counts: readonly number[];
  readonly indices: readonly (readonly number[])[];
  readonly grids: readonly { readonly columns: number; readonly rows: number }[];
  write(sheet: number, opening: number, target: Float32Array): void;
}

function sheetLayout(sheets: Sheets, sheet: BufferGeometry): ThickLayout {
  const edges: Edge[] = [];
  let start = 0;
  sheets.grids.forEach((grid, which) => {
    edges.push(...openRim({ start, columns: grid.columns, rows: grid.rows }));
    start += sheets.counts[which];
  });
  return thickLayout(sheet.getIndex()?.array ?? [], start, edges);
}

function sheetGeometry(sheets: Sheets): BufferGeometry {
  const total = sheets.counts.reduce((sum, count) => sum + count, 0);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(total * XYZ), XYZ));
  const index: number[] = [];
  let start = 0;
  sheets.indices.forEach((sheet, which) => {
    sheet.forEach((vertex) => index.push(vertex + start));
    start += sheets.counts[which];
  });
  geometry.setIndex(index);
  return geometry;
}

function sheetStarts(sheets: Sheets): number[] {
  const starts: number[] = [];
  let start = 0;
  for (const count of sheets.counts) {
    starts.push(start);
    start += count;
  }
  return starts;
}

function keyframesOf(sheets: Sheets, vertexCount: number): Float32Array[] {
  const starts = sheetStarts(sheets);
  return Array.from({ length: VALVE_DETAIL.openingKeyframes + 1 }, (_, frame) => {
    const positions = new Float32Array(vertexCount * XYZ);
    const opening = frame / VALVE_DETAIL.openingKeyframes;
    sheets.counts.forEach((_, sheet) =>
      sheets.write(sheet, opening, positions.subarray(starts[sheet] * XYZ)),
    );
    return positions;
  });
}

function blendKeyframes(
  keyframes: readonly Float32Array[],
  opening: number,
  target: Float32Array,
): void {
  const last = keyframes.length - 1;
  const at = Math.min(Math.max(opening, 0), 1) * last;
  const before = Math.min(Math.floor(at), last - 1);
  const share = at - before;
  const [from, to] = [keyframes[before], keyframes[before + 1]];
  for (let offset = 0; offset < target.length; offset += 1) {
    target[offset] = from[offset] + (to[offset] - from[offset]) * share;
  }
}

function displayGeometry(layout: ThickLayout): BufferGeometry {
  const capacity = clipCapacity(layout.index.length);
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(new Float32Array(capacity * XYZ), XYZ));
  geometry.setAttribute('normal', new BufferAttribute(new Float32Array(capacity * XYZ), XYZ));
  return geometry;
}

function ringHalves(ring: BufferGeometry): { front: BufferGeometry; back: BufferGeometry } {
  const cut = insertPlane(ring, FRONTAL_PLANE);
  ring.dispose();
  const halves = {
    front: subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, true)),
    back: subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, false)),
  };
  cut.dispose();
  return halves;
}

export function flapValve(
  ring: RingFrame,
  design: FlapValveDesign,
  cavity: Field | undefined,
): FlapValve {
  const frame = { ...ring, radius: ring.radius - VALVE_DETAIL.hingeInsetMm };
  return {
    frame,
    lift: saddle(design.saddleMm, design.saddlePeak),
    leaflets: design.leaflets,
    shape: design.shape,
    guard: cavity
      ? {
          cavity,
          clearanceMm: VALVE_DETAIL.leafletClearanceMm,
          rampRows: VALVE_DETAIL.guardRampRows,
          stepMm: VALVE_DETAIL.guardStepMm,
          reachMm: VALVE_DETAIL.guardReachMm,
          fullAtOpening: VALVE_DETAIL.guardFullAtOpening,
          smoothing: VALVE_DETAIL.guardSmoothing,
          maxLeanMm: VALVE_DETAIL.guardMaxLeanMm,
        }
      : undefined,
  };
}

function flapSheets(valve: FlapValve): Sheets {
  const leaflets = valve.leaflets.map((_, leaflet) => leaflet);
  return {
    counts: leaflets.map((leaflet) => flapVertexCount(valve, leaflet)),
    indices: leaflets.map((leaflet) => flapIndex(valve, leaflet)),
    grids: leaflets.map((leaflet) => ({
      columns: flapColumns(valve, leaflet),
      rows: valve.shape.rows,
    })),
    write: (sheet, opening, target) => writeFlap(valve, sheet, opening, target),
  };
}

function cuspSheets(valve: CuspValve): Sheets {
  const cusps = Array.from({ length: valve.shape.count }, (_, cusp) => cusp);
  return {
    counts: cusps.map(() => cuspVertexCount(valve.shape)),
    indices: cusps.map(() => cuspIndex(valve.shape)),
    grids: cusps.map(() => ({ columns: valve.shape.columns, rows: valve.shape.rows })),
    write: (sheet, opening, target) => writeCusp(valve, sheet, opening, target),
  };
}

export class ValvePart {
  readonly id: ValveId;
  readonly object = new Group();
  readonly anchor: Object3D;
  readonly frame: RingFrame;
  readonly design: ValveDesign;
  readonly flap: FlapValve | null;
  readonly leaflets: Mesh;
  private readonly rings: Mesh[];
  private readonly frontRing: Mesh | null;
  private readonly sheet: BufferGeometry;
  private readonly sheets: Sheets;
  private readonly layout: ThickLayout;
  private readonly thickPositions: Float32Array;
  private readonly thickNormals: Float32Array;
  private readonly keyframes: Float32Array[];
  private readonly starts: number[];
  private readonly pulse = new Color(VALVE_DETAIL.pulseColour);
  private opening = Number.NaN;
  private cut = false;

  constructor(context: PartContext, id: ValveId, design: ValveDesign, cavity?: Field) {
    this.id = id;
    this.design = design;
    const { normal, radius } = VALVES[id];
    this.frame = ringFrame(ringCentre(id), normal, radius);
    this.flap = design.kind === 'flap' ? flapValve(this.frame, design, cavity) : null;
    this.sheets = this.flap
      ? flapSheets(this.flap)
      : cuspSheets(this.cuspValve(design as CuspValveDesign));
    const group = VALVE_PARTS[id];
    const lift: AnnulusLift = this.flap
      ? this.flap.lift
      : crownLift((design as CuspValveDesign).shape);
    const ring = ringTube(this.frame, lift, {
      segments: VALVE_DETAIL.ringSegments,
      radialSegments: VALVE_DETAIL.ringRadialSegments,
      tubeRadius: this.flap ? VALVE_DETAIL.ringTubeMm : VALVE_DETAIL.crownTubeMm,
    });
    if (this.flap) {
      const { front, back } = ringHalves(ring);
      this.frontRing = partMesh(context, front, group, FINISHES.ring);
      this.rings = [this.frontRing, partMesh(context, back, group, FINISHES.ring)];
    } else {
      this.frontRing = null;
      this.rings = [partMesh(context, ring, group, FINISHES.ring)];
    }
    this.sheet = context.tracker.track(sheetGeometry(this.sheets));
    this.starts = sheetStarts(this.sheets);
    this.keyframes = keyframesOf(this.sheets, this.sheet.getAttribute('position').count);
    this.layout = sheetLayout(this.sheets, this.sheet);
    this.thickPositions = new Float32Array(this.layout.vertexCount * XYZ);
    this.thickNormals = new Float32Array(this.layout.vertexCount * XYZ);
    this.leaflets = partMesh(context, displayGeometry(this.layout), group, FINISHES.leaflet);
    this.leaflets.name = LEAFLETS_NAME;
    this.object.add(...this.rings, this.leaflets);
    const { x, y, z } = this.frame.centre;
    this.anchor = anchorAt(this.object, x, y, z);
    this.setOpening(0);
  }

  setOpening(opening: number): void {
    if (opening === this.opening) return;
    this.opening = opening;
    const positions = this.sheet.getAttribute('position').array as Float32Array;
    blendKeyframes(this.keyframes, opening, positions);
    this.sheet.getAttribute('position').needsUpdate = true;
    this.sheet.computeVertexNormals();
    this.sheet.computeBoundingSphere();
    this.refreshLeaflets();
  }

  setCutaway(cutaway: boolean): void {
    if (!this.flap || cutaway === this.cut) return;
    this.cut = cutaway;
    if (this.frontRing) this.frontRing.visible = !cutaway;
    this.refreshLeaflets();
  }

  setPulse(level: number): void {
    const material = this.rings[0].material as MeshStandardMaterial;
    material.emissive.copy(this.pulse).multiplyScalar(level * VALVE_DETAIL.pulseGlow);
  }

  attachmentPoint(attachment: CordAttachment, out: Vector3): Vector3 {
    const grid = this.sheets.grids[attachment.leaflet];
    const positions = this.sheet.getAttribute('position').array;
    const column = attachment.share * grid.columns;
    const before = Math.min(Math.floor(column), grid.columns - 1);
    const share = column - before;
    const vertex = (at: number) =>
      (this.starts[attachment.leaflet] + at * (grid.rows + 1) + attachment.row) * XYZ;
    const [a, b] = [vertex(before), vertex(before + 1)];
    return out.set(
      positions[a] + (positions[b] - positions[a]) * share,
      positions[a + 1] + (positions[b + 1] - positions[a + 1]) * share,
      positions[a + 2] + (positions[b + 2] - positions[a + 2]) * share,
    );
  }

  private refreshLeaflets(): void {
    const display = this.leaflets.geometry;
    const positions = display.getAttribute('position');
    const normals = display.getAttribute('normal');
    thicken(
      this.layout,
      this.sheet.getAttribute('position').array,
      this.sheet.getAttribute('normal').array,
      VALVE_DETAIL.leafletHalfThicknessMm,
      this.thickPositions,
      this.thickNormals,
    );
    const count = clipSheet(
      { positions: this.thickPositions, normals: this.thickNormals, index: this.layout.index },
      this.cut ? CUT_PLANE_Z : null,
      { positions: positions.array as Float32Array, normals: normals.array as Float32Array },
    );
    display.setDrawRange(0, count);
    positions.needsUpdate = true;
    normals.needsUpdate = true;
    display.boundingSphere = this.sheet.boundingSphere?.clone() ?? null;
  }

  private cuspValve(design: CuspValveDesign): CuspValve {
    return { frame: this.frame, shape: design.shape };
  }
}
