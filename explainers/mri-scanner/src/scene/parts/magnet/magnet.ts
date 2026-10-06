import { Group, Mesh } from 'three';
import type { Material, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { AnchorId, AssemblyState, PartId, Point } from '../../../ids';
import { GRADIENT_AXIS_IDS } from '../../../ids';
import {
  BODY_COIL,
  BORE,
  COLD_HEAD,
  gradientShell,
  MAGNET,
  MAIN_COILS,
  QUENCH_PIPE,
  SHIELD_COILS,
  SHIMS,
} from '../../../model/layout';
import type { PartContext, SceneModule } from '../context';
import { buildCover } from './cover';
import type { CoverObjects } from './cover';
import { buildCryostat, VESSELS } from './cryostat';
import { REST_ARC } from './cutaway';
import { GRADIENT_PARTS, GradientCoils } from './gradients';
import { createMagnetLooks, LINER_GLASS_FINISH } from './looks';
import { buildBodyCoil, buildBoreLiner } from './rf';
import type { BoreLiner } from './rf';
import { buildColdHead, buildQuenchPipe } from './turret';

const DIAGONAL = Math.SQRT1_2;
const MAIN_COIL_LABEL = 3;
const SHIELD_COIL_LABEL = 1;
const SHIM_LABEL_TRAY = 4;

function diagonal(radius: number, z = 0): Point {
  return [radius * DIAGONAL, radius * DIAGONAL, z];
}

function onCutFace(inner: number, outer: number, z = 0): Point {
  const radius = (inner + outer) / 2;
  return [radius * Math.cos(REST_ARC.start), radius * Math.sin(REST_ARC.start), z];
}

function onShimTray(): Point {
  const angle = (SHIM_LABEL_TRAY + 0.5) * ((2 * Math.PI) / SHIMS.count);
  return [SHIMS.radius * Math.cos(angle), SHIMS.radius * Math.sin(angle), 0];
}

function vesselLabel(id: keyof typeof VESSELS): Point {
  const { shell, wall } = VESSELS[id];
  return onCutFace(shell.outer - wall, shell.outer);
}

function labelPoints(): Partial<Record<PartId, Point>> {
  const gradients = Object.fromEntries(
    GRADIENT_AXIS_IDS.map((axis) => {
      const { inner, outer } = gradientShell(axis);
      return [GRADIENT_PARTS[axis], onCutFace(inner, outer)];
    }),
  );
  return {
    cover: diagonal(MAGNET.radius, MAGNET.halfLength),
    vacuumVessel: vesselLabel('vacuumVessel'),
    radiationShield: vesselLabel('radiationShield'),
    heliumVessel: vesselLabel('heliumVessel'),
    mainCoils: onCutFace(MAIN_COILS.inner, MAIN_COILS.outer, MAIN_COILS.z[MAIN_COIL_LABEL]),
    shieldCoils: onCutFace(
      SHIELD_COILS.inner,
      SHIELD_COILS.outer,
      SHIELD_COILS.z[SHIELD_COIL_LABEL],
    ),
    shims: onShimTray(),
    ...gradients,
    bodyCoil: [0, -BODY_COIL.radius, BODY_COIL.halfLength],
    bore: [0, -BORE.radius, BORE.halfLength],
    coldHead: [0, COLD_HEAD.top, 0],
    quenchPipe: [0, QUENCH_PIPE.to, 0],
  };
}

class MagnetModule implements SceneModule {
  readonly root = new Group();
  readonly labels = new Map<PartId, Object3D>();
  readonly anchors: Partial<Record<AnchorId, Object3D>> = {};
  private readonly cover: CoverObjects;
  private readonly liner: BoreLiner;
  private readonly inner: Object3D[];
  private readonly gradients: GradientCoils;
  private readonly linerMeshes: Mesh[];
  private readonly linerSolid: Material[];
  private readonly linerGlass: Material;
  private cutaway = false;

  constructor(context: PartContext) {
    this.root.name = 'magnet';
    const looks = createMagnetLooks(context);
    this.cover = buildCover(context);
    this.liner = buildBoreLiner(context);
    this.gradients = new GradientCoils(context);
    const cryostat = buildCryostat(context, looks);
    const coldHead = buildColdHead(context);
    this.inner = [
      ...Object.values(cryostat),
      ...Object.values(this.gradients.parts),
      buildBodyCoil(context),
    ];
    const parts = [
      this.cover.full,
      this.liner.group,
      ...this.inner,
      coldHead,
      buildQuenchPipe(context),
    ];
    this.root.add(this.cover.cut, ...parts);
    const points = labelPoints();
    parts.forEach((part) => {
      const id = part.name as PartId;
      const point = points[id];
      if (point) this.labels.set(id, anchorAt(part, ...point));
    });
    this.anchors.coldHead = anchorAt(coldHead, 0, COLD_HEAD.top, 0);
    this.linerMeshes = this.liner.group.children.filter((child) => child instanceof Mesh);
    this.linerSolid = this.linerMeshes.map((mesh) => mesh.material as Material);
    this.linerGlass = context.materials.get('bore', LINER_GLASS_FINISH);
    this.setCutaway(false);
  }

  setState(state: AssemblyState): void {
    this.setCutaway(state.view.cutaway);
    this.gradients.setTarget(
      state.gradientAxis ?? state.sequence.gradient,
      state.sequence.gradientLevel,
    );
  }

  update(deltaSeconds: number): boolean {
    const easing = this.gradients.update(deltaSeconds);
    this.showLinerGlass(this.cutaway && this.gradients.glowing);
    return easing;
  }

  private showLinerGlass(glass: boolean): void {
    this.linerMeshes.forEach((mesh, index) => {
      mesh.material = glass ? this.linerGlass : this.linerSolid[index];
    });
  }

  private setCutaway(cut: boolean): void {
    this.cutaway = cut;
    this.cover.full.visible = !cut;
    this.cover.cut.visible = cut;
    this.liner.wedge.visible = !cut;
    this.inner.forEach((part) => {
      part.visible = cut;
    });
  }
}

export function createMagnetModule(context: PartContext): SceneModule {
  return new MagnetModule(context);
}
