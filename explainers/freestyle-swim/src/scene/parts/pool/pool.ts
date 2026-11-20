import { Group, Object3D } from 'three';
import type { Vector3, Mesh } from 'three';
import type { Steps } from '@core/scene/pacing';
import type { AssemblyState } from '../../../ids';
import { createWaterSurface } from '../../water';
import type { WaterSurface } from '../../water';
import { Effects } from '../effects/effects';
import type { PartContext } from '../context';
import { LANE_LINE_LABEL_X, WATERLINE_LABEL, FLOOR_Y, scrollOffset } from './constants';
import type { PoolFrame } from './constants';
import { createFloor } from './floor';
import { createRopes } from './ropes';

const FULL_CYCLE_UNITS = 1000;
const HALF_TURN = Math.PI;

export interface WaterCues {
  readonly rightHand: Vector3;
  readonly leftHand: Vector3;
  readonly head: Vector3;
  readonly rightToe: Vector3;
  readonly leftToe: Vector3;
}

export interface Pool {
  readonly root: Group;
  readonly frame: PoolFrame;
  readonly anchors: Readonly<Record<'waterline' | 'laneRope' | 'laneLine', Object3D>>;
  setState(state: AssemblyState, cues: WaterCues): void;
  update(deltaSeconds: number): boolean;
}

function anchorAt(parent: Mesh | Object3D, x: number, y: number, z: number): Object3D {
  const anchor = new Object3D();
  anchor.position.set(x, y, z);
  parent.add(anchor);
  return anchor;
}

export function* buildPool(context: PartContext): Steps<Pool> {
  const frame: PoolFrame = { uScroll: { value: 0 }, uPhase: { value: 0 } };
  const root = new Group();
  const surface: WaterSurface = createWaterSurface(context, frame);
  root.add(surface.mesh);
  yield;
  const { floor, laneLine, neighbours } = createFloor(context, frame);
  root.add(floor, laneLine, neighbours);
  yield;
  const ropes = createRopes(context);
  root.add(ropes.root);
  yield;
  const effects = new Effects(context, frame);
  root.add(effects.root);
  const anchors = {
    waterline: anchorAt(surface.mesh, WATERLINE_LABEL.x, 0, WATERLINE_LABEL.z),
    laneRope: ropes.label,
    laneLine: anchorAt(laneLine, LANE_LINE_LABEL_X, FLOOR_Y, 0),
  };
  return {
    root,
    frame,
    anchors,
    setState(state, cues) {
      const { reading, view } = state;
      const offset = scrollOffset(reading.scrollM);
      ropes.scrolling.forEach((group) => (group.position.x = offset));
      frame.uPhase.value = (HALF_TURN * 2 * reading.units) / FULL_CYCLE_UNITS;
      surface.setState(view.underwater, reading.scrollM);
      surface.setContacts(cues);
      effects.sync(state, cues);
    },
    update(deltaSeconds) {
      const easing = surface.update(deltaSeconds);
      return effects.active || easing;
    },
  };
}
