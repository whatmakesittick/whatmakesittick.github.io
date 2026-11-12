import { Color, Group } from 'three';
import type { BufferGeometry, Mesh, MeshStandardMaterial } from 'three';
import type { Steps } from '@core/scene/pacing';
import { CHAMBER_IDS } from '../../../ids';
import type { ChamberId } from '../../../ids';
import { isAtrium } from '../../../model';
import { CAP, SHAPE } from '../../constants';
import { FINISHES } from '../../finishes';
import type { Contraction } from '../../geometry/contraction';
import type { HeartShapes, HeartSide } from '../../geometry/heartShape';
import { sectionCap } from '../../geometry/sectionCap';
import { cavityPieces, envelopeHalves } from '../../geometry/wallMesh';
import type { EnvelopeHalves, Painter } from '../../geometry/wallMesh';
import { partMesh } from '../context';
import type { PartContext } from '../context';

export interface WallMotion {
  readonly outer: Contraction;
  readonly cavity: Contraction;
}

const SIDES: readonly HeartSide[] = ['right', 'left'];

export interface WallGeometry {
  readonly halves: EnvelopeHalves;
  readonly cavities: ReadonlyMap<ChamberId, BufferGeometry>;
  readonly cap: BufferGeometry;
}

export function* wallGeometry(
  shapes: HeartShapes,
  motion: WallMotion,
  painter: Painter,
): Steps<WallGeometry> {
  const halves = yield* envelopeHalves(
    shapes.envelope,
    shapes.envelopeBounds,
    { resolution: SHAPE.envelopeResolution, marginMm: SHAPE.gridMarginMm },
    motion.outer,
    painter,
    shapes.portals,
  );
  const cavities = new Map<ChamberId, BufferGeometry>();
  for (const side of SIDES) {
    const pieces = yield* cavityPieces(
      side,
      shapes.sides[side],
      shapes.chambers,
      shapes.sideBounds[side],
      { resolution: SHAPE.cavityResolution, marginMm: SHAPE.gridMarginMm },
      motion.cavity,
      shapes.sidePortals[side],
    );
    pieces.forEach((geometry, id) => cavities.set(id, geometry));
  }
  const cap = yield* sectionCap(
    {
      envelope: shapes.envelope,
      cavities: SIDES.map((side) => shapes.sides[side]),
      portals: shapes.portals,
    },
    shapes.envelopeBounds,
    CAP,
    motion,
  );
  return { halves, cavities, cap };
}

export class MyocardiumPart {
  readonly object = new Group();
  readonly front: Mesh;
  readonly back: Mesh;
  readonly cap: Mesh;
  readonly cavities = new Map<ChamberId, Mesh>();
  private readonly glowColour = new Color(CAP.glow);

  constructor(context: PartContext, geometry: WallGeometry) {
    this.front = partMesh(context, geometry.halves.front, 'wall', FINISHES.epicardium);
    this.back = partMesh(context, geometry.halves.back, 'wall', FINISHES.epicardium);
    geometry.cavities.forEach((cavity, id) => {
      this.cavities.set(id, partMesh(context, cavity, id, FINISHES.cavity));
    });
    this.cap = partMesh(context, geometry.cap, 'wall', FINISHES.cut);
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
}
