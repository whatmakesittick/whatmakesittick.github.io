import { Group } from 'three';
import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { EYEPIECE_IDS, IMAGE_PLANE, TUBE_TOP, eyepieceFocalLength, eyepieceTop } from '../../model';
import type { EyepieceId } from '../../model';
import { EYEPIECE, SEGMENTS } from '../constants';
import { FINISHES } from '../finishes';
import { cutSection, ringSection } from '../geometry/lathe';
import type { Section } from '../geometry/lathe';
import { cutShell } from './context';
import type { CutShell, PartContext } from './context';
import { glassLens } from './glassLens';

export interface EyepiecePart {
  object: Group;
  anchors: { eyepiece: Object3D; intermediateImage: Object3D };
  setCutaway(cutaway: boolean): void;
  setEyepiece(eyepiece: EyepieceId): void;
}

function boreSection(top: number): Section {
  const { insertInner, insertDepth, bodyInner, eyecupHeight, eyecupInner } = EYEPIECE;
  const eyecupBottom = top - eyecupHeight;
  return [
    [eyecupInner, top],
    [eyecupInner, eyecupBottom],
    [bodyInner, eyecupBottom],
    [bodyInner, TUBE_TOP],
    [insertInner, TUBE_TOP],
    [insertInner, TUBE_TOP - insertDepth],
  ];
}

function barrelSection(top: number): Section {
  const { insertOuter, insertDepth, bodyOuter, flangeHeight, flangeRadius } = EYEPIECE;
  const flangeTop = TUBE_TOP + flangeHeight;
  return [
    [insertOuter, TUBE_TOP - insertDepth],
    [insertOuter, TUBE_TOP],
    [flangeRadius, TUBE_TOP],
    [flangeRadius, flangeTop],
    [bodyOuter, flangeTop],
    [bodyOuter, top],
    ...boreSection(top),
  ];
}

function fieldStopSection(): Section {
  const half = EYEPIECE.fieldStopThickness / 2;
  return ringSection(
    EYEPIECE.fieldStop,
    EYEPIECE.insertInner,
    IMAGE_PLANE - half,
    IMAGE_PLANE + half,
  );
}

function createVariant(context: PartContext, eyepiece: EyepieceId): CutShell {
  const top = eyepieceTop(eyepiece);
  const barrel = cutShell(
    context,
    cutSection(barrelSection(top), SEGMENTS.round, { lining: boreSection(top) }),
    'eyepiece',
    FINISHES.rubber,
  );
  const stop = cutShell(
    context,
    cutSection(fieldStopSection(), SEGMENTS.round),
    'eyepiece',
    FINISHES.rubber,
  );
  const lens = glassLens(
    context,
    'eyepiece',
    { radius: EYEPIECE.lensRadius, thickness: EYEPIECE.lensThickness },
    IMAGE_PLANE + eyepieceFocalLength(eyepiece),
  );
  const object = new Group();
  object.add(barrel.object, stop.object, lens);
  return {
    object,
    setCut: (cut) => {
      barrel.setCut(cut);
      stop.setCut(cut);
    },
  };
}

export function createEyepiece(context: PartContext): EyepiecePart {
  const variants = new Map(EYEPIECE_IDS.map((id) => [id, createVariant(context, id)]));
  const object = new Group();
  variants.forEach((variant) => object.add(variant.object));
  return {
    object,
    anchors: {
      eyepiece: anchorAt(object, 0, TUBE_TOP + EYEPIECE.labelDrop, EYEPIECE.bodyOuter),
      intermediateImage: anchorAt(object, 0, IMAGE_PLANE, 0),
    },
    setCutaway: (cutaway) => variants.forEach((variant) => variant.setCut(cutaway)),
    setEyepiece: (eyepiece) =>
      variants.forEach((variant, id) => (variant.object.visible = id === eyepiece)),
  };
}
