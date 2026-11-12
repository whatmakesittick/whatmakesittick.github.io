import type { Steps } from '@core/scene/pacing';
import type { AssemblyState } from '../../ids';
import { ANCHOR_POINTS, WAFER } from '../../model/layout';
import { label, namedGroup, sceneAnchor } from './context';
import type { PartContext, Section } from './context';
import { MASK_AT, MASK_LABEL, PELLICLE_Y, PLATE_HALF, WAFER_AT, WAFER_LABEL } from './stages/dims';
import { CloseUp } from './light/closeUp';
import { buildMaskBand } from './stages/band';
import { buildMask, buildPellicle } from './stages/mask';
import { buildMaskModule } from './stages/maskModule';
import { buildMaskStage } from './stages/maskStage';
import { buildSlit } from './stages/slit';
import { buildWafer } from './stages/wafer';
import { buildWaferStage } from './stages/waferStage';

const PELLICLE_LABEL_Z = 0.0575;

export function* buildStages(context: PartContext): Steps<Section> {
  const root = namedGroup('stages');
  const fixed = namedGroup('stagesFixed', root);
  const maskCarriage = namedGroup('maskCarriage', root);
  const maskBend = namedGroup('maskBend', root);
  const module = buildMaskModule(context, root);
  yield;
  buildMaskStage(context, { fixed, carriage: maskCarriage, bend: maskBend });
  const band = buildMaskBand(context, fixed);
  yield;
  buildMask(context, maskCarriage);
  buildPellicle(context, maskCarriage);
  label(context, 'maskStage', maskCarriage, MASK_LABEL);
  label(context, 'mask', maskCarriage, [MASK_AT[0], MASK_AT[1], MASK_AT[2] + PLATE_HALF]);
  label(context, 'pellicle', maskCarriage, [MASK_AT[0], PELLICLE_Y, PELLICLE_LABEL_Z]);
  yield;
  const waferCarriage = namedGroup('waferCarriage', root);
  const waferBend = namedGroup('waferBend', root);
  buildWaferStage(context, { fixed, carriage: waferCarriage, bend: waferBend });
  yield;
  const wafer = buildWafer(context, waferCarriage);
  const slit = buildSlit(context, fixed);
  label(context, 'waferStage', waferCarriage, WAFER_LABEL);
  label(context, 'wafer', waferCarriage, [
    WAFER_AT[0],
    WAFER_AT[1],
    WAFER_AT[2] + WAFER.diameterM / 2,
  ]);
  sceneAnchor(context, 'mask', fixed, ANCHOR_POINTS.mask);
  sceneAnchor(context, 'wafer', fixed, ANCHOR_POINTS.wafer);
  const closeUp = new CloseUp();
  yield;
  return {
    root,
    setState(state: AssemblyState) {
      maskCarriage.position.x = state.scan.maskOffsetM;
      maskBend.position.x = state.scan.maskOffsetM / 2;
      waferCarriage.position.x = state.scan.waferOffsetM;
      waferBend.position.x = state.scan.waferOffsetM / 2;
      wafer.update(state);
      slit.setState(state);
      band.setState(state);
      module.setState(state);
    },
    animate(frame) {
      if (!closeUp.follow(frame.cameraDistance)) return false;
      slit.fit(closeUp.factor);
      band.fit(closeUp.factor);
      return true;
    },
    warmUp(compile) {
      slit.warmUp(compile);
      band.warmUp(compile);
      compile(wafer.strip);
    },
  };
}
