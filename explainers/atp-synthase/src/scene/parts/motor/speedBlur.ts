import { CylinderGeometry, Group, TorusGeometry } from 'three';
import type { Material } from 'three';
import { C_RING, spanLength } from '../../../model/scale';
import { PROTON_FORM, SPEED_BLUR } from '../../constants';
import { FINISHES } from '../../finishes';
import { ringLayout } from '../../geometry/ringLayout';
import { finishMesh } from '../context';
import type { PartContext } from '../context';
import { Variants } from '../variants';

const QUARTER_TURN = Math.PI / 2;

function band(radius: number, tube: number): TorusGeometry {
  const { tubeSegments, segments } = SPEED_BLUR;
  return new TorusGeometry(radius, tube, tubeSegments, segments).rotateX(QUARTER_TURN);
}

function easeShare(deltaSeconds: number): number {
  return 1 - Math.exp(-deltaSeconds / SPEED_BLUR.easeSeconds);
}

export class SpeedBlurPart {
  readonly object = new Group();
  private readonly context: PartContext;
  private readonly sleeves = new Group();
  private readonly protonBands = new Group();
  private readonly sleeveVariants: Variants<number>;
  private readonly protonVariants: Variants<number>;
  private readonly fades: readonly (readonly [Material, number])[];
  private amount = 0;

  constructor(context: PartContext, bladeCount: number) {
    this.context = context;
    const { materials } = context;
    this.fades = [
      [materials.get('cRing', FINISHES.blur), SPEED_BLUR.sleeveOpacity],
      [materials.get('cRing', FINISHES.blurredCarboxyl), SPEED_BLUR.bandOpacity],
      [materials.get('protons', FINISHES.blurredProtons), SPEED_BLUR.protonBandOpacity],
    ];
    this.sleeveVariants = new Variants(this.sleeves, (count) => this.buildSleeve(count));
    this.protonVariants = new Variants(this.protonBands, (count) => this.buildProtonBand(count));
    this.object.add(this.sleeves, this.protonBands);
    this.setBladeCount(bladeCount);
    this.applyAmount();
  }

  get ringBlurred(): boolean {
    return this.amount >= SPEED_BLUR.hideDetailAt;
  }

  get calm(): number {
    return this.amount;
  }

  setBladeCount(bladeCount: number): void {
    this.sleeveVariants.show(bladeCount);
    this.protonVariants.show(bladeCount);
  }

  setProtonsShown(shown: boolean): void {
    this.protonBands.visible = shown;
  }

  update(deltaSeconds: number, degreesPerSecond: number): boolean {
    const target = Math.abs(degreesPerSecond) > SPEED_BLUR.thresholdDegPerSecond ? 1 : 0;
    if (Math.abs(target - this.amount) < SPEED_BLUR.settled) {
      if (this.amount === target) return false;
      this.amount = target;
    } else {
      this.amount += (target - this.amount) * easeShare(deltaSeconds);
    }
    this.applyAmount();
    return true;
  }

  private applyAmount(): void {
    this.object.visible = this.amount > 0;
    this.fades.forEach(([material, opacity]) => {
      material.opacity = opacity * this.amount;
    });
  }

  private buildSleeve(bladeCount: number): Group {
    const layout = ringLayout(bladeCount);
    const { segments, sleeveGrow, carboxylTube } = SPEED_BLUR;
    const radius = layout.outerRadius + sleeveGrow;
    const sleeve = new CylinderGeometry(radius, radius, spanLength(C_RING.height), segments);
    const group = new Group();
    group.add(
      finishMesh(this.context, sleeve, 'cRing', FINISHES.blur),
      finishMesh(
        this.context,
        band(layout.carboxylRadius + carboxylTube, carboxylTube),
        'cRing',
        FINISHES.blurredCarboxyl,
      ),
    );
    return group;
  }

  private buildProtonBand(bladeCount: number): Group {
    const layout = ringLayout(bladeCount);
    const group = new Group();
    group.add(
      finishMesh(
        this.context,
        band(layout.outerRadius + PROTON_FORM.lift, SPEED_BLUR.protonTube),
        'protons',
        FINISHES.blurredProtons,
      ),
    );
    return group;
  }
}
