import {
  AdditiveBlending,
  Color,
  Euler,
  Group,
  Matrix4,
  Quaternion,
  SphereGeometry,
  Vector3,
} from 'three';
import type { BufferGeometry, InstancedMesh, Object3D } from 'three';
import type { MaterialFinish } from '@core/scene/materials';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import { BETA_INDICES } from '../../../ids';
import type { BetaIndex, PartId } from '../../../ids';
import { BETA_AZIMUTH_DEG } from '../../../model/rotor';
import { nm } from '../../../model/scale';
import { THEME } from '../../../theme';
import { DETAIL, GLYPH_FORM } from '../../constants';
import { FINISHES } from '../../finishes';
import {
  adpLabelBeta,
  atpLabelBeta,
  atpLeavingPoint,
  poseSeatMolecules,
  seatMolecules,
  seatPoint,
} from '../../flow/molecules';
import type { GlyphPose, SeatMolecules } from '../../flow/molecules';
import { copyPoint } from '../../flow/points';
import { mergeParts } from '../../geometry/merge';
import { sphereAt } from '../../geometry/solids';
import { instancedMesh } from '../context';
import type { PartContext } from '../context';

const ADP_BEADS = 2;
const ATP_BEADS = 3;
const QUARTER_TURN_DEG = 90;
const BETA_COUNT = BETA_INDICES.length;
const FULL_PRESENCE = 1;
const HELD_LABEL_BETA: BetaIndex = 0;
const HELD_ATP_SHARE = 0.45;
const HELD_ATP_SPOT = atpLeavingPoint(HELD_LABEL_BETA, HELD_ATP_SHARE);

function bodyGeometry(): BufferGeometry {
  const { base, sugar } = GLYPH_FORM;
  return mergeParts([
    sphereAt(new Vector3(), base.radius, DETAIL.hero),
    sphereAt(new Vector3(sugar.x, sugar.y, 0), sugar.radius, DETAIL.hero),
  ]);
}

function beadGeometry(): BufferGeometry {
  const { radius } = GLYPH_FORM.phosphate;
  return new SphereGeometry(radius, DETAIL.hero.sphere, DETAIL.hero.sphere / 2);
}

function beadOffset(index: number): Matrix4 {
  const { firstX, spacing, y } = GLYPH_FORM.phosphate;
  return new Matrix4().makeTranslation(firstX + spacing * index, y, 0);
}

const BEAD_OFFSETS = Array.from({ length: ATP_BEADS }, (_, index) => beadOffset(index));

interface Glyph {
  readonly body: InstancedMesh;
  readonly beads: InstancedMesh;
  readonly beadCount: number;
}

export class MoleculesPart {
  readonly object = new Group();
  readonly labels: Readonly<Record<'atp' | 'adpPhosphate', Object3D>>;
  private readonly adp: Glyph;
  private readonly atp: Glyph;
  private readonly flashes: PointCloud;
  private readonly flashTint = new Color(THEME.atp);
  private readonly seats = BETA_INDICES.map(() => seatMolecules());
  private readonly matrix = new Matrix4();
  private readonly beadMatrix = new Matrix4();
  private readonly rotation = new Quaternion();
  private readonly euler = new Euler();
  private readonly position = new Vector3();
  private readonly scale = new Vector3();
  private presence = FULL_PRESENCE;

  constructor(context: PartContext) {
    this.adp = this.glyph(context, 'adpPhosphate', FINISHES.adenosine, ADP_BEADS + 1);
    this.atp = this.glyph(context, 'atp', FINISHES.atp, ATP_BEADS);
    const flash = createPointMaterial(
      context.textures.glow,
      nm(GLYPH_FORM.flashSize),
      AdditiveBlending,
    );
    context.materials.register('atp', context.tracker.track(flash));
    this.flashes = context.tracker.track(new PointCloud(BETA_COUNT, flash));
    this.object.add(this.flashes.points);
    this.labels = {
      atp: anchorAt(this.object, 0, 0, 0),
      adpPhosphate: anchorAt(this.object, 0, 0, 0),
    };
  }

  place(rotorDeg: number, presence: number): void {
    this.presence = presence;
    for (const beta of BETA_INDICES) {
      this.placeSeat(beta, poseSeatMolecules(beta, rotorDeg, this.seats[beta]));
    }
    this.markChanged(this.adp);
    this.markChanged(this.atp);
    this.flashes.commit();
    if (presence < FULL_PRESENCE) this.holdLabels();
    else this.followLabels(rotorDeg);
  }

  private followLabels(rotorDeg: number): void {
    copyPoint(this.labels.atp.position, this.seats[atpLabelBeta(rotorDeg)].atp.position);
    copyPoint(this.labels.adpPhosphate.position, seatPoint(adpLabelBeta(rotorDeg)));
  }

  private holdLabels(): void {
    copyPoint(this.labels.atp.position, HELD_ATP_SPOT);
    copyPoint(this.labels.adpPhosphate.position, seatPoint(HELD_LABEL_BETA));
  }

  private markChanged(glyph: Glyph): void {
    glyph.body.instanceMatrix.needsUpdate = true;
    glyph.beads.instanceMatrix.needsUpdate = true;
  }

  private placeSeat(beta: BetaIndex, seat: SeatMolecules): void {
    const yaw = toRadians(BETA_AZIMUTH_DEG[beta] + QUARTER_TURN_DEG);
    this.placeGlyph(this.adp, beta, seat.adp, yaw, ADP_BEADS);
    this.placeGlyph(this.atp, beta, seat.atp, yaw, ATP_BEADS);
    this.compose(seat.phosphate, yaw);
    this.adp.beads.setMatrixAt(beta * this.adp.beadCount + ADP_BEADS, this.matrix);
    const { x, y, z } = seatPoint(beta);
    const { r, g, b } = this.flashTint;
    this.flashes.setPoint(beta, x, y, z);
    this.flashes.setColor(beta, r, g, b, seat.flash * GLYPH_FORM.flashAlpha * this.presence);
  }

  private placeGlyph(
    glyph: Glyph,
    beta: BetaIndex,
    pose: GlyphPose,
    yaw: number,
    beads: number,
  ): void {
    this.compose(pose, yaw);
    glyph.body.setMatrixAt(beta, this.matrix);
    for (let bead = 0; bead < beads; bead += 1) {
      this.beadMatrix.multiplyMatrices(this.matrix, BEAD_OFFSETS[bead]);
      glyph.beads.setMatrixAt(beta * glyph.beadCount + bead, this.beadMatrix);
    }
  }

  private compose(pose: GlyphPose, yaw: number): void {
    const { x, y, z } = pose.position;
    this.rotation.setFromEuler(this.euler.set(pose.turn, yaw, 0));
    this.scale.setScalar(pose.scale * this.presence);
    this.matrix.compose(this.position.set(x, y, z), this.rotation, this.scale);
  }

  private glyph(
    context: PartContext,
    group: PartId,
    bodyFinish: MaterialFinish,
    beadCount: number,
  ): Glyph {
    const body = instancedMesh(context, bodyGeometry(), group, bodyFinish, BETA_COUNT);
    const beads = instancedMesh(
      context,
      beadGeometry(),
      group,
      FINISHES.phosphate,
      BETA_COUNT * beadCount,
    );
    [body, beads].forEach((mesh) => {
      mesh.frustumCulled = false;
      this.object.add(mesh);
    });
    return { body, beads, beadCount };
  }
}
