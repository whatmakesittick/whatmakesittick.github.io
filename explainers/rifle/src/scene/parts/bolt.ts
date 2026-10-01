import { Group } from 'three';
import { BOLT } from '../../model/layout';
import type { Box } from '../../model/scale';
import {
  BEVELS,
  BOLT_BODY,
  BOLT_LUGS,
  CAM_LUG,
  EXTRACTOR_SHAPE,
  FIRING_PIN,
  RAMMER,
  SEGMENTS,
} from '../constants';
import { roundedBox, solid, turnedPiece } from '../geometry/pieces';
import { turnStrands } from '../geometry/turned';
import type { TurnStrand } from '../geometry/turned';
import { addPiece, markDynamic } from './context';
import type { PartContext } from './context';

const { rear, stemEnd, radius, stemRadius, chamfer, pinBore, window } = BOLT_BODY;
const FACE = BOLT.x[1];

const HEAD: TurnStrand[] = [
  [
    [window[1], radius],
    [FACE - chamfer, radius],
  ],
  [
    [FACE - chamfer, radius],
    [FACE, radius - chamfer],
  ],
  [
    [FACE, radius - chamfer],
    [FACE, pinBore],
  ],
  [
    [FACE, pinBore],
    [window[1], pinBore],
  ],
  [
    [window[1], pinBore],
    [window[1], radius],
  ],
];

const MIDDLE: TurnStrand[] = [
  [
    [window[0], radius],
    [window[1], radius],
  ],
  [
    [window[1], pinBore],
    [window[0], pinBore],
  ],
];

const STEM: TurnStrand[] = [
  [
    [rear, pinBore],
    [rear, stemRadius],
  ],
  [
    [rear, stemRadius],
    [stemEnd, radius],
  ],
  [
    [stemEnd, radius],
    [window[0], radius],
  ],
  [
    [window[0], radius],
    [window[0], pinBore],
  ],
  [
    [window[0], pinBore],
    [rear, pinBore],
  ],
];

const PIN: TurnStrand[] = [
  [
    [rear - FIRING_PIN.tail, 0],
    [rear - FIRING_PIN.tail, FIRING_PIN.radius],
  ],
  [
    [rear - FIRING_PIN.tail, FIRING_PIN.radius],
    [FACE - FIRING_PIN.tipRecess - 0.5, FIRING_PIN.radius],
  ],
  [
    [FACE - FIRING_PIN.tipRecess - 0.5, FIRING_PIN.radius],
    [FACE - FIRING_PIN.tipRecess, FIRING_PIN.radius - 0.6],
  ],
  [
    [FACE - FIRING_PIN.tipRecess, FIRING_PIN.radius - 0.6],
    [FACE - FIRING_PIN.tipRecess, 0],
  ],
];

function lug(side: number): Box {
  const z =
    side > 0
      ? ([BOLT_LUGS.inner, BOLT.radius] as const)
      : ([-BOLT.radius, -BOLT_LUGS.inner] as const);
  return { x: BOLT_LUGS.x, y: [-BOLT_LUGS.halfWidth, BOLT_LUGS.halfWidth], z };
}

export class BoltPart {
  readonly object = new Group();
  readonly features = new Group();
  readonly pin = new Group();

  constructor(context: PartContext) {
    const { looks } = context;
    const segments = SEGMENTS.tube;
    addPiece(context, this.object, solid(turnStrands(HEAD, segments)), 'bolt', looks.bright);
    addPiece(context, this.object, solid(turnStrands(STEM, segments)), 'bolt', looks.bright);
    addPiece(
      context,
      this.object,
      turnedPiece({
        strands: MIDDLE,
        segments,
        cap: [
          [window[0], pinBore],
          [window[0], radius],
          [window[1], radius],
          [window[1], pinBore],
        ],
      }),
      'bolt',
      looks.bright,
    );
    addPiece(context, this.pin, solid(turnStrands(PIN, SEGMENTS.rod)), 'firingPin', looks.steel);
    for (const box of [lug(1), lug(-1), CAM_LUG, RAMMER]) {
      addPiece(context, this.features, solid(roundedBox(box, BEVELS.round)), 'bolt', looks.bright);
    }
    for (const box of [EXTRACTOR_SHAPE.bar, EXTRACTOR_SHAPE.claw]) {
      addPiece(
        context,
        this.features,
        solid(roundedBox(box, BEVELS.fine)),
        'extractor',
        looks.steel,
      );
    }
    this.object.add(this.pin, this.features);
    markDynamic(this.object);
  }

  set(travel: number, angle: number, pinPush: number): void {
    this.object.position.x = -travel;
    this.features.rotation.x = angle;
    this.pin.position.x = pinPush;
  }
}
