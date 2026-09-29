import { CylinderGeometry, Group, InstancedMesh, Matrix4, Quaternion, Vector3 } from 'three';
import type { BufferGeometry, Mesh } from 'three';
import { VALVE_DETAIL } from '../../constants';
import type { FlapValveDesign } from '../../constants';
import { FINISHES } from '../../finishes';
import { displace } from '../../geometry/contraction';
import type { Contraction, Offset } from '../../geometry/contraction';
import type { Field } from '../../geometry/field';
import { mergeParts } from '../../geometry/merge';
import { addMorphTargets } from '../../geometry/morph';
import { papillaryFinger, wallBase } from '../../geometry/papillary';
import { planDirection } from '../../geometry/valveFrame';
import { CUT_PLANE_Z } from '../../../model';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import type { ValveId } from '../../../ids';
import type { CordAttachment, ValvePart } from './valve';

interface Cord {
  readonly valve: ValvePart;
  readonly attachment: CordAttachment;
  readonly papillary: number;
}

interface Papillary {
  readonly valve: ValveId;
  readonly tip: Vector3;
  readonly base: Vector3;
  readonly tipRadius: number;
  readonly front: boolean;
}

export function papillaryTip(valve: ValvePart, index: number): Vector3 {
  const design = valve.design as FlapValveDesign;
  const spec = design.papillaries[index];
  const { frame } = valve;
  const angle = design.leaflets[index].from + spec.angleOffset;
  return planDirection(frame, angle)
    .multiplyScalar(frame.radius * spec.radiusShare)
    .add(frame.centre)
    .addScaledVector(frame.normal, spec.depthMm);
}

export function papillaryReach(valve: ValvePart, index: number): Vector3 {
  const design = valve.design as FlapValveDesign;
  const spec = design.papillaries[index];
  const angle = design.leaflets[index].from + spec.angleOffset;
  return planDirection(valve.frame, angle)
    .multiplyScalar(spec.outward)
    .addScaledVector(valve.frame.normal, spec.downward);
}

const UP = new Vector3(0, 1, 0);
const TIP_SPREAD = 0.7;

function spread(from: number, to: number, count: number): number[] {
  if (count <= 0) return [];
  return Array.from({ length: count }, (_, index) => from + ((to - from) * (index + 0.5)) / count);
}

export function papillaryAttachments(design: FlapValveDesign, papillary: number): CordAttachment[] {
  const { leaflets, cords, shape } = design;
  const count = leaflets.length;
  const after = papillary;
  const before = (papillary - 1 + count) % count;
  const margin = cords.edgeMargin;
  const strutRow = Math.round(shape.rows * cords.strutRowShare);
  const halves: [leaflet: number, from: number, to: number][] = [
    [after, margin, 0.5],
    [before, 0.5, 1 - margin],
  ];
  return halves.flatMap(([leaflet, from, to]) => [
    ...spread(from, to, cords.primaryPerHalf[leaflet]).map((share) => ({
      leaflet,
      share,
      row: shape.rows,
    })),
    ...spread(from, to, cords.strutsPerHalf[leaflet]).map((share) => ({
      leaflet,
      share,
      row: strutRow,
    })),
  ]);
}

export class ChordaePart {
  readonly object = new Group();
  readonly anchor: Vector3;
  private readonly cords: Cord[] = [];
  private readonly papillaries: Papillary[] = [];
  private readonly movedTips: Vector3[] = [];
  private readonly strings: Record<'front' | 'back', { mesh: InstancedMesh; cords: Cord[] }>;
  private readonly muscles: Record<'front' | 'back', Mesh | null>;
  private readonly motion: Contraction;
  private readonly matrix = new Matrix4();
  private readonly turn = new Quaternion();
  private readonly end = new Vector3();
  private readonly start = new Vector3();
  private readonly span = new Vector3();
  private readonly scale = new Vector3(1, 1, 1);
  private readonly offset: Offset = [0, 0, 0];
  private readonly hidden = new Matrix4().makeScale(0, 0, 0);
  private cut = false;
  private squeeze = 0;
  private emptying = 0;

  constructor(
    context: PartContext,
    valves: readonly ValvePart[],
    cavityOf: (valve: ValvePart) => Field,
    motion: Contraction,
    labelledValve: ValveId,
  ) {
    this.motion = motion;
    const geometries = valves.flatMap((valve) => this.buildValve(valve, cavityOf(valve)));
    this.muscles = {
      front: this.muscleMesh(context, geometries, true),
      back: this.muscleMesh(context, geometries, false),
    };
    this.strings = {
      front: this.stringMesh(context, true),
      back: this.stringMesh(context, false),
    };
    this.object.add(this.strings.front.mesh, this.strings.back.mesh);
    const labelled =
      this.papillaries.find((papillary) => !papillary.front && papillary.valve === labelledValve) ??
      this.papillaries[0];
    this.anchor = labelled.tip.clone();
    this.movedTips.push(...this.papillaries.map((papillary) => papillary.tip.clone()));
    this.update(0, 0);
  }

  setCutaway(cutaway: boolean): void {
    this.cut = cutaway;
    this.strings.front.mesh.visible = !cutaway;
    if (this.muscles.front) this.muscles.front.visible = !cutaway;
    this.update(this.squeeze, this.emptying);
  }

  get count(): number {
    return this.cords.length;
  }

  papillaryCount(front: boolean): number {
    return this.papillaries.filter((papillary) => papillary.front === front).length;
  }

  cordsOf(papillary: number): readonly CordAttachment[] {
    return this.cords.filter((cord) => cord.papillary === papillary).map((cord) => cord.attachment);
  }

  update(squeeze: number, emptying: number): void {
    this.squeeze = squeeze;
    this.emptying = emptying;
    for (const mesh of [this.muscles.front, this.muscles.back]) {
      const influences = mesh?.morphTargetInfluences;
      if (!influences) continue;
      influences[0] = squeeze;
      influences[1] = emptying;
    }
    this.papillaries.forEach(({ tip }, index) => {
      displace(this.motion, [tip.x, tip.y, tip.z], squeeze, emptying, this.offset);
      this.movedTips[index].set(...this.offset);
    });
    for (const { mesh, cords } of [this.strings.front, this.strings.back]) {
      cords.forEach((cord, index) => mesh.setMatrixAt(index, this.cordMatrix(cord)));
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private cordMatrix(cord: Cord): Matrix4 {
    cord.valve.attachmentPoint(cord.attachment, this.end);
    if (this.cut && this.end.z > CUT_PLANE_Z) return this.hidden;
    const tip = this.movedTips[cord.papillary];
    const reach = this.papillaries[cord.papillary].tipRadius * TIP_SPREAD;
    this.start.copy(this.end).sub(tip).normalize().multiplyScalar(reach).add(tip);
    this.span.subVectors(this.end, this.start);
    const length = this.span.length();
    this.turn.setFromUnitVectors(UP, this.span.divideScalar(length || 1));
    this.scale.set(1, length, 1);
    return this.matrix.compose(this.start, this.turn, this.scale);
  }

  private muscleMesh(
    context: PartContext,
    geometries: readonly BufferGeometry[],
    front: boolean,
  ): Mesh | null {
    const chosen = geometries.filter((_, index) => this.papillaries[index].front === front);
    if (chosen.length === 0) return null;
    const merged = mergeParts(chosen);
    addMorphTargets(merged, [this.motion.squeeze, this.motion.emptying]);
    const mesh = partMesh(context, merged, 'chordae', FINISHES.papillary);
    this.object.add(mesh);
    return mesh;
  }

  private stringMesh(context: PartContext, front: boolean): { mesh: InstancedMesh; cords: Cord[] } {
    const cords = this.cords.filter((cord) => this.papillaries[cord.papillary].front === front);
    const cylinder = new CylinderGeometry(
      VALVE_DETAIL.chordRadiusMm,
      VALVE_DETAIL.chordRadiusMm,
      1,
      VALVE_DETAIL.chordSegments,
      1,
      true,
    );
    cylinder.translate(0, 0.5, 0);
    const mesh = new InstancedMesh(
      context.tracker.track(cylinder),
      context.materials.get('chordae', FINISHES.chorda),
      Math.max(cords.length, 1),
    );
    mesh.count = cords.length;
    mesh.frustumCulled = false;
    context.tracker.track(mesh);
    return { mesh, cords };
  }

  private buildValve(valve: ValvePart, cavity: Field): BufferGeometry[] {
    const design = valve.design;
    if (design.kind !== 'flap') return [];
    return design.papillaries.map((papillary, index) => {
      const tip = papillaryTip(valve, index);
      const reach = papillaryReach(valve, index);
      const base = wallBase(
        cavity,
        [tip.x, tip.y, tip.z],
        [reach.x, reach.y, reach.z],
        VALVE_DETAIL.papillaryWallMm,
        VALVE_DETAIL.papillaryStepMm,
      );
      const slot = this.papillaries.length;
      this.papillaries.push({
        valve: valve.id,
        tip,
        base,
        tipRadius: papillary.tipRadiusMm,
        front: base.z > CUT_PLANE_Z,
      });
      for (const attachment of papillaryAttachments(design, index)) {
        this.cords.push({ valve, attachment, papillary: slot });
      }
      return papillaryFinger(base, tip, {
        baseRadius: papillary.baseRadiusMm,
        tipRadius: papillary.tipRadiusMm,
        segments: VALVE_DETAIL.papillarySegments,
      });
    });
  }
}
