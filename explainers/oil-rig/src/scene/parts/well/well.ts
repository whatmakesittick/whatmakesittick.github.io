import { Group } from 'three';
import type { Object3D } from 'three';
import { clamp } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { depthToY, tubularRadius } from '../../../model/scale';
import { RISER_LANDED_DEPTH_M, SEABED_DEPTH_M, SECTIONS } from '../../../model/wellPlan';
import { ANCHOR_LIFT, STRING } from '../../constants';
import { annulusWall, holeAt, lastSetCasing } from '../../geometry/wellColumn';
import type { PartContext } from '../context';
import { BopPart, WellheadPart } from './bop';
import { CasingsPart } from './casings';
import type { CasingAnchorId } from './casings';
import { CompletionPart } from './completion';
import { HolePart } from './hole';
import { MoundPart } from './mound';
import { RiserPart } from './riser';

export interface WellDepth {
  depth: number;
  finished: boolean;
  landed: boolean;
}

export type WellAnchorId = 'riser' | 'bop' | 'wellhead' | 'annulus' | CasingAnchorId;

const ANNULUS_LABEL_M = 140;
const HOLE_LANE = 1 / 2;

function annulusAnchorX(): number {
  const depth = SEABED_DEPTH_M + ANNULUS_LABEL_M;
  const wall = annulusWall(depth, lastSetCasing(RISER_LANDED_DEPTH_M + 1));
  const pipe = tubularRadius(STRING.pipeInches);
  return pipe + (wall - pipe) * HOLE_LANE;
}

export class WellPart {
  readonly blockObject = new Group();
  readonly rigObject = new Group();
  readonly internals = new Group();
  readonly completion: CompletionPart;
  readonly anchors: Record<WellAnchorId, Object3D>;
  private readonly hole: HolePart;
  private readonly casings: CasingsPart;
  private readonly wellhead: WellheadPart;
  private readonly bop: BopPart;
  private readonly riser: RiserPart;
  private readonly mound: MoundPart;

  constructor(context: PartContext) {
    this.hole = new HolePart(context);
    this.casings = new CasingsPart(context);
    this.wellhead = new WellheadPart(context);
    this.bop = new BopPart(context);
    this.riser = new RiserPart(context);
    this.mound = new MoundPart(context);
    this.completion = new CompletionPart(context);
    this.internals.add(this.hole.object, this.casings.object, this.completion.blockObject);
    this.blockObject.add(
      this.internals,
      this.wellhead.object,
      this.bop.object,
      this.riser.blockObject,
      this.mound.object,
    );
    this.rigObject.add(this.riser.rigObject);
    const annulus = anchorAt(
      this.internals,
      annulusAnchorX(),
      depthToY(SEABED_DEPTH_M + ANNULUS_LABEL_M),
      ANCHOR_LIFT,
    );
    this.anchors = {
      riser: this.riser.anchor,
      bop: this.bop.anchor,
      wellhead: this.wellhead.anchor,
      annulus,
      conductor: this.casings.anchors.conductor ?? annulus,
      surfaceCasing: this.casings.anchors.surfaceCasing ?? annulus,
      intermediateCasing: this.casings.anchors.intermediateCasing ?? annulus,
    };
  }

  get bopAnchor(): Object3D {
    return this.bop.anchor;
  }

  setDepth({ depth, finished, landed }: WellDepth): void {
    const holeBottom = depthToY(Math.max(depth, SEABED_DEPTH_M));
    this.hole.setBottom(holeBottom, holeAt(depth).radius);
    this.hole.object.visible = depth > SEABED_DEPTH_M;
    this.casings.setDepth(depth, finished);
    this.wellhead.show(finished || depth > SECTIONS[0].shoeDepth, landed);
    this.bop.object.visible = landed;
    this.riser.setVisible(landed);
    const riserless = (depth - SEABED_DEPTH_M) / (RISER_LANDED_DEPTH_M - SEABED_DEPTH_M);
    this.mound.setGrowth(landed ? 0 : clamp(riserless, 0, 1));
    this.completion.setVisible(finished);
  }

  setCutaway(cutaway: boolean): void {
    this.internals.visible = cutaway;
    this.riser.setCutaway(cutaway);
    this.mound.setCutaway(cutaway);
  }
}
