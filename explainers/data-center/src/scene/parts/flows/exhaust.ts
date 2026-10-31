import type { Group } from 'three';
import { GENSET_STACK_TIPS } from '../campus/constants';
import type { OutageSample, PartContext } from '../context';
import { EXHAUST } from './constants';
import type { Cloud } from './points';
import { lifeOf, puffCloud } from './puffs';

const FADE_IN = 0.1;

export class Exhaust {
  private readonly cloud: Cloud;
  private readonly tips = GENSET_STACK_TIPS;

  constructor(context: PartContext, parent: Group) {
    this.cloud = puffCloud(context, 'generators', this.tips.length * EXHAUST.puffsPerStack);
    parent.add(this.cloud.object);
  }

  animate({ gensets, elapsed }: OutageSample): void {
    this.cloud.object.visible = gensets > 0;
    if (gensets <= 0) return;
    for (let index = 0; index < this.cloud.count; index += 1) {
      const [x, y, z] = this.tips[index % this.tips.length];
      const life = lifeOf(index, EXHAUST.puffsPerStack, elapsed * EXHAUST.rate);
      const strength = gensets * Math.min(life / FADE_IN, 1) * (1 - life);
      this.cloud.set(
        index,
        x + EXHAUST.drift * life,
        y + EXHAUST.rise * life * life,
        z,
        EXHAUST.tint,
        EXHAUST.alpha * strength,
        EXHAUST.size[0] + (EXHAUST.size[1] - EXHAUST.size[0]) * life,
      );
    }
    this.cloud.commit();
  }
}
