import { Group, Matrix4 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { CROWN_WHEEL_CENTRE } from '../../../model/layout';
import { WINDING } from '../../../model/train';
import { ANCHOR_LIFT_MM, CROWN_WHEEL, SEGMENTS, WINDING_SAW } from '../../constants';
import { extrudeOutline } from '../../geometry/extrude';
import { sawProfile, toothPitch } from '../../geometry/gear';
import { merge } from '../../geometry/merge';
import { polarDeg } from '../../geometry/outline';
import { disc, ring } from '../../geometry/solids';
import { finishMesh, partMesh } from '../context';
import type { PartContext } from '../context';

const ORIGIN = { x: 0, y: 0 };
const LABEL_DEG = 20;
const RADIAL_FROM_EXTRUSION = new Matrix4().set(0, 0, 1, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1);

function contrateTooth(angle: number): BufferGeometry {
  const { skirt, contrate } = CROWN_WHEEL;
  const pitch = toothPitch(WINDING.crownWheelTeeth) * ((skirt.inner + skirt.outer) / 2);
  const root = (pitch * contrate.rootShare) / 2;
  const tip = (pitch * contrate.tipShare) / 2;
  const outline = [
    { x: -root, y: skirt.bottom },
    { x: -tip, y: contrate.tipZ },
    { x: tip, y: contrate.tipZ },
    { x: root, y: skirt.bottom },
  ];
  const tooth = extrudeOutline(outline, 0, skirt.outer - skirt.inner);
  tooth.applyMatrix4(RADIAL_FROM_EXTRUSION);
  tooth.translate(skirt.inner, 0, 0);
  tooth.rotateZ(angle);
  return tooth;
}

function bodyGeometry(phase: number): BufferGeometry {
  const { skirt, post, boss, disc: level } = CROWN_WHEEL;
  const pitch = toothPitch(WINDING.crownWheelTeeth);
  const teeth = Array.from({ length: WINDING.crownWheelTeeth }, (_, index) =>
    contrateTooth(phase + pitch * (index + 0.5)),
  );
  return merge([
    ring(ORIGIN, skirt.inner, skirt.outer, [skirt.bottom, level[0]], SEGMENTS.disc),
    disc({ ...ORIGIN, r: post.radius }, post.span, SEGMENTS.hub),
    disc({ ...ORIGIN, r: boss.radius }, boss.span, SEGMENTS.hub),
    ...teeth,
  ]);
}

export class CrownWheelPart {
  readonly object = new Group();
  readonly label: Object3D;

  constructor(context: PartContext, frame: Object3D, phase: number) {
    const centre = CROWN_WHEEL_CENTRE;
    const level = CROWN_WHEEL.disc;
    this.object.position.set(centre.x, centre.y, 0);
    const outline = sawProfile(
      WINDING.crownWheelTeeth,
      WINDING.crownWheelRadiusMm,
      WINDING_SAW,
      phase,
    );
    const finish = context.surfaces.sunray(WINDING.crownWheelRadiusMm);
    this.object.add(
      finishMesh(context, extrudeOutline(outline, level[0], level[1]), 'crownWheel', finish),
      partMesh(context, bodyGeometry(phase), 'crownWheel', 'steel'),
    );
    frame.add(this.object);
    const at = polarDeg(centre, WINDING.crownWheelRadiusMm - WINDING_SAW.depth, LABEL_DEG);
    this.label = anchorAt(frame, at.x, at.y, level[1] + ANCHOR_LIFT_MM);
  }

  setAngle(degrees: number): void {
    this.object.rotation.z = toRadians(degrees);
  }
}
