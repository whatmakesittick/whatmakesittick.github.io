import { Group } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { Figure } from '@core/figure';
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
import { CHANNELS, runnerFields } from './garments/fields';
import { GARMENT_ATTRIBUTES, applyGarments } from './garments/paint';
import { brimGeometry, buttonGeometry } from './head/brim';
import { frameGeometries, lensGeometry } from './head/sunglasses';
import { RUNNER_EXTRA, applySkin } from './body/skinShader';
import { restPosed } from './body/restPose';
import { PART_RULES } from './partRules';
import { Runner } from './runner';
import { Shoe, shoeShapes } from './shoes/shoe';
import type { SkeletonCache } from './skeletons';
import { caseGeometry, glassGeometry, strapGeometry, watchPlace } from './watch';

const HEAD_JOINT = 'c_head';

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

function body(
  builder: RunnerPartBuilder,
  rig: FigureRig,
  rest: Figure,
  frame: RestFrame,
): FigureBody {
  const fields = runnerFields(rest, frame, PART_RULES);
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
      {
        name: CAP_LABEL_ATTRIBUTE,
        data: capLabelFields(rest, frame),
        itemSize: CAP_LABEL_CHANNELS,
      },
    ],
    track: (item) => builder.track(item),
    materialOf: (part) =>
      applySkin(
        applyGarments(
          builder.material(part, 'skin'),
          builder.swatches(part, GARMENT_COLORS),
          label,
        ),
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
  const figureBody = body(builder, rig, rest, frame);
  root.add(figureBody.mesh);
  yield;
  const shapes = shoeShapes();
  const shoes = {
    right: new Shoe(builder, 'right', shapes),
    left: new Shoe(builder, 'left', shapes),
  };
  root.add(shoes.right.group, shoes.left.group);
  yield;
  const head = accessoryGroup(builder, 'headwear', [
    { geometry: brimGeometry(rest, frame), group: 'head', finish: 'brim' },
    { geometry: buttonGeometry(rest, frame), group: 'head', finish: 'brim' },
    { geometry: lensGeometry(rest, frame), group: 'head', finish: 'lens' },
    ...frameGeometries(rest, frame).map((geometry) => ({
      geometry,
      group: 'head' as const,
      finish: 'frame' as const,
    })),
  ]);
  yield;
  const place = watchPlace(rest, frame);
  const watch = accessoryGroup(builder, 'watch', [
    { geometry: strapGeometry(rest, place), group: 'arm', finish: 'strap' },
    { geometry: caseGeometry(rest, place), group: 'arm', finish: 'watchCase' },
    { geometry: glassGeometry(rest, place), group: 'arm', finish: 'watchGlass' },
  ]);
  root.add(head, watch);
  const followers = [follow(rig, frame, HEAD_JOINT, head), follow(rig, frame, place.joint, watch)];
  yield;
  return new Runner({ root, rig, body: figureBody, skeletons, shoes, followers });
}
