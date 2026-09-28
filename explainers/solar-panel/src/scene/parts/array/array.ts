import { Group } from 'three';
import { HERO_PANEL_INDEX, HINGE, PANEL_COUNT, panelCentreX } from '../../../model';
import { FINISHES } from '../../finishes';
import { pivotLean, railOffsets } from '../../geometry/tiltFrame';
import type { PartContext } from '../context';
import { HeroPanelPart } from '../hero/heroPanel';
import { moduleFaceTexture } from './cellTextures';
import { createGroundMounting, createPanelRails, mountingGroup } from './mounting';
import { createPlainModule } from './plainModule';
import { StrutPart } from './strut';

export class ArrayPart {
  readonly object = new Group();
  readonly pivots: readonly Group[];
  readonly hero: HeroPanelPart;
  private readonly struts: StrutPart[] = [];

  constructor(context: PartContext) {
    const face = { ...FINISHES.cellFront, map: context.tracker.track(moduleFaceTexture()) };
    this.hero = new HeroPanelPart(context);
    this.pivots = Array.from({ length: PANEL_COUNT }, (_, index) => {
      const pivot = new Group();
      pivot.position.set(panelCentreX(index), HINGE.y, HINGE.z);
      const module =
        index === HERO_PANEL_INDEX ? this.hero.object : createPlainModule(context, face);
      pivot.add(createPanelRails(context, index), module);
      railOffsets().forEach((offset) => {
        const strut = new StrutPart(context, mountingGroup(index), panelCentreX(index) + offset);
        this.struts.push(strut);
        this.object.add(strut.object);
      });
      return pivot;
    });
    this.object.add(createGroundMounting(context), ...this.pivots);
  }

  get heroPivot(): Group {
    return this.pivots[HERO_PANEL_INDEX];
  }

  setTilt(tiltDeg: number): void {
    const lean = pivotLean(tiltDeg);
    this.pivots.forEach((pivot) => {
      pivot.rotation.x = lean;
      pivot.updateMatrix();
    });
    this.struts.forEach((strut) => strut.setTilt(tiltDeg));
  }
}
