import { AdditiveBlending, Color, Vector3 } from 'three';
import type { Object3D } from 'three';
import { clamp } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState, Point } from '../../../ids';
import { AIRWAY, NOSTRILS, OLFACTORY_BULB, SMELL_PATCH } from '../../../model/layout';
import { RECEPTOR_TYPES } from '../../../model/receptorCodes';
import { THEME } from '../../../theme';
import { tongueLiftCm } from '../../pose';
import { registeredMaterial } from '../context';
import type { PartContext, Section } from '../context';
import { AromaStream } from '../stream';
import type { StreamLook } from '../stream';
import { buildAnatomy } from './anatomy';
import type { HeadAnatomy } from './anatomy';
import { NoseClip } from './clip';
import { SpoonAndBite } from './spoon';

const STREAM_BASE = {
  size: 1.5,
  wobble: 1.6,
  fadeIn: 0.08,
  fadeOut: 0.12,
} as const;

const MOUTH_STREAM: StreamLook = {
  ...STREAM_BASE,
  perOdorant: 18,
  width: 0.45,
  speed: 0.35,
  gain: 3.2,
  seed: 11,
};

const RETRO_STREAM: StreamLook = {
  ...STREAM_BASE,
  perOdorant: 30,
  width: 0.38,
  speed: 0.22,
  gain: 3.2,
  seed: 23,
};

const ORTHO_STREAM: StreamLook = {
  ...STREAM_BASE,
  perOdorant: 30,
  width: 0.35,
  speed: 0.3,
  gain: 2.4,
  seed: 37,
};

const STREAM_Z = -0.5;
const PATCH_ARRIVAL: Point = [SMELL_PATCH.centre[0] - 0.4, SMELL_PATCH.centre[1] - 0.6, STREAM_Z];

const MOUTH_PATH: readonly Point[] = [
  [4.3, -0.55, STREAM_Z],
  [3.1, -0.75, STREAM_Z],
  [2.2, -1.5, STREAM_Z],
  [1.2, -1.6, STREAM_Z],
];

const RETRO_PATH: readonly Point[] = [
  [1.15, -1.6, STREAM_Z],
  [0.9, 0.2, STREAM_Z],
  [AIRWAY.top[0] - 0.3, AIRWAY.top[1], STREAM_Z],
  [2.1, 3.7, STREAM_Z],
  [3.3, 4.35, STREAM_Z],
  PATCH_ARRIVAL,
];
const RETRO_PINCHED_STOP = 0.42;

const ORTHO_ENTRY: readonly Point[] = [
  [NOSTRILS[0] + 0.15, NOSTRILS[1] - 0.9, 0.3],
  [NOSTRILS[0], NOSTRILS[1] - 0.1, -0.2],
  [9.1, 2.6, STREAM_Z],
  [7.5, 4, STREAM_Z],
  PATCH_ARRIVAL,
];
const ORTHO_RISE = 0.7;
const ORTHO_PINCHED_STOP = 0.38;

const GLOW = {
  patchGain: 6,
  patchMax: 2.4,
  bulbMax: 1.6,
  firingGain: 3,
  haloSize: 7,
  patchHalo: 0.85,
  bulbHalo: 0.6,
  bulbPulse: 0.45,
  pulseRate: 9,
  ease: 5,
  settled: 0.003,
} as const;

const HALO_SPOTS: readonly Point[] = [
  [SMELL_PATCH.centre[0], SMELL_PATCH.centre[1] - 0.45, -0.3],
  [OLFACTORY_BULB[0], OLFACTORY_BULB[1], 0.4],
];

function points(list: readonly Point[]): Vector3[] {
  return list.map((point) => new Vector3(...point));
}

class HeadWorld implements Section {
  readonly root: Object3D;
  private readonly anatomy: HeadAnatomy;
  private readonly spoonAndBite: SpoonAndBite;
  private readonly clip: NoseClip;
  private readonly mouth: AromaStream;
  private readonly retro: AromaStream;
  private readonly ortho: AromaStream;
  private readonly glowColour = new Color(THEME.firing);
  private readonly orthoPath = points([[0, 0, 0], [0, 0, 0], ...ORTHO_ENTRY]);
  private readonly mouthPath = points([[0, 0, 0], ...MOUTH_PATH]);
  private readonly halos: PointCloud;
  private bulbGlow = 0;
  private patchTarget = 0;
  private patchShown = 0;
  private firstState = true;

  constructor(context: PartContext, root: Object3D) {
    this.root = root;
    this.anatomy = buildAnatomy(context, root);
    this.spoonAndBite = new SpoonAndBite(context, root, this.anatomy.tongue);
    this.clip = new NoseClip(context, root);
    this.mouth = new AromaStream(context, root, 'aromaCloud', MOUTH_STREAM);
    this.retro = new AromaStream(context, root, 'aromaCloud', RETRO_STREAM);
    this.ortho = new AromaStream(context, root, 'aromaCloud', ORTHO_STREAM);
    this.retro.setPath(points(RETRO_PATH));
    this.anatomy.patch.emissive.copy(this.glowColour);
    this.anatomy.bulb.emissive.copy(this.glowColour);
    this.halos = new PointCloud(
      HALO_SPOTS.length,
      registeredMaterial(
        context,
        'smellPatch',
        createPointMaterial(context.textures.glow, GLOW.haloSize, AdditiveBlending),
      ),
    );
    HALO_SPOTS.forEach((spot, index) => this.halos.setPoint(index, ...spot));
    context.tracker.track(this.halos);
    root.add(this.halos.points);
  }

  setState(state: AssemblyState): void {
    const { reading, view } = state;
    this.anatomy.tongue.position.y = tongueLiftCm(reading.seconds);
    this.spoonAndBite.setState(state);
    const bite = this.spoonAndBite.bite.position;
    this.mouthPath[0].copy(bite);
    this.mouth.setPath(this.mouthPath);
    this.mouth.setLevels(reading.mouth);
    this.orthoPath[0].copy(bite);
    this.orthoPath[1].set(bite.x + 0.1, bite.y + ORTHO_RISE, bite.z * 0.7);
    this.ortho.setPath(this.orthoPath);
    this.ortho.setLevels(reading.ortho, view.pinched ? ORTHO_PINCHED_STOP : 1);
    this.retro.setLevels(reading.retro, view.pinched ? RETRO_PINCHED_STOP : 1);
    this.clip.setPinched(view.pinched, this.firstState);
    this.patchTarget = clamp(reading.noseShare * GLOW.patchGain, 0, 1);
    if (this.firstState) this.patchShown = this.patchTarget;
    const firing = clamp((reading.firing / RECEPTOR_TYPES) * GLOW.firingGain, 0, 1);
    const pulse = 1 - GLOW.bulbPulse + GLOW.bulbPulse * Math.sin(reading.seconds * GLOW.pulseRate);
    this.bulbGlow = firing * pulse;
    this.anatomy.bulb.emissiveIntensity = GLOW.bulbMax * this.bulbGlow;
    this.firstState = false;
    this.applyPatch();
  }

  update(deltaSeconds: number): boolean {
    const streams = [this.mouth, this.retro, this.ortho].map((stream) =>
      stream.update(deltaSeconds),
    );
    const clip = this.clip.update(deltaSeconds);
    const gap = this.patchTarget - this.patchShown;
    this.patchShown += gap * Math.min(1, deltaSeconds * GLOW.ease);
    this.applyPatch();
    return streams.some(Boolean) || clip || Math.abs(gap) > GLOW.settled;
  }

  private applyPatch(): void {
    this.anatomy.patch.emissiveIntensity = GLOW.patchMax * this.patchShown;
    const { r, g, b } = this.glowColour;
    this.halos.setColor(0, r, g, b, GLOW.patchHalo * this.patchShown);
    this.halos.setColor(1, r, g, b, GLOW.bulbHalo * this.bulbGlow);
    this.halos.commit();
  }
}

export function buildHeadWorld(context: PartContext, root: Object3D): Section {
  return new HeadWorld(context, root);
}
