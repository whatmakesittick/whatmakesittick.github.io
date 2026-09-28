import { CylinderGeometry, Group, MeshBasicMaterial, PlaneGeometry } from 'three';
import type { CanvasTexture, Mesh, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { anchorAt } from '@core/scene/parts';
import { INVERTER } from '../../../model';
import { ANCHOR_LIFT_CM, FACE_RELIEF, INVERTER_BODY } from '../../constants';
import { FINISHES } from '../../finishes';
import { around, block } from '../../geometry/blocks';
import { mergeParts } from '../../geometry/merge';
import { finishMesh, partMesh, registeredMesh } from '../context';
import type { PartContext } from '../context';
import { powerDisplayTexture, showPower } from './display';

const ROUNDED_SEGMENTS = 3;
const QUARTER_TURN = Math.PI / 2;
const RUNNING_WATTS = 0.5;
const GLAND_SEGMENTS = 10;

const WALL_X = INVERTER.position.x;
const FRONT_X = WALL_X + INVERTER.size.depth;
const BOTTOM_Y = INVERTER.position.y - INVERTER.size.height / 2;

export const INVERTER_GLANDS = {
  y: BOTTOM_Y - INVERTER_BODY.glands.length,
  x: WALL_X + INVERTER.size.depth / 2,
  dc: INVERTER_BODY.glands.dc.map((offset) => INVERTER.position.z + offset),
  ac: INVERTER_BODY.glands.ac.map((offset) => INVERTER.position.z + offset),
} as const;

function body(): RoundedBoxGeometry {
  const { width, height, depth } = INVERTER.size;
  const geometry = new RoundedBoxGeometry(
    depth,
    height,
    width,
    ROUNDED_SEGMENTS,
    INVERTER_BODY.radius,
  );
  geometry.translate(WALL_X + depth / 2, INVERTER.position.y, INVERTER.position.z);
  return geometry;
}

function fins() {
  const { count, depth, thickness, inset } = INVERTER_BODY.fins;
  const { width, height } = INVERTER.size;
  const pieces = [];
  for (const side of [-1, 1]) {
    const face = INVERTER.position.z + (side * width) / 2;
    for (let index = 0; index < count; index += 1) {
      const y = BOTTOM_Y + inset + ((height - 2 * inset) * index) / (count - 1);
      pieces.push(
        block(
          [WALL_X + INVERTER_BODY.finInset, FRONT_X - INVERTER_BODY.finInset],
          around(y, thickness),
          side > 0 ? [face, face + depth] : [face - depth, face],
        ),
      );
    }
  }
  return mergeParts(pieces);
}

function glands() {
  const { radius, length } = INVERTER_BODY.glands;
  const pieces = [...INVERTER_GLANDS.dc, ...INVERTER_GLANDS.ac].map((z) => {
    const gland = new CylinderGeometry(radius, radius, length, GLAND_SEGMENTS);
    gland.translate(INVERTER_GLANDS.x, BOTTOM_Y - length / 2, z);
    return gland;
  });
  return mergeParts(pieces);
}

export class InverterPart {
  readonly object = new Group();
  readonly anchor: Object3D;
  private readonly display: CanvasTexture;
  private readonly led: Mesh;
  private readonly context: PartContext;
  private shownWatts = -1;

  constructor(context: PartContext) {
    this.context = context;
    const { display, led, stripe } = INVERTER_BODY;
    this.display = context.tracker.track(powerDisplayTexture());
    const screen = new PlaneGeometry(display.width, display.height);
    screen.rotateY(QUARTER_TURN);
    screen.translate(
      FRONT_X + FACE_RELIEF.screen,
      INVERTER.position.y + display.y,
      INVERTER.position.z,
    );
    const screenMaterial = new MeshBasicMaterial({ map: this.display, toneMapped: false });
    this.led = finishMesh(
      context,
      block(
        [FRONT_X - FACE_RELIEF.sink, FRONT_X + FACE_RELIEF.led],
        around(INVERTER.position.y + led.y, led.size),
        around(INVERTER.position.z + led.z, led.size),
      ),
      'inverter',
      FINISHES.ledOff,
    );
    this.object.add(
      partMesh(context, body(), 'inverter', 'inverter'),
      partMesh(context, fins(), 'inverter', 'inverterFront'),
      partMesh(context, glands(), 'inverter', 'connector'),
      partMesh(
        context,
        block(
          [FRONT_X - FACE_RELIEF.sink, FRONT_X + FACE_RELIEF.stripe],
          around(INVERTER.position.y + stripe.y, stripe.height),
          around(INVERTER.position.z, INVERTER.size.width - 2 * INVERTER_BODY.radius),
        ),
        'inverter',
        'brand',
      ),
      registeredMesh(context, screen, 'inverter', screenMaterial),
      this.led,
    );
    this.anchor = anchorAt(
      this.object,
      FRONT_X + ANCHOR_LIFT_CM,
      INVERTER.position.y,
      INVERTER.position.z,
    );
  }

  setPower(watts: number): void {
    const rounded = Math.round(watts);
    if (rounded !== this.shownWatts) {
      this.shownWatts = rounded;
      showPower(this.display, rounded);
    }
    const running = watts > RUNNING_WATTS;
    this.led.material = this.context.materials.get(
      'inverter',
      running ? FINISHES.ledGreen : FINISHES.ledOff,
    );
  }
}
