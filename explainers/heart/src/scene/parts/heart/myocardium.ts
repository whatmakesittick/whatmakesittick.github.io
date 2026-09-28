import { Color, Group } from 'three';
import type { Mesh, MeshStandardMaterial } from 'three';
import { CHAMBER_IDS } from '../../../ids';
import type { ChamberId } from '../../../ids';
import { isAtrium } from '../../../model';
import { CAP, SHAPE } from '../../constants';
import { FINISHES } from '../../finishes';
import type { Contraction } from '../../geometry/contraction';
import type { HeartShapes, HeartSide } from '../../geometry/heartShape';
import { sectionCap } from '../../geometry/sectionCap';
import { cavityPieces, envelopeHalves } from '../../geometry/wallMesh';
import type { Painter } from '../../geometry/wallMesh';
import { partMesh } from '../context';
import type { PartContext } from '../context';

export interface WallMotion {
  readonly outer: Contraction;
  readonly cavity: Contraction;
}

const SIDES: readonly HeartSide[] = ['right', 'left'];

export class MyocardiumPart {
  readonly object = new Group();
  readonly front: Mesh;
  readonly back: Mesh;
  readonly cap: Mesh;
  readonly cavities = new Map<ChamberId, Mesh>();
  private readonly glowColour = new Color(CAP.glow);

  constructor(context: PartContext, shapes: HeartShapes, motion: WallMotion, painter: Painter) {
    const detail = { resolution: SHAPE.envelopeResolution, marginMm: SHAPE.gridMarginMm };
    const halves = envelopeHalves(
      shapes.envelope,
      shapes.envelopeBounds,
      detail,
      motion.outer,
      painter,
      shapes.portals,
    );
    this.front = partMesh(context, halves.front, 'wall', FINISHES.epicardium);
    this.back = partMesh(context, halves.back, 'wall', FINISHES.epicardium);
    SIDES.forEach((side) => this.buildCavities(context, shapes, side, motion));
    const cap = sectionCap(
      {
        envelope: shapes.envelope,
        cavities: SIDES.map((side) => shapes.sides[side]),
        portals: shapes.portals,
      },
      shapes.envelopeBounds,
      CAP,
      motion,
    );
    this.cap = partMesh(context, cap, 'wall', FINISHES.cut);
    this.object.add(this.front, this.back, this.cap, ...this.cavities.values());
    this.setCutaway(false);
  }

  setContraction(squeeze: number, emptying: number): void {
    for (const mesh of this.meshes()) {
      const influences = mesh.morphTargetInfluences;
      if (!influences) continue;
      influences[0] = squeeze;
      influences[1] = emptying;
    }
  }

  setCutaway(cutaway: boolean): void {
    this.front.visible = !cutaway;
    this.cap.visible = cutaway;
    this.cavities.forEach((mesh) => {
      mesh.visible = cutaway;
    });
  }

  setGlow(atrial: number, ventricular: number): void {
    for (const id of CHAMBER_IDS) {
      const mesh = this.cavities.get(id);
      if (!mesh) continue;
      const level = (isAtrium(id) ? atrial : ventricular) * CAP.glowStrength;
      (mesh.material as MeshStandardMaterial).emissive.copy(this.glowColour).multiplyScalar(level);
    }
  }

  private meshes(): Mesh[] {
    return [this.front, this.back, this.cap, ...this.cavities.values()];
  }

  private buildCavities(
    context: PartContext,
    shapes: HeartShapes,
    side: HeartSide,
    motion: WallMotion,
  ): void {
    const detail = { resolution: SHAPE.cavityResolution, marginMm: SHAPE.gridMarginMm };
    const pieces = cavityPieces(
      side,
      shapes.sides[side],
      shapes.chambers,
      shapes.sideBounds[side],
      detail,
      motion.cavity,
      shapes.sidePortals[side],
    );
    for (const [id, geometry] of pieces) {
      this.cavities.set(id, partMesh(context, geometry, id, FINISHES.cavity));
    }
  }
}
