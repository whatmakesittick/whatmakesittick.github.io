import type { Steps } from '@core/scene/pacing';
import type { AssemblyState } from '../../ids';
import { ANCHOR_POINTS, WAFER } from '../../model/layout';
import { label, namedGroup, sceneAnchor } from './context';
import type { PartContext, Section } from './context';
import {
  MASK_AT,
  MASK_ORIGIN,
  MASK_PLATE_HALF,
  PELLICLE,
  PELLICLE_REL_Y,
  WAFER_CARRIAGE,
  WAFER_ORIGIN,
  WAFER_AT,
} from './stages/dims';
import { buildMask, buildPellicle } from './stages/mask';
import { buildMaskStage } from './stages/maskStage';
import { buildSlit } from './stages/slit';
import { buildWafer } from './stages/wafer';
import { buildWaferStage } from './stages/waferStage';

const LABEL_LIFT = 0.01;
const WAFER_FRONT_Y = 0.23;
const MASK_STAGE_LABEL: readonly [number, number, number] = [0, 0.25, 0.3];

export function* buildStages(context: PartContext): Steps<Section> {
  const root = namedGroup('stages');
  const fixed = namedGroup('stagesFixed', root);
  const maskCarriage = namedGroup('maskCarriage', root);
  const maskBend = namedGroup('maskBend', root);
  buildMaskStage(context, { fixed, carriage: maskCarriage, bend: maskBend });
  yield;
  buildMask(context, maskCarriage);
  buildPellicle(context, maskCarriage);
  label(context, 'maskStage', maskCarriage, [
    MASK_ORIGIN[0] + MASK_STAGE_LABEL[0],
    MASK_ORIGIN[1] + MASK_STAGE_LABEL[1] + LABEL_LIFT,
    MASK_ORIGIN[2] + MASK_STAGE_LABEL[2],
  ]);
  label(context, 'mask', maskCarriage, [MASK_AT[0], MASK_AT[1], MASK_AT[2] + MASK_PLATE_HALF]);
  label(context, 'pellicle', maskCarriage, [
    MASK_AT[0],
    MASK_ORIGIN[1] + PELLICLE_REL_Y,
    PELLICLE.z / 2,
  ]);
  yield;
  const waferCarriage = namedGroup('waferCarriage', root);
  const waferBend = namedGroup('waferBend', root);
  buildWaferStage(context, { fixed, carriage: waferCarriage, bend: waferBend });
  yield;
  const wafer = buildWafer(context, waferCarriage);
  const slit = buildSlit(context, fixed);
  label(context, 'waferStage', waferCarriage, [
    WAFER_ORIGIN[0],
    WAFER_ORIGIN[1] + WAFER_FRONT_Y,
    WAFER_ORIGIN[2] + WAFER_CARRIAGE.halfX,
  ]);
  label(context, 'wafer', waferCarriage, [
    WAFER_AT[0],
    WAFER_AT[1],
    WAFER_AT[2] + WAFER.diameterM / 2,
  ]);
  sceneAnchor(context, 'mask', fixed, ANCHOR_POINTS.mask);
  sceneAnchor(context, 'wafer', fixed, ANCHOR_POINTS.wafer);
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
    },
    warmUp(compile) {
      slit.warmUp(compile);
      compile(wafer.strip);
    },
  };
}
