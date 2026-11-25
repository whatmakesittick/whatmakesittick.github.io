import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { FigureBody } from '@core/figure/body/figureBody';
import type { FigureRig } from '@core/figure/body/figureRig';
import { RestFrame, attachToJoint } from '@core/figure/body/restFrame';
import type { Steps } from '@core/scene/pacing';
import type { GroupId } from '../../../ids';
import type { RunnerFigure } from '../../runnerSlot';
import type { PartContext } from '../context';
import { RunnerPartBuilder } from './build';
import { GARMENT_COLORS } from './finishes';
import type { RunnerFinish } from './finishes';
import {
  CAP_LABEL_ATTRIBUTE,
  CAP_LABEL_CHANNELS,
  capLabelFields,
  capLabelTexture,
} from './garments/capLabel';
import { CLOTH_CHANNELS, clothField } from './garments/cloth';
import { CHANNELS, runnerFields } from './garments/fields';
import type { RunnerFields } from './garments/fields';
import { regionOf } from './body/probe';
import { GARMENT_ATTRIBUTES, applyGarments } from './garments/paint';
import { brimGeometry, buttonGeometry } from './head/brim';
import { applyLensSheen } from './head/lensSheen';
import { frameGeometries, lensGeometry } from './head/sunglasses';
import { RUNNER_CLOTH, RUNNER_EXTRA, applySkin, createShoeFrames } from './body/skinShader';
import type { ShoeFrames } from './body/skinShader';
import { restPosed } from './body/restPose';
import { PART_RULES } from './partRules';
import { Runner } from './runner';
import { Shoe, shoeShapes } from './shoes/shoe';
import type { SkeletonCache } from './skeletons';
import { caseGeometry, glassGeometry, strapGeometry, watchPlace } from './watch';

const HEAD_JOINT = 'c_head';
const HEAD_TOP = 'c_head_null';
const HEAD_REACH_M = 0.17;
const WATCH_JOINT = 'l_wrist';
const WRIST_REACH_M = 0.12;

interface Accessory {
  readonly geometry: BufferGeometry;
  readonly group: GroupId;
  readonly finish: RunnerFinish;
}

function accessoryGroup(
  builder: RunnerPartBuilder,
  name: string,
  parts: readonly Accessory[],
): Group {
  const group = new Group();
  group.name = name;
  parts.forEach(({ geometry, group: part, finish }) => builder.mesh(geometry, part, finish, group));
  return group;
}

interface BodyInputs {
  readonly fields: RunnerFields;
  readonly cloth: Float32Array;
  readonly capLabel: Float32Array;
  readonly shoeFrames: ShoeFrames;
}

function body(builder: RunnerPartBuilder, rig: FigureRig, inputs: BodyInputs): FigureBody {
  const { fields, cloth, capLabel, shoeFrames } = inputs;
  const label = capLabelTexture();
  if (label) builder.track(label);
  return new FigureBody({
    figure: rig.figure,
    toRig: rig.toRig,
    partRules: PART_RULES,
    attributes: [
      { name: GARMENT_ATTRIBUTES.distances, data: fields.distances, itemSize: CHANNELS },
      { name: GARMENT_ATTRIBUTES.extents, data: fields.extents, itemSize: CHANNELS },
      { name: RUNNER_EXTRA, data: fields.extra, itemSize: CHANNELS },
      { name: RUNNER_CLOTH, data: cloth, itemSize: CLOTH_CHANNELS },
      { name: CAP_LABEL_ATTRIBUTE, data: capLabel, itemSize: CAP_LABEL_CHANNELS },
    ],
    track: (item) => builder.track(item),
    materialOf: (part) =>
      applySkin(
        applyGarments(
          builder.material(part, 'skin'),
          builder.swatches(part, GARMENT_COLORS),
          label,
        ),
        shoeFrames,
      ),
  });
}

function follow(rig: FigureRig, frame: RestFrame, joint: string, object: Object3D): () => void {
  return attachToJoint(rig.figure, frame, joint, object, rig.toRig);
}

export function* buildRunner(
  context: PartContext,
  rig: FigureRig,
  skeletons: SkeletonCache,
): Steps<RunnerFigure> {
  const builder = new RunnerPartBuilder(context);
  const root = new Group();
  root.name = 'runner';
  const rest = restPosed(rig.figure);
  const frame = new RestFrame(rig.figure);
  yield;
  const shoeFrames = createShoeFrames();
  const fields = runnerFields(rest, frame, PART_RULES);
  yield;
  const cloth = clothField(rest, frame, fields);
  yield;
  const capLabel = capLabelFields(rest, frame);
  yield;
  const figureBody = body(builder, rig, { fields, cloth, capLabel, shoeFrames });
  root.add(figureBody.mesh);
  yield;
  const shapes = yield* shoeShapes();
  const shoes = {
    right: new Shoe(builder, 'right', shapes),
    left: new Shoe(builder, 'left', shapes),
  };
  root.add(shoes.right.group, shoes.left.group);
  yield;
  const face = regionOf(
    rest,
    frame.joint(HEAD_JOINT).lerp(frame.joint(HEAD_TOP), 0.5),
    HEAD_REACH_M,
  );
  const head = accessoryGroup(builder, 'headwear', [
    { geometry: brimGeometry(face, frame), group: 'head', finish: 'brim' },
    { geometry: buttonGeometry(face, frame), group: 'head', finish: 'brim' },
    { geometry: lensGeometry(face, frame), group: 'head', finish: 'lens' },
    ...frameGeometries(face, frame).map((geometry) => ({
      geometry,
      group: 'head' as const,
      finish: 'frame' as const,
    })),
  ]);
  applyLensSheen(builder.material('head', 'lens'));
  yield;
  const wrist = regionOf(rest, frame.joint(WATCH_JOINT), WRIST_REACH_M);
  const place = watchPlace(wrist, frame);
  const watch = accessoryGroup(builder, 'watch', [
    { geometry: strapGeometry(wrist, place), group: 'arm', finish: 'strap' },
    { geometry: caseGeometry(wrist, place), group: 'arm', finish: 'watchCase' },
    { geometry: glassGeometry(wrist, place), group: 'arm', finish: 'watchGlass' },
  ]);
  root.add(head, watch);
  const followers = [follow(rig, frame, HEAD_JOINT, head), follow(rig, frame, place.joint, watch)];
  yield;
  return new Runner({ root, rig, body: figureBody, skeletons, shoes, followers, shoeFrames });
}
