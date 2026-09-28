import { CatmullRomCurve3, Color, Group, Quaternion, SphereGeometry, Vector3 } from 'three';
import type { Mesh, MeshStandardMaterial } from 'three';
import type { PartId } from '../../../ids';
import {
  AV_NODE,
  BUNDLE_PATH,
  LEFT_BRANCH_PATH,
  RIGHT_BRANCH_PATH,
  SINUS_NODE,
} from '../../../model';
import type { Point } from '../../../model';
import { CONDUCTION, PURKINJE, PURKINJE_FANS } from '../../constants';
import type { PurkinjeFan } from '../../constants';
import { FINISHES } from '../../finishes';
import type { Contraction } from '../../geometry/contraction';
import type { Field } from '../../geometry/field';
import { strongest } from '../../geometry/glowPulse';
import { mergeParts } from '../../geometry/merge';
import { addMorphTargets } from '../../geometry/morph';
import { hugSurface } from '../../geometry/surfacePath';
import { taperedTube } from '../../geometry/taperedTube';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const Y_AXIS = new Vector3(0, 1, 0);

function curveOf(points: readonly Point[]): CatmullRomCurve3 {
  return new CatmullRomCurve3(
    points.map((point) => new Vector3(...point)),
    false,
    'centripetal',
  );
}

function line(points: readonly Point[], radius: number): ReturnType<typeof taperedTube> {
  const curve = curveOf(points);
  const samples = Math.max(4, Math.ceil(curve.getLength() / CONDUCTION.sampleMm));
  return taperedTube({
    points: curve.getSpacedPoints(samples),
    radius: () => radius,
    radialSegments: CONDUCTION.radialSegments,
  });
}

function septalLine(
  cavity: Field,
  points: readonly Point[],
  radius: number,
): ReturnType<typeof taperedTube> {
  const hugged = hugSurface(cavity, curveOf(points), () => -(radius + CONDUCTION.septalLiftMm));
  return taperedTube({
    points: hugged,
    radius: () => radius,
    radialSegments: CONDUCTION.radialSegments,
  });
}

function sagging(start: Point, end: Point): Point {
  return [
    (start[0] + end[0]) / 2,
    Math.min(start[1], end[1]) - PURKINJE.sagMm,
    Math.min(start[2], end[2], -PURKINJE.depthMm),
  ];
}

function purkinjeFan(cavity: Field, fan: PurkinjeFan): ReturnType<typeof taperedTube>[] {
  return fan.ends.map((end) => {
    const curve = curveOf([fan.start, sagging(fan.start, end), end]);
    const points = hugSurface(cavity, curve, () => -PURKINJE.liftMm);
    return taperedTube({
      points,
      radius: (share) => PURKINJE.radius[0] + (PURKINJE.radius[1] - PURKINJE.radius[0]) * share,
      radialSegments: PURKINJE.radialSegments,
    });
  });
}

export interface ConductionFields {
  readonly left: Field;
  readonly right: Field;
}

export class ConductionPart {
  readonly object = new Group();
  private readonly glow: Color;
  private readonly meshes: Record<
    'sinusNode' | 'avNode' | 'bundleBranches' | 'purkinjeFibres',
    Mesh
  >;

  constructor(context: PartContext, cavities: ConductionFields, motion: Contraction) {
    this.glow = new Color(CONDUCTION.colour);
    const sinus = new SphereGeometry(1, CONDUCTION.nodeSegments, CONDUCTION.nodeSegments / 2);
    sinus.scale(SINUS_NODE.width / 2, SINUS_NODE.length / 2, SINUS_NODE.width / 2);
    sinus.applyQuaternion(
      new Quaternion().setFromUnitVectors(Y_AXIS, new Vector3(...CONDUCTION.sinusAxis).normalize()),
    );
    sinus.translate(...SINUS_NODE.centre);
    const av = new SphereGeometry(
      CONDUCTION.avRadiusMm,
      CONDUCTION.nodeSegments,
      CONDUCTION.nodeSegments / 2,
    );
    av.translate(...AV_NODE);
    const bundle = mergeParts([
      line(BUNDLE_PATH, CONDUCTION.bundleRadiusMm),
      septalLine(cavities.right, RIGHT_BRANCH_PATH, CONDUCTION.branchRadiusMm),
      septalLine(cavities.left, LEFT_BRANCH_PATH, CONDUCTION.branchRadiusMm),
    ]);
    const fibres = mergeParts(
      PURKINJE_FANS.flatMap((fan) =>
        purkinjeFan(fan.side === 'left' ? cavities.left : cavities.right, fan),
      ),
    );
    for (const geometry of [sinus, av, bundle, fibres]) {
      geometry.deleteAttribute('uv');
      addMorphTargets(geometry, [motion.squeeze, motion.emptying]);
    }
    this.meshes = {
      sinusNode: this.mesh(context, sinus, 'sinusNode'),
      avNode: this.mesh(context, av, 'avNode'),
      bundleBranches: this.mesh(context, bundle, 'bundleBranches'),
      purkinjeFibres: this.mesh(context, fibres, 'purkinjeFibres'),
    };
    this.setShown(false);
  }

  setShown(shown: boolean): void {
    this.object.visible = shown;
  }

  setTime(time: number, squeeze: number, emptying: number): void {
    const shape = CONDUCTION.pulse;
    this.light('sinusNode', strongest(['sinusNode'], time, shape));
    this.light('avNode', strongest(['avNode'], time, shape));
    this.light('bundleBranches', strongest(['bundle', 'branches'], time, shape));
    this.light('purkinjeFibres', strongest(['purkinje'], time, shape));
    Object.values(this.meshes).forEach((mesh) => {
      const influences = mesh.morphTargetInfluences;
      if (!influences) return;
      influences[0] = squeeze;
      influences[1] = emptying;
    });
  }

  private light(part: keyof typeof this.meshes, level: number): void {
    const material = this.meshes[part].material as MeshStandardMaterial;
    material.emissive.copy(this.glow).multiplyScalar(level * CONDUCTION.glowStrength);
  }

  private mesh(
    context: PartContext,
    geometry: ReturnType<typeof taperedTube>,
    group: PartId,
  ): Mesh {
    const mesh = partMesh(context, geometry, group, FINISHES.node);
    this.object.add(mesh);
    return mesh;
  }
}
