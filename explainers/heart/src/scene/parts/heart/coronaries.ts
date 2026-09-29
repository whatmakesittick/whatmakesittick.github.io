import { Group } from 'three';
import type { Mesh, Vector3 } from 'three';
import { CORONARY_DETAIL } from '../../constants';
import type { CoronarySpec } from '../../constants';
import { FINISHES } from '../../finishes';
import type { Contraction } from '../../geometry/contraction';
import type { Field } from '../../geometry/field';
import { mergeParts } from '../../geometry/merge';
import { addMorphTargets } from '../../geometry/morph';
import { FRONTAL_PLANE, insertPlane, sideFilter, subsetGeometry } from '../../geometry/planeCut';
import { hugSurface, surfaceCurve } from '../../geometry/surfacePath';
import { taperedTube } from '../../geometry/taperedTube';
import { partMesh } from '../context';
import type { PartContext } from '../context';

export interface CoronaryRoute {
  readonly points: readonly Vector3[];
  readonly radius: readonly [number, number];
}

function taper(radius: readonly [number, number], share: number): number {
  return radius[0] + (radius[1] - radius[0]) * share;
}

export function coronaryRoutes(envelope: Field, specs: readonly CoronarySpec[]): CoronaryRoute[] {
  return specs.map((spec) => ({
    radius: spec.radius,
    points: hugSurface(
      envelope,
      surfaceCurve(envelope, spec.marks),
      (share) => taper(spec.radius, share) * CORONARY_DETAIL.embed,
    ),
  }));
}

export class CoronariesPart {
  readonly object = new Group();
  private readonly front: Mesh;

  constructor(context: PartContext, routes: readonly CoronaryRoute[], motion: Contraction) {
    const tubes = routes.map((route) =>
      taperedTube({
        points: route.points,
        radius: (share) => taper(route.radius, share),
        radialSegments: CORONARY_DETAIL.radialSegments,
      }),
    );
    const merged = mergeParts(tubes);
    const cut = insertPlane(merged, FRONTAL_PLANE);
    merged.dispose();
    addMorphTargets(cut, [motion.squeeze, motion.emptying]);
    this.front = partMesh(
      context,
      subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, true)),
      'coronaries',
      FINISHES.coronary,
    );
    const back = partMesh(
      context,
      subsetGeometry(cut, sideFilter(cut, FRONTAL_PLANE, false)),
      'coronaries',
      FINISHES.coronary,
    );
    cut.dispose();
    this.object.add(this.front, back);
  }

  setCutaway(cutaway: boolean): void {
    this.front.visible = !cutaway;
  }

  setContraction(squeeze: number, emptying: number): void {
    this.object.children.forEach((child) => {
      const influences = (child as Mesh).morphTargetInfluences;
      if (!influences) return;
      influences[0] = squeeze;
      influences[1] = emptying;
    });
  }
}
