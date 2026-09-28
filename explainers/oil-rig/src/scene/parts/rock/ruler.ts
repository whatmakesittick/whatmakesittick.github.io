import { Group, Sprite, SpriteMaterial, Vector3 } from 'three';
import { smoothstep } from '@core/math';
import type { BufferGeometry } from 'three';
import { box } from '@core/scene/geometry/box';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import { depthToY } from '../../../model/scale';
import { BLOCK_BOTTOM_DEPTH_M, DRILL_FLOOR_ABOVE_SEA_M } from '../../../model/wellPlan';
import { RENDER_ORDER, RULER } from '../../constants';
import { merge } from '../../geometry/merge';
import { rulerLabel, rulerTicks } from '../../geometry/ruler';
import type { RulerTick } from '../../geometry/ruler';
import { labelTexture } from '../canvasTextures';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const STAFF_DEPTH = 0.2;
const FACING = { hidden: 0.42, shown: 0.6 } as const;
const toLabel = new Vector3();
const labelAt = new Vector3();
const LABEL_ANCHOR = { x: 0, y: 0.5 } as const;

function staff(): BufferGeometry {
  const top = depthToY(DRILL_FLOOR_ABOVE_SEA_M);
  const bottom = depthToY(BLOCK_BOTTOM_DEPTH_M);
  return box({
    minX: RULER.x - RULER.width / 2,
    maxX: RULER.x + RULER.width / 2,
    minY: bottom,
    maxY: top,
    minZ: RULER.z - STAFF_DEPTH,
    maxZ: RULER.z,
  });
}

function tick({ depth, major }: RulerTick): BufferGeometry {
  const y = depthToY(depth);
  const length = major ? RULER.majorLength : RULER.minorLength;
  return box({
    minX: RULER.x,
    maxX: RULER.x + RULER.width / 2 + length,
    minY: y - RULER.tickHeight / 2,
    maxY: y + RULER.tickHeight / 2,
    minZ: RULER.z - STAFF_DEPTH,
    maxZ: RULER.z,
  });
}

function label(context: PartContext, depth: number): Sprite {
  const { width, height } = RULER.labelCanvas;
  const texture = context.tracker.track(labelTexture(rulerLabel(depth), width, height));
  const material = new SpriteMaterial({
    map: texture,
    sizeAttenuation: false,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  });
  context.materials.register(UNDIMMED_GROUP, context.tracker.track(material));
  const sprite = new Sprite(material);
  sprite.center.set(LABEL_ANCHOR.x, LABEL_ANCHOR.y);
  sprite.scale.set((RULER.labelScreenHeight * width) / height, RULER.labelScreenHeight, 1);
  sprite.position.set(RULER.x + RULER.majorLength + RULER.labelGap, depthToY(depth), RULER.z);
  sprite.renderOrder = RENDER_ORDER.labels;
  sprite.onBeforeRender = (_renderer, _scene, camera) => {
    sprite.getWorldPosition(labelAt);
    toLabel.subVectors(labelAt, camera.position).normalize();
    material.opacity = smoothstep(-toLabel.z, FACING.hidden, FACING.shown);
  };
  return sprite;
}

export function createRuler(context: PartContext): Group {
  const object = new Group();
  const ticks = rulerTicks(
    DRILL_FLOOR_ABOVE_SEA_M,
    BLOCK_BOTTOM_DEPTH_M,
    RULER.minorStepM,
    RULER.majorStepM,
  );
  const geometry = merge([staff(), ...ticks.map(tick)]);
  object.add(partMesh(context, geometry, UNDIMMED_GROUP, 'ruler'));
  ticks.filter((mark) => mark.major).forEach((mark) => object.add(label(context, mark.depth)));
  return object;
}
