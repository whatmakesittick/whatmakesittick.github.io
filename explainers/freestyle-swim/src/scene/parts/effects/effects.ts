import type { Vector3 } from 'three';
import { Color, Group } from 'three';
import type { ArmId, AssemblyState } from '../../../ids';
import { ARM_IDS } from '../../../ids';
import { THEME } from '../../../theme';
import type { PartContext } from '../context';
import type { PoolFrame } from '../pool/constants';
import type { WaterCues } from '../pool/pool';
import { BowRipple } from './bow';
import { EffectClock } from './clock';
import { Particles } from './particles';
import { SplashRings } from './splash';
import { Wake } from './wake';

const RISE_FROM = 0.5;
const RISE_TO = 0.6;
const TRAIL_SECONDS = 0.35;
const BUBBLES_PER_SECOND = 32;
const DROPLETS_PER_ENTRY = 4;
const KICK_DOWNBEAT_PHASE = 0.1;
const BUBBLES_PER_KICK = 2;
const FOOT_SPREAD_M = 0.04;
const MAX_KICK_STEP = 0.5;

const HAND_CUE: Readonly<Record<ArmId, keyof WaterCues>> = { right: 'rightHand', left: 'leftHand' };
const TOE_CUE: Readonly<Record<ArmId, keyof WaterCues>> = { right: 'rightToe', left: 'leftToe' };

function crossed(previous: number, current: number, mark: number): boolean {
  const forward = (current - previous + 1) % 1;
  const toMark = (mark - previous + 1) % 1;
  return forward < MAX_KICK_STEP && toMark > 0 && toMark <= forward;
}

export class Effects {
  readonly root = new Group();
  private readonly clock = new EffectClock();
  private readonly rings: SplashRings;
  private readonly particles: Particles;
  private readonly bow: BowRipple;
  private readonly wake: Wake;
  private readonly previousKick: Record<ArmId, number> = { right: 0, left: 0 };
  private readonly previous: Record<ArmId, number> = { right: 0, left: 0 };
  private readonly trail: Record<ArmId, number> = { right: 0, left: 0 };
  private readonly released: Record<ArmId, number> = { right: 0, left: 0 };
  private playing = false;

  constructor(context: PartContext, frame: PoolFrame) {
    const foam = new Color(THEME.splash);
    this.rings = new SplashRings(context, frame, foam);
    this.particles = new Particles(context, foam);
    this.bow = new BowRipple(context, frame, foam);
    this.wake = new Wake(context, frame, foam);
    this.root.add(this.wake.mesh, this.bow.mesh, this.rings.mesh, this.particles.object);
  }

  get active(): boolean {
    return this.playing && (this.rings.alive || this.particles.alive);
  }

  sync(state: AssemblyState, cues: WaterCues): void {
    const { reading } = state;
    this.playing = state.playing;
    this.bow.setState(cues.head, reading.speedMs, state.headUp);
    this.wake.setState(cues.rightToe, cues.leftToe, reading.speedMs);
    const { seconds, scrubbed } = this.clock.step(reading.units, state.playing, state.pace);
    if (scrubbed) this.clear();
    else if (seconds > 0) this.run(state, cues, seconds);
    ARM_IDS.forEach((arm) => {
      this.previous[arm] = state.entrySplash[arm];
      this.previousKick[arm] = state.reading.legs[arm].phase;
    });
  }

  private clear(): void {
    this.rings.clear();
    this.particles.clear();
    ARM_IDS.forEach((arm) => (this.trail[arm] = 0));
  }

  private run(state: AssemblyState, cues: WaterCues, seconds: number): void {
    ARM_IDS.forEach((arm) => {
      const hand = cues[HAND_CUE[arm]];
      if (this.previous[arm] < RISE_FROM && state.entrySplash[arm] > RISE_TO) {
        this.enter(hand);
        this.trail[arm] = TRAIL_SECONDS;
      }
    });
    const drift = state.reading.speedMs * seconds;
    this.rings.advance(seconds, drift);
    this.particles.advance(seconds, drift);
    ARM_IDS.forEach((arm) => this.release(arm, cues[HAND_CUE[arm]], seconds));
    ARM_IDS.forEach((arm) => this.kick(arm, state.reading.legs[arm].phase, cues[TOE_CUE[arm]]));
  }

  private kick(arm: ArmId, phase: number, toe: Vector3): void {
    if (crossed(this.previousKick[arm], phase, KICK_DOWNBEAT_PHASE)) {
      for (let bubble = 0; bubble < BUBBLES_PER_KICK; bubble += 1)
        this.particles.bubble(toe.x, toe.y, toe.z + (Math.random() - 0.5) * FOOT_SPREAD_M);
    }
  }

  private enter(hand: Vector3): void {
    this.rings.spawn(hand.x, hand.z);
    for (let drop = 0; drop < DROPLETS_PER_ENTRY; drop += 1) this.particles.droplet(hand.x, hand.z);
  }

  private release(arm: ArmId, hand: Vector3, seconds: number): void {
    const active = Math.min(seconds, this.trail[arm]);
    this.trail[arm] -= active;
    this.released[arm] += active * BUBBLES_PER_SECOND;
    for (; this.released[arm] >= 1; this.released[arm] -= 1)
      this.particles.bubble(hand.x, hand.y, hand.z);
    if (this.trail[arm] <= 0) this.released[arm] = 0;
  }
}
