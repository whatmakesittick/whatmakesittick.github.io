import type { Mesh, Object3D } from 'three';
import { IMAGE_PLANE } from '../model';
import type { OpticalLayout } from '../model';
import type { PartId } from '../state';
import { IMAGE_DISC_LIFT } from './constants';
import { createCondenser } from './parts/condenser';
import type { CondenserPart } from './parts/condenser';
import type { PartContext } from './parts/context';
import { createEye } from './parts/eye';
import type { EyePart } from './parts/eye';
import { createEyepiece } from './parts/eyepiece';
import type { EyepiecePart } from './parts/eyepiece';
import { createFocusKnobs } from './parts/focusKnobs';
import type { FocusKnobsPart } from './parts/focusKnobs';
import { createImageDisc, setDiscRadius } from './parts/imageDisc';
import { createLamp } from './parts/lamp';
import type { LampPart } from './parts/lamp';
import { LightPathPart } from './parts/lightPath';
import { Nosepiece } from './parts/nosepiece';
import { createOilDrop } from './parts/oilDrop';
import type { OilDropPart } from './parts/oilDrop';
import { createStage } from './parts/stage';
import type { StagePart } from './parts/stage';
import { createStand } from './parts/stand';
import type { StandPart } from './parts/stand';
import { createTube } from './parts/tube';
import type { TubePart } from './parts/tube';
import type { SpecimenTexture } from './specimenTexture';

export interface Cutaway {
  setCutaway(cutaway: boolean): void;
}

export interface MicroscopeParts {
  stand: StandPart;
  lamp: LampPart;
  condenser: CondenserPart;
  stage: StagePart;
  nosepiece: Nosepiece;
  tube: TubePart;
  eyepiece: EyepiecePart;
  eye: EyePart;
  knobs: FocusKnobsPart;
  oil: OilDropPart;
  light: LightPathPart;
  image: Mesh;
}

function intermediateImage(
  context: PartContext,
  specimen: SpecimenTexture,
  layout: OpticalLayout,
): Mesh {
  const height = IMAGE_PLANE + IMAGE_DISC_LIFT;
  const disc = createImageDisc(context, 'intermediateImage', specimen.turned, height);
  setDiscRadius(disc, Math.abs(layout.imageHeight));
  return disc;
}

export function createParts(
  context: PartContext,
  specimen: SpecimenTexture,
  layout: OpticalLayout,
): MicroscopeParts {
  return {
    stand: createStand(context),
    lamp: createLamp(context),
    condenser: createCondenser(context),
    stage: createStage(context, specimen.upright),
    nosepiece: new Nosepiece(context),
    tube: createTube(context),
    eyepiece: createEyepiece(context),
    eye: createEye(context, specimen.upright),
    knobs: createFocusKnobs(context),
    oil: createOilDrop(context),
    light: new LightPathPart(context, layout),
    image: intermediateImage(context, specimen, layout),
  };
}

export function partAnchors(parts: MicroscopeParts): ReadonlyMap<PartId, Object3D> {
  const { lamp, condenser, stage, nosepiece, tube, eyepiece, eye, knobs } = parts;
  return new Map<PartId, Object3D>([
    ['lamp', lamp.anchors.lamp],
    ['fieldDiaphragm', lamp.anchors.fieldDiaphragm],
    ['condenser', condenser.anchors.condenser],
    ['irisDiaphragm', condenser.anchors.irisDiaphragm],
    ['stage', stage.anchors.stage],
    ['specimen', stage.anchors.specimen],
    ['objective', nosepiece.anchors.objective],
    ['nosepiece', nosepiece.anchors.nosepiece],
    ['tube', tube.anchor],
    ['intermediateImage', eyepiece.anchors.intermediateImage],
    ['eyepiece', eyepiece.anchors.eyepiece],
    ['eye', eye.anchors.eye],
    ['retina', eye.anchors.retina],
    ['focusKnob', knobs.anchor],
  ]);
}

export function cutawayParts(parts: MicroscopeParts): readonly Cutaway[] {
  const { stand, lamp, condenser, stage, nosepiece, tube, eyepiece, eye } = parts;
  return [stand, lamp, condenser, stage, nosepiece, tube, eyepiece, eye];
}
