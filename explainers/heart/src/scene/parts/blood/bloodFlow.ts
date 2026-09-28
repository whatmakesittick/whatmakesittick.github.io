import { Group } from 'three';
import { clamp } from '@core/math';
import { THEME } from '../../../theme';
import { BLOOD } from '../../constants';
import { arterialRoutes, venousRoutes } from '../../geometry/bloodRoutes';
import type { Contraction } from '../../geometry/contraction';
import type { PartContext } from '../context';
import { BloodStream } from './bloodStream';

export class BloodFlowPart {
  readonly object = new Group();
  readonly venous: BloodStream;
  readonly arterial: BloodStream;

  constructor(context: PartContext, motion: Contraction) {
    this.venous = new BloodStream(
      context,
      {
        routes: venousRoutes(BLOOD.route),
        count: BLOOD.count,
        colour: THEME.venous,
        seed: BLOOD.venousSeed,
      },
      motion,
    );
    this.arterial = new BloodStream(
      context,
      {
        routes: arterialRoutes(BLOOD.route),
        count: BLOOD.count,
        colour: THEME.arterial,
        seed: BLOOD.arterialSeed,
      },
      motion,
    );
    this.object.add(this.venous.points, this.arterial.points);
  }

  advance(elapsedMs: number, time: number): void {
    this.venous.advance(elapsedMs, time);
    this.arterial.advance(elapsedMs, time);
  }

  place(time: number, squeeze: number, emptying: number, cutaway: boolean): void {
    this.venous.place(time, squeeze, emptying, cutaway);
    this.arterial.place(time, squeeze, emptying, cutaway);
  }

  setShown(shown: boolean): void {
    this.object.visible = shown;
  }

  setCameraDistance(distance: number): void {
    const size = clamp(distance * BLOOD.sizePerDistance, BLOOD.minSize, BLOOD.maxSize);
    this.venous.setSize(size);
    this.arterial.setSize(size);
  }
}
