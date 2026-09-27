import { Group, Vector2 } from 'three';
import type { Mesh, Object3D, Texture } from 'three';
import { anchorAt } from '@core/scene/parts';
import { EYE_FOCAL_LENGTH_MM } from '../../model';
import { EYE, IMAGE_DISC_LIFT, SEGMENTS } from '../constants';
import { FINISHES } from '../finishes';
import { BACK_HALF, cutSphere, latheUpright } from '../geometry/lathe';
import { cutShell, partMesh } from './context';
import type { PartContext } from './context';
import { glassLens } from './glassLens';
import { createImageDisc, setDiscRadius } from './imageDisc';

export interface EyePart {
  object: Group;
  anchors: { eye: Object3D; retina: Object3D };
  setCutaway(cutaway: boolean): void;
  place(lensHeight: number, retinaHeight: number): void;
}

const SPHERE_STEPS = 24;
const RETINA_STEPS = 10;

function retinaCap(context: PartContext): Mesh {
  const radius = EYE.radius - EYE.retinaInset;
  const planeAboveCenter = EYE_FOCAL_LENGTH_MM - EYE.centerAboveLens;
  const edge = Math.acos(planeAboveCenter / radius);
  const arc = Array.from({ length: RETINA_STEPS + 1 }, (_, index) => {
    const angle = edge * (1 - index / RETINA_STEPS);
    return new Vector2(radius * Math.sin(angle), EYE.centerAboveLens + radius * Math.cos(angle));
  });
  return partMesh(context, latheUpright(arc, SEGMENTS.round, BACK_HALF), 'retina', 'retina');
}

export function createEye(context: PartContext, retinaImage: Texture): EyePart {
  const sclera = cutShell(
    context,
    cutSphere(EYE.radius, SPHERE_STEPS, SEGMENTS.round),
    'eye',
    FINISHES.sclera,
  );
  sclera.object.position.y = EYE.centerAboveLens;
  const lens = glassLens(context, 'eye', { radius: EYE.lensRadius, thickness: EYE.lensThickness });
  const disc = createImageDisc(
    context,
    'retina',
    retinaImage,
    EYE_FOCAL_LENGTH_MM - IMAGE_DISC_LIFT,
  );
  const object = new Group();
  object.add(sclera.object, lens, retinaCap(context), disc);
  return {
    object,
    anchors: {
      eye: anchorAt(object, 0, EYE.centerAboveLens, EYE.radius),
      retina: anchorAt(object, 0, EYE_FOCAL_LENGTH_MM, 0),
    },
    setCutaway: (cutaway) => sclera.setCut(cutaway),
    place: (lensHeight, retinaHeight) => {
      object.position.y = lensHeight;
      setDiscRadius(disc, retinaHeight);
    },
  };
}
