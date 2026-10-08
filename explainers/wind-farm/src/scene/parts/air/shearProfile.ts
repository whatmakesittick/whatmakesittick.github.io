import { CatmullRomCurve3, CylinderGeometry, Mesh, TubeGeometry, Vector3 } from 'three';
import type { ShaderMaterial } from 'three';
import type { SpacingD } from '../../../ids';
import { shearProfileAt, terrainHeight } from '../../../model/layout';
import { FINISHES } from '../../finishes';
import { finishMesh, label, namedGroup, partMesh, registeredMaterial } from '../context';
import type { PartContext } from '../context';
import { arrowGeometry } from './arrowGeometry';
import { advanceArrows, arrowMaterial } from './arrowMaterial';
import { SHEAR_ARROWS } from './constants';
import { shearArrows } from './shear';

const MAST_SIDES = 8;

function mast(context: PartContext): Mesh {
  const { mastTop, mastRadius } = SHEAR_ARROWS;
  const geometry = new CylinderGeometry(mastRadius, mastRadius, mastTop, MAST_SIDES);
  geometry.translate(0, mastTop / 2, 0);
  return finishMesh(context, geometry, 'shearProfile', FINISHES.steel);
}

function tipCurve(context: PartContext, tips: readonly Vector3[]): Mesh {
  const { curveSegments, curveRadius, curveSides } = SHEAR_ARROWS;
  const curve = new CatmullRomCurve3([...tips]);
  return partMesh(
    context,
    new TubeGeometry(curve, curveSegments, curveRadius, curveSides),
    'shearProfile',
  );
}

export class ShearProfilePart {
  readonly group = namedGroup('shearProfile');
  private readonly material: ShaderMaterial;

  constructor(context: PartContext) {
    const arrows = shearArrows(SHEAR_ARROWS.longest);
    this.material = registeredMaterial(context, 'shearProfile', arrowMaterial(SHEAR_ARROWS));
    const specs = arrows.map(({ height, length, rate }) => ({
      tail: [0, height, 0] as const,
      length,
      rate,
    }));
    const geometry = arrowGeometry(specs, SHEAR_ARROWS, 'upright');
    const tips = arrows.map(({ height, length }) => new Vector3(length, height, 0));
    this.group.add(
      new Mesh(context.tracker.track(geometry), this.material),
      mast(context),
      tipCurve(context, tips),
    );
    label(context, 'shearProfile', this.group, SHEAR_ARROWS.labelAt);
  }

  place(spacing: SpacingD, turn: number): void {
    const [x, z] = shearProfileAt(spacing);
    this.group.position.set(x, terrainHeight(x, z), z);
    this.group.rotation.y = turn;
  }

  advance(metres: number): void {
    advanceArrows(this.material, metres);
  }
}
