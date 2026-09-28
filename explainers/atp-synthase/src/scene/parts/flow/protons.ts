import { Group } from 'three';
import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { BLADE_COUNTS } from '../../../model/rotor';
import { PUMP_IDS } from '../../../model/scale';
import { THEME } from '../../../theme';
import { CROWD, PROTON_FORM, PUMPED_FLOW, PUMP_LANES } from '../../constants';
import { FINISHES } from '../../finishes';
import { createCrowd, poseCrowd } from '../../flow/crowd';
import type { Crowd } from '../../flow/crowd';
import { beadPose, setPolar } from '../../flow/points';
import { channelSpots, poseEntering, poseLeaving, posePumped, poseRider } from '../../flow/protons';
import type { ChannelSpots } from '../../flow/protons';
import { pumpPeriodDeg } from '../../flow/rates';
import { streamProgress, streamSlots } from '../../flow/stream';
import { ringLayout } from '../../geometry/ringLayout';
import type { RingLayout } from '../../geometry/ringLayout';
import { seededRandom } from '../../geometry/random';
import type { PartContext } from '../context';
import { GlowBeads } from './glowBeads';

export interface ProtonMotion {
  rotorDeg: number;
  clockDeg: number;
  bladeCount: number;
  ringBlurred: boolean;
  calm: number;
  presence: number;
}

interface RingPaths {
  readonly layout: RingLayout;
  readonly spots: ChannelSpots;
}

const FRONT_DEG = 270;
const MAX_BLADES = Math.max(...Object.values(BLADE_COUNTS));
const PER_BLADE_KINDS = 3;

function pumpSlots(): number {
  return Math.max(
    ...Object.values(BLADE_COUNTS).map((bladeCount) =>
      PUMP_IDS.reduce(
        (sum, pump) => sum + streamSlots(pumpPeriodDeg(pump, bladeCount), PUMPED_FLOW.travelDeg),
        0,
      ),
    ),
  );
}

export class ProtonsPart {
  readonly object = new Group();
  readonly label: Object3D;
  private readonly beads: GlowBeads;
  private readonly crowd: Crowd;
  private readonly paths = new Map<number, RingPaths>();
  private readonly pose = beadPose();
  private readonly pumpedStart = MAX_BLADES * PER_BLADE_KINDS;
  private readonly crowdStart: number;

  constructor(context: PartContext) {
    this.crowd = createCrowd([CROWD.below, CROWD.above], seededRandom(CROWD.seed));
    this.crowdStart = this.pumpedStart + pumpSlots();
    this.beads = new GlowBeads(context, 'protons', this.crowdStart + this.crowd.count, {
      radius: PROTON_FORM.radius,
      haloSize: PROTON_FORM.haloSize,
      haloAlpha: PROTON_FORM.haloAlpha,
      color: THEME.proton,
      finish: FINISHES.proton,
    });
    this.object.add(this.beads.object);
    this.label = anchorAt(this.object, 0, 0, 0);
  }

  place(motion: ProtonMotion): void {
    const paths = this.pathsFor(motion.bladeCount);
    setPolar(this.label.position, FRONT_DEG, paths.layout.outerRadius + PROTON_FORM.lift, 0);
    this.placeBlades(motion, paths);
    this.placePumped(motion);
    this.placeCrowd(motion);
    this.beads.commit();
  }

  private placeBlades(motion: ProtonMotion, { layout, spots }: RingPaths): void {
    const { rotorDeg } = motion;
    for (let blade = 0; blade < MAX_BLADES; blade += 1) {
      const slot = blade * PER_BLADE_KINDS;
      if (blade >= layout.bladeCount) {
        this.hideBlade(slot);
        continue;
      }
      if (motion.ringBlurred) {
        this.hideBlade(slot);
        continue;
      }
      this.beads.set(slot, poseRider(blade, rotorDeg, layout, this.pose));
      this.beads.set(slot + 1, poseEntering(blade, rotorDeg, layout, spots, this.pose));
      this.beads.set(slot + 2, poseLeaving(blade, rotorDeg, layout, spots, this.pose));
    }
  }

  private hideBlade(slot: number): void {
    for (let kind = 0; kind < PER_BLADE_KINDS; kind += 1) this.beads.hide(slot + kind);
  }

  private placePumped(motion: ProtonMotion): void {
    let slot = this.pumpedStart;
    for (const pump of PUMP_IDS) {
      const period = pumpPeriodDeg(pump, motion.bladeCount);
      const slots = streamSlots(period, PUMPED_FLOW.travelDeg);
      for (let index = 0; index < slots; index += 1, slot += 1) {
        const progress = streamProgress(motion.clockDeg, period, PUMPED_FLOW.travelDeg, index);
        if (progress === null) this.beads.hide(slot);
        else
          this.beads.set(slot, posePumped(PUMP_LANES[pump], progress, this.pose), motion.presence);
      }
    }
    for (; slot < this.crowdStart; slot += 1) this.beads.hide(slot);
  }

  private placeCrowd(motion: ProtonMotion): void {
    for (let index = 0; index < this.crowd.count; index += 1) {
      const pose = poseCrowd(this.crowd, index, motion.clockDeg, motion.calm, this.pose);
      this.beads.set(this.crowdStart + index, pose);
    }
  }

  private pathsFor(bladeCount: number): RingPaths {
    let paths = this.paths.get(bladeCount);
    if (!paths) {
      const layout = ringLayout(bladeCount);
      paths = { layout, spots: channelSpots(layout) };
      this.paths.set(bladeCount, paths);
    }
    return paths;
  }
}
