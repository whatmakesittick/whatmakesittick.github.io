import { Group } from 'three';
import type { Object3D } from 'three';
import { toRadians } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import { BALANCE_CENTRE, HAIRSPRING } from '../../../model/layout';
import { LEVELS } from '../../../model/scale';
import { ANCHOR_LIFT_MM, HAIRSPRING_RIBBON } from '../../constants';
import { polarDeg } from '../../geometry/outline';
import { RibbonGeometry } from '../../geometry/ribbon';
import type { RibbonSection } from '../../geometry/ribbon';
import { chained } from '../../geometry/spiral';
import type { SpiralSegment } from '../../geometry/spiral';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const FULL_CIRCLE = Math.PI * 2;
const INNER_KINK = 0.5;
const REST_SWEEP = HAIRSPRING.coils * FULL_CIRCLE;
const TERMINAL_START = toRadians(HAIRSPRING_RIBBON.terminalStartDeg);
const TERMINAL_SWEEP = toRadians(
  HAIRSPRING_RIBBON.terminalEndDeg - HAIRSPRING_RIBBON.terminalStartDeg,
);
const STUD_SWEEP = toRadians(HAIRSPRING_RIBBON.studDeg - HAIRSPRING_RIBBON.terminalEndDeg);
const HAND = HAIRSPRING_RIBBON.hand;
const REST_INNER = TERMINAL_START - HAND * (REST_SWEEP + INNER_KINK);

const SECTION: RibbonSection = {
  halfWidth: HAIRSPRING_RIBBON.halfWidth,
  bottom: LEVELS.hairspring[0],
  top: LEVELS.hairspring[1],
};

export function hairspringSegments(balanceDeg: number): SpiralSegment[] {
  const turn = toRadians(balanceDeg);
  return chained({ radius: HAIRSPRING_RIBBON.colletRadius, angle: REST_INNER + turn }, [
    {
      toRadius: HAIRSPRING.innerRadiusMm,
      sweep: HAND * INNER_KINK,
      samples: HAIRSPRING_RIBBON.innerSamples,
    },
    {
      toRadius: HAIRSPRING.outerRadiusMm,
      sweep: HAND * REST_SWEEP - turn,
      samples: HAIRSPRING_RIBBON.spiralSamples,
    },
    {
      toRadius: HAIRSPRING.outerRadiusMm,
      sweep: TERMINAL_SWEEP,
      samples: HAIRSPRING_RIBBON.terminalSamples,
    },
    {
      toRadius: HAIRSPRING.studRadiusMm,
      sweep: STUD_SWEEP,
      samples: HAIRSPRING_RIBBON.studSamples,
    },
  ]);
}

export class HairspringPart {
  readonly object = new Group();
  readonly label: Object3D;
  private readonly ribbon: RibbonGeometry;
  private balanceDeg = Number.NaN;

  constructor(context: PartContext, frame: Object3D) {
    this.ribbon = new RibbonGeometry(hairspringSegments(0));
    const mesh = partMesh(context, this.ribbon.geometry, 'hairspring', 'blued');
    mesh.frustumCulled = false;
    this.object.position.set(BALANCE_CENTRE.x, BALANCE_CENTRE.y, 0);
    this.object.add(mesh);
    frame.add(this.object);
    const at = polarDeg(BALANCE_CENTRE, HAIRSPRING.outerRadiusMm, HAIRSPRING_RIBBON.labelDeg);
    this.label = anchorAt(frame, at.x, at.y, LEVELS.hairspring[1] + ANCHOR_LIFT_MM);
    this.setBalanceAngle(0);
  }

  setBalanceAngle(degrees: number): void {
    if (degrees === this.balanceDeg) return;
    this.balanceDeg = degrees;
    this.ribbon.write(hairspringSegments(degrees), SECTION);
  }
}
