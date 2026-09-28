import { Group } from 'three';
import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { BLADE_COUNTS, FULL_TURN_DEG } from '../../../model/rotor';
import { THEME } from '../../../theme';
import { ELECTRON_FORM } from '../../constants';
import { FINISHES } from '../../finishes';
import { poseElectron } from '../../flow/electrons';
import { beadPose } from '../../flow/points';
import { electronPeriodDeg } from '../../flow/rates';
import { streamProgress, streamSlots } from '../../flow/stream';
import type { PartContext } from '../context';
import { GlowBeads } from './glowBeads';

const TRAVEL_DEG = ELECTRON_FORM.travelLaps * FULL_TURN_DEG;
const LABEL_STOP = 2;

function slotsFor(bladeCount: number): number {
  return streamSlots(electronPeriodDeg(bladeCount), TRAVEL_DEG);
}

export class ElectronsPart {
  readonly object = new Group();
  readonly label: Object3D;
  private readonly beads: GlowBeads;
  private readonly pose = beadPose();

  constructor(context: PartContext) {
    const slots = Math.max(...Object.values(BLADE_COUNTS).map(slotsFor));
    this.beads = new GlowBeads(context, 'electrons', slots, {
      radius: ELECTRON_FORM.radius,
      haloSize: ELECTRON_FORM.haloSize,
      haloAlpha: ELECTRON_FORM.haloAlpha,
      color: THEME.electron,
      finish: FINISHES.electron,
    });
    this.object.add(this.beads.object);
    const { x, y, z } = ELECTRON_FORM.stops[LABEL_STOP];
    this.label = anchorAt(this.object, x, y, z);
  }

  place(clockDeg: number, bladeCount: number, presence: number): void {
    const period = electronPeriodDeg(bladeCount);
    for (let slot = 0; slot < this.beads.count; slot += 1) {
      const progress = streamProgress(clockDeg, period, TRAVEL_DEG, slot);
      if (progress === null) this.beads.hide(slot);
      else this.beads.set(slot, poseElectron(progress, this.pose), presence);
    }
    this.beads.commit();
  }
}
