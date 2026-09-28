import {
  BufferGeometry,
  ConeGeometry,
  Float32BufferAttribute,
  Group,
  InstancedMesh,
  Line,
  LineBasicMaterial,
  LineLoop,
  Matrix4,
} from 'three';
import type { Object3D } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { PartId } from '../../../ids';
import type { SliceLayerId } from '../../../model';
import {
  FINGER_UM,
  MODULE,
  SLICE_LAYERS,
  SLICE_LIFT_CM,
  layerBottomUm,
  layerTopUm,
  um,
} from '../../../model';
import { ANCHOR_LIFT_CM, SLICE_VIEW } from '../../constants';
import type { Finish } from '../../finishes';
import { FINISHES, PAINT } from '../../finishes';
import { around, block } from '../../geometry/blocks';
import { seededRandom } from '../../geometry/random';
import { sliceCorner } from '../../geometry/moduleLayout';
import {
  SLICE_FRONT_Y,
  SLICE_SIZE,
  fingerSpan,
  fingerTopCm,
  sliceOrigin,
} from '../../geometry/sliceGeometry';
import { partMesh, registered } from '../context';
import type { PartContext } from '../context';

export type SlicePartId = Extract<
  PartId,
  'pyramids' | 'arCoating' | 'emitter' | 'junction' | 'base' | 'rearContact' | 'finger'
>;

const LAYER_GROUP: Readonly<Record<Exclude<SliceLayerId, 'pyramids'>, SlicePartId>> = {
  arCoating: 'arCoating',
  emitter: 'emitter',
  junction: 'junction',
  base: 'base',
  rearPassivation: 'rearContact',
  rearContact: 'rearContact',
};

const LAYER_FINISH: Readonly<Record<Exclude<SliceLayerId, 'pyramids'>, Finish>> = {
  arCoating: 'arCoating',
  emitter: 'emitter',
  junction: 'junction',
  base: 'base',
  rearPassivation: 'rearPassivation',
  rearContact: 'rearContact',
};

const LABEL_X: Readonly<Record<SlicePartId, number>> = {
  pyramids: 0.78,
  arCoating: 0.3,
  emitter: 0.7,
  junction: 0.34,
  base: 0.62,
  rearContact: 0.38,
  finger: 0,
};

const QUARTER_TURN = Math.PI / 2;
const EIGHTH_TURN = Math.PI / 4;
const PYRAMID_SIDES = 4;

export class SliceBlockPart {
  readonly object = new Group();
  readonly block = new Group();
  readonly anchors: Readonly<Record<SlicePartId, Object3D>>;

  constructor(context: PartContext) {
    const corner = sliceCorner();
    const origin = sliceOrigin();
    this.block.position.set(origin.x, origin.y, origin.z);
    this.buildLayers(context);
    this.block.add(this.pyramids(context), this.finger(context));
    this.object.add(this.block, ...this.callout(context, corner));
    this.anchors = this.placeAnchors();
  }

  private buildLayers(context: PartContext): void {
    const x = [0, SLICE_SIZE.width] as const;
    const y = around(0, SLICE_SIZE.depth);
    SLICE_LAYERS.forEach(({ id }) => {
      if (id === 'pyramids') return;
      const z = [um(layerBottomUm(id)), um(layerTopUm(id))] as const;
      this.block.add(partMesh(context, block(x, y, z), LAYER_GROUP[id], LAYER_FINISH[id]));
    });
  }

  private pyramids(context: PartContext): InstancedMesh {
    const { baseUm, minShare, seed } = SLICE_VIEW.pyramid;
    const base = um(baseUm);
    const height = um(layerTopUm('pyramids') - layerBottomUm('pyramids'));
    const cone = new ConeGeometry(base / Math.SQRT2, 1, PYRAMID_SIDES, 1, true);
    cone.rotateY(EIGHTH_TURN);
    cone.translate(0, 1 / 2, 0);
    cone.rotateX(QUARTER_TURN);
    const [fingerLeft, fingerRight] = fingerSpan();
    const random = seededRandom(seed);
    const matrices: Matrix4[] = [];
    const floor = um(layerBottomUm('pyramids'));
    for (let x = base / 2; x < SLICE_SIZE.width; x += base) {
      if (x + base / 2 > fingerLeft && x - base / 2 < fingerRight) continue;
      for (let y = -SLICE_SIZE.depth / 2 + base / 2; y < SLICE_SIZE.depth / 2; y += base) {
        const scale = height * (minShare + (1 - minShare) * random());
        matrices.push(new Matrix4().makeScale(1, 1, scale).setPosition(x, y, floor));
      }
    }
    const mesh = context.tracker.track(
      new InstancedMesh(
        context.tracker.track(cone),
        context.materials.get('pyramids', FINISHES.pyramids),
        matrices.length,
      ),
    );
    matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
    return mesh;
  }

  private finger(context: PartContext) {
    const z = [um(layerTopUm('arCoating')), fingerTopCm()] as const;
    return partMesh(
      context,
      block(fingerSpan(), around(0, SLICE_SIZE.depth), z),
      'finger',
      'finger',
    );
  }

  private callout(context: PartContext, corner: { x: number; y: number }): Object3D[] {
    const material = registered(
      context,
      UNDIMMED_GROUP,
      new LineBasicMaterial({ color: PAINT.leader }),
    );
    const face = MODULE.depth;
    const leader = new BufferGeometry();
    leader.setAttribute(
      'position',
      new Float32BufferAttribute(
        [corner.x, corner.y, face, corner.x, corner.y, face + SLICE_LIFT_CM],
        3,
      ),
    );
    const size = SLICE_VIEW.marker;
    const square = new BufferGeometry();
    square.setAttribute(
      'position',
      new Float32BufferAttribute(
        [
          corner.x,
          corner.y,
          face,
          corner.x + size,
          corner.y,
          face,
          corner.x + size,
          corner.y - size,
          face,
          corner.x,
          corner.y - size,
          face,
        ],
        3,
      ),
    );
    return [
      new Line(context.tracker.track(leader), material),
      new LineLoop(context.tracker.track(square), material),
    ];
  }

  private placeAnchors(): Record<SlicePartId, Object3D> {
    const front = SLICE_FRONT_Y - ANCHOR_LIFT_CM;
    const middle = (id: SliceLayerId) => um((layerTopUm(id) + layerBottomUm(id)) / 2);
    const at = (id: SlicePartId, z: number) =>
      anchorAt(this.block, SLICE_SIZE.width * LABEL_X[id], front, z);
    return {
      pyramids: at('pyramids', um(layerTopUm('pyramids')) + SLICE_VIEW.labelLift),
      arCoating: at('arCoating', middle('arCoating')),
      emitter: at('emitter', middle('emitter')),
      junction: at('junction', middle('junction')),
      base: at('base', middle('base')),
      rearContact: at('rearContact', middle('rearContact')),
      finger: anchorAt(this.block, um(FINGER_UM.x), front, fingerTopCm() + SLICE_VIEW.labelLift),
    };
  }
}
