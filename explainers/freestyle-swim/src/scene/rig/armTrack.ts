import { Vector3 } from 'three';
import { toRadians } from '@core/math';
import { PHASE_IDS } from '../../ids';
import type { ArmId, BreathId, PaceId } from '../../ids';
import { phaseAt, phaseBounds } from '../../model/phases';
import type { PhaseBounds } from '../../model/phases';
import { CYCLE_UNITS, wrapUnits } from '../../model/playback';
import { LEFT_ARM_OFFSET_UNITS, armAt, shoulderRollDegAt } from '../../model/stroke';
import { SIDE, constructArm, createArmPose, placeShoulder } from './arm';
import type { ArmPose } from './arm';
import { ARM_TRACK, BODY } from './constants';

export interface ArmSetup {
  readonly pace: PaceId;
  readonly breathing: BreathId;
  readonly rootY: number;
}

interface ArmKey {
  at: number;
  readonly channels: readonly Vector3[];
}

const ARM_OFFSET_UNITS: Readonly<Record<ArmId, number>> = {
  right: 0,
  left: LEFT_ARM_OFFSET_UNITS,
};
const TANGENT_LIMIT = 3;
const CHANNEL = { reach: 0, upper: 1, handAxis: 2, palm: 3 } as const;
const CHANNEL_COUNT = 4;
const NEIGHBOURS = 4;
const MIN_CHORD = 1e-6;

const scratch = createArmPose();
const neighbours: readonly ArmKey[] = Array.from({ length: NEIGHBOURS }, createKey);
const blended: readonly Vector3[] = Array.from({ length: CHANNEL_COUNT }, () => new Vector3());
const chordIn = new Vector3();
const chordOut = new Vector3();
const tangentFrom = new Vector3();
const tangentTo = new Vector3();
const forearm = new Vector3();

function createKey(): ArmKey {
  return { at: 0, channels: Array.from({ length: CHANNEL_COUNT }, () => new Vector3()) };
}

function unitsAtClock(clock: number, bounds: PhaseBounds): number {
  const phase = Math.floor(clock);
  const [start, end] = bounds[PHASE_IDS[phase]];
  return start + (clock - phase) * (end - start);
}

function clockAt(armUnits: number, pace: PaceId): number {
  const { phase, progress } = phaseAt(armUnits, pace);
  return PHASE_IDS.indexOf(phase) + progress;
}

function readKey(key: ArmKey, at: number, pose: number, id: ArmId, setup: ArmSetup): void {
  const { pace, breathing, rootY } = setup;
  const rollDeg = shoulderRollDegAt(at + ARM_OFFSET_UNITS[id], pace, breathing);
  constructArm(scratch, armAt(pose, pace), SIDE[id], toRadians(rollDeg), rootY);
  key.at = at;
  key.channels[CHANNEL.reach].subVectors(scratch.wrist, scratch.shoulder);
  key.channels[CHANNEL.upper].subVectors(scratch.elbow, scratch.shoulder).normalize();
  key.channels[CHANNEL.handAxis].copy(scratch.handAxis);
  key.channels[CHANNEL.palm].copy(scratch.palm);
}

function readNeighbours(armUnits: number, id: ArmId, setup: ArmSetup): void {
  const bounds = phaseBounds(setup.pace);
  const times = ARM_TRACK.map(([at]) => unitsAtClock(at, bounds));
  const count = times.length;
  const next = times.findIndex((time) => armUnits < time);
  const segment = (next === -1 ? count : next) - 1;
  neighbours.forEach((key, slot) => {
    const index = segment - 1 + slot;
    const turns = Math.floor(index / count);
    const wrapped = index - turns * count;
    const shift = turns * CYCLE_UNITS;
    const pose = unitsAtClock(ARM_TRACK[wrapped][1], bounds) + shift;
    readKey(key, times[wrapped] + shift, pose, id, setup);
  });
}

function slope(out: Vector3, from: Vector3, to: Vector3, span: number, channel: number): Vector3 {
  out.subVectors(to, from);
  const chord = out.length();
  if (channel === CHANNEL.reach || chord < MIN_CHORD) return out.divideScalar(span);
  const arc = 2 * Math.asin(Math.min(chord / 2, 1));
  return out.multiplyScalar(arc / chord / span);
}

function tangent(
  out: Vector3,
  before: ArmKey,
  at: ArmKey,
  after: ArmKey,
  channel: number,
): Vector3 {
  const spanIn = at.at - before.at;
  const spanOut = after.at - at.at;
  slope(chordIn, before.channels[channel], at.channels[channel], spanIn, channel);
  slope(chordOut, at.channels[channel], after.channels[channel], spanOut, channel);
  out
    .copy(chordIn)
    .multiplyScalar(spanOut)
    .addScaledVector(chordOut, spanIn)
    .divideScalar(spanIn + spanOut);
  return out.clampLength(0, TANGENT_LIMIT * Math.min(chordIn.length(), chordOut.length()));
}

function blend(out: Vector3, armUnits: number, channel: number): Vector3 {
  const [before, from, to, after] = neighbours;
  const span = to.at - from.at;
  const t = (armUnits - from.at) / span;
  const t2 = t * t;
  const t3 = t2 * t;
  tangent(tangentFrom, before, from, to, channel);
  tangent(tangentTo, from, to, after, channel);
  out
    .copy(from.channels[channel])
    .multiplyScalar(2 * t3 - 3 * t2 + 1)
    .addScaledVector(tangentFrom, (t3 - 2 * t2 + t) * span)
    .addScaledVector(to.channels[channel], -2 * t3 + 3 * t2)
    .addScaledVector(tangentTo, (t3 - t2) * span);
  return channel === CHANNEL.reach ? out : out.normalize();
}

export function solveArm(pose: ArmPose, id: ArmId, units: number, setup: ArmSetup): void {
  const { pace, breathing } = setup;
  const armUnits = wrapUnits(units - ARM_OFFSET_UNITS[id]);
  readNeighbours(armUnits, id, setup);
  blended.forEach((value, channel) => blend(value, armUnits, channel));
  const rollRad = toRadians(shoulderRollDegAt(units, pace, breathing));
  placeShoulder(pose.shoulder, clockAt(armUnits, pace), SIDE[id], rollRad);
  pose.elbow.copy(pose.shoulder).addScaledVector(blended[CHANNEL.upper], BODY.upperArm);
  forearm
    .copy(blended[CHANNEL.reach])
    .addScaledVector(blended[CHANNEL.upper], -BODY.upperArm)
    .setLength(BODY.forearm);
  pose.wrist.addVectors(pose.elbow, forearm);
  pose.handAxis.copy(blended[CHANNEL.handAxis]);
  pose.palm
    .copy(blended[CHANNEL.palm])
    .addScaledVector(pose.handAxis, -blended[CHANNEL.palm].dot(pose.handAxis))
    .normalize();
  pose.hand.copy(pose.wrist).addScaledVector(pose.handAxis, BODY.hand / 2);
}
