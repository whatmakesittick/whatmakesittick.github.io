import { Group } from 'three';
import type { Mesh, Object3D } from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { anchorAt } from '@core/scene/parts';
import { METER, MODULE_SPEC } from '../../../model';
import { ANCHOR_LIFT_CM, METER_BODY } from '../../constants';
import { FINISHES } from '../../finishes';
import { around, block } from '../../geometry/blocks';
import { finishMesh, partMesh } from '../context';
import type { PartContext } from '../context';

const ROUNDED_SEGMENTS = 2;
const BLINKS_PER_SECOND_AT_FULL = 3;

const BLINK_SHARE = 0.25;

const WALL_X = METER.position.x;
const FRONT_X = WALL_X + METER.size.depth;

export const METER_GLANDS = {
  x: WALL_X + METER.size.depth / 2,
  bottom: METER.position.y - METER.size.height / 2,
  top: METER.position.y + METER.size.height / 2,
  z: METER.position.z,
} as const;

function body(): RoundedBoxGeometry {
  const { width, height, depth } = METER.size;
  const geometry = new RoundedBoxGeometry(
    depth,
    height,
    width,
    ROUNDED_SEGMENTS,
    METER_BODY.radius,
  );
  geometry.translate(WALL_X + depth / 2, METER.position.y, METER.position.z);
  return geometry;
}

function facePanel(width: number, height: number, y: number, lift: number) {
  return block(
    [FRONT_X - 0.1, FRONT_X + lift],
    around(METER.position.y + y, height),
    around(METER.position.z, width),
  );
}

export class MeterPart {
  readonly object = new Group();
  readonly anchor: Object3D;
  private readonly led: Mesh;
  private readonly context: PartContext;
  private phase = 0;
  private rate = 0;

  constructor(context: PartContext) {
    this.context = context;
    const { window, screen, led, cover } = METER_BODY;
    this.led = finishMesh(
      context,
      block(
        [FRONT_X, FRONT_X + 0.4],
        around(METER.position.y + led.y, led.size),
        around(METER.position.z + led.z, led.size),
      ),
      'meter',
      FINISHES.ledOff,
    );
    this.object.add(
      partMesh(context, body(), 'meter', 'meter'),
      partMesh(context, facePanel(window.width, window.height, window.y, 0.15), 'meter', 'window'),
      partMesh(
        context,
        facePanel(screen.width, screen.height, screen.y, 0.25),
        'meter',
        'meterCover',
      ),
      partMesh(
        context,
        facePanel(METER.size.width - 2, cover.height, cover.y, 0.6),
        'meter',
        'meterCover',
      ),
      this.led,
    );
    this.anchor = anchorAt(
      this.object,
      FRONT_X + ANCHOR_LIFT_CM,
      METER.position.y,
      METER.position.z,
    );
  }

  setPower(watts: number): void {
    this.rate = Math.max(0, watts / MODULE_SPEC.powerW) * BLINKS_PER_SECOND_AT_FULL;
  }

  update(deltaSeconds: number): void {
    this.phase = (this.phase + deltaSeconds * this.rate) % 1;
    const lit = this.rate > 0 && this.phase < BLINK_SHARE;
    this.led.material = this.context.materials.get(
      'meter',
      lit ? FINISHES.ledRed : FINISHES.ledOff,
    );
  }
}
