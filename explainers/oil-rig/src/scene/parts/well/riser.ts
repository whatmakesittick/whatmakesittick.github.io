import { Group } from 'three';
import type { BufferGeometry, ColorRepresentation, Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { tubularRadius } from '../../../model/scale';
import { ANCHOR_LIFT, HULL, RISER, SEGMENTS } from '../../constants';
import { PAINT } from '../../finishes';
import { rodGeometry } from '../../geometry/bars';
import { mergePainted } from '../../geometry/merge';
import { BACK_HALF, FRONT_HALF, FULL_ARC, tubeGeometry } from '../../geometry/tubes';
import type { TubeArc, TubeSpec } from '../../geometry/tubes';
import { tubeWall } from '../../geometry/wellColumn';
import { partMesh } from '../context';
import type { PartContext } from '../context';
import { BOP_TOP } from './bop';

type Painted = readonly [BufferGeometry, ColorRepresentation];

interface Ring {
  outer: number;
  inner: number;
  bottom: number;
  top: number;
  color: ColorRepresentation;
  cut: ColorRepresentation;
}

const RISER_OUTER = tubularRadius(RISER.inches);
const RISER_INNER = RISER_OUTER - tubeWall(RISER.inches);
const BUOYANCY_OUTER = tubularRadius(RISER.buoyancyInches);
const BUOYANCY_INNER = RISER.lineOffset + RISER.lineRadius + RISER.moduleClearance;
const LABEL_Y = -60;
const LABEL_SHARE = 0.72;
const WIRE_SEGMENTS = 4;

function pieces(ring: Ring, arc: TubeArc): Painted[] {
  const spec: TubeSpec = { ...ring, segments: SEGMENTS.halfTube, arc, faces: { cuts: false } };
  const body: Painted = [tubeGeometry(spec), ring.color];
  if (arc !== BACK_HALF) return [body];
  const cuts = tubeGeometry({
    ...spec,
    faces: { outer: false, inner: false, caps: false, cuts: true },
  });
  return [body, [cuts, ring.cut]];
}

function modules(): Ring[] {
  const rings: Ring[] = [];
  const step = RISER.moduleLength + RISER.moduleGap;
  for (
    let top = RISER.buoyancyTopY;
    top - RISER.moduleLength >= RISER.buoyancyBottomY;
    top -= step
  ) {
    rings.push({
      outer: BUOYANCY_OUTER,
      inner: BUOYANCY_INNER,
      bottom: top - RISER.moduleLength,
      top,
      color: PAINT.buoyancy,
      cut: PAINT.foam,
    });
    rings.push({
      outer: RISER.flangeRadius,
      inner: RISER_OUTER,
      bottom: top - RISER.moduleLength - RISER.moduleGap / 2 - RISER.flangeHeight / 2,
      top: top - RISER.moduleLength - RISER.moduleGap / 2 + RISER.flangeHeight / 2,
      color: PAINT.darkSteel,
      cut: PAINT.darkSteel,
    });
  }
  return rings;
}

function blockRings(): Ring[] {
  const { innerBarrel } = RISER;
  return [
    {
      outer: RISER_OUTER,
      inner: RISER_INNER,
      bottom: BOP_TOP,
      top: innerBarrel.bottom,
      color: PAINT.riser,
      cut: PAINT.riserCut,
    },
    {
      outer: innerBarrel.radius,
      inner: RISER_INNER,
      bottom: innerBarrel.bottom,
      top: innerBarrel.top,
      color: PAINT.steel,
      cut: PAINT.riserCut,
    },
    ...modules(),
  ];
}

function lines(): Painted[] {
  return [-1, 1].map((side): Painted => {
    const x = side * RISER.lineOffset;
    return [
      rodGeometry(
        [x, BOP_TOP, 0],
        [x, RISER.innerBarrel.bottom, 0],
        RISER.lineRadius,
        SEGMENTS.rod,
      ),
      PAINT.darkSteel,
    ];
  });
}

function rigPieces(): Painted[] {
  const { outerBarrel, tensioner, diverter } = RISER;
  const ringBottom = tensioner.y - tensioner.height / 2;
  const ringTop = tensioner.y + tensioner.height / 2;
  const wires = Array.from({ length: tensioner.wires }, (_, index): Painted => {
    const angle = (index / tensioner.wires) * Math.PI * 2;
    const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
    return [
      rodGeometry(
        [tensioner.radius * cos, ringTop, tensioner.radius * sin],
        [tensioner.wireReach * cos, HULL.deck.underside, tensioner.wireReach * sin],
        tensioner.wireRadius,
        WIRE_SEGMENTS,
      ),
      PAINT.black,
    ];
  });
  return [
    ...pieces(
      {
        outer: outerBarrel.radius,
        inner: outerBarrel.radius - outerBarrel.wall,
        bottom: outerBarrel.bottom,
        top: outerBarrel.top,
        color: PAINT.riser,
        cut: PAINT.riser,
      },
      FULL_ARC,
    ),
    ...pieces(
      {
        outer: tensioner.radius,
        inner: outerBarrel.radius,
        bottom: ringBottom,
        top: ringTop,
        color: PAINT.darkSteel,
        cut: PAINT.darkSteel,
      },
      FULL_ARC,
    ),
    [
      rodGeometry([0, outerBarrel.top, 0], [0, diverter.bottom, 0], RISER_OUTER, SEGMENTS.tube),
      PAINT.riser,
    ],
    [
      rodGeometry([0, diverter.bottom, 0], [0, diverter.top, 0], diverter.radius, SEGMENTS.tube),
      PAINT.darkSteel,
    ],
    ...wires,
  ];
}

export class RiserPart {
  readonly blockObject = new Group();
  readonly rigObject = new Group();
  readonly anchor: Object3D;
  private readonly front: Group = new Group();

  constructor(context: PartContext) {
    const rings = blockRings();
    const section = mergePainted([...rings.flatMap((ring) => pieces(ring, BACK_HALF)), ...lines()]);
    const whole = mergePainted(rings.flatMap((ring) => pieces(ring, FRONT_HALF)));
    this.front.add(partMesh(context, whole, 'riser', 'riser'));
    this.blockObject.add(partMesh(context, section, 'riser', 'riser'), this.front);
    this.rigObject.add(partMesh(context, mergePainted(rigPieces()), 'riser', 'riser'));
    this.anchor = anchorAt(this.blockObject, BUOYANCY_OUTER * LABEL_SHARE, LABEL_Y, ANCHOR_LIFT);
  }

  setVisible(visible: boolean): void {
    this.blockObject.visible = visible;
    this.rigObject.visible = visible;
  }

  setCutaway(cutaway: boolean): void {
    this.front.visible = !cutaway;
  }
}
