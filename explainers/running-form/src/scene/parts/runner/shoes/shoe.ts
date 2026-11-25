import { BufferAttribute, Group, Mesh, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import type { Steps } from '@core/scene/pacing';
import type { SideId } from '../../../../ids';
import type { LegChain } from '../../../rig/leg';
import type { RunnerPartBuilder } from '../build';
import { SHOE_OVERLAY_COLORS } from '../finishes';
import { BendingGeometry } from './bend';
import { mirrorGeometry } from './grid';
import { SHOE_EXTENTS, applyShoePaint } from './paint';
import { soleGeometry } from './sole';
import { collarGeometry, upperGeometry } from './upper';

const UNIT = new Vector3(1, 1, 1);
const GROUP = 'shoe';
const FIELD_SIZE = 4;

interface ShoeShapes {
  readonly sole: BufferGeometry;
  readonly upper: BufferGeometry;
  readonly collar: BufferGeometry;
}

function withExtents(geometry: BufferGeometry): BufferGeometry {
  const count = geometry.getAttribute('position').count;
  geometry.setAttribute(
    SHOE_EXTENTS,
    new BufferAttribute(new Float32Array(count * FIELD_SIZE), FIELD_SIZE),
  );
  return geometry;
}

export function* shoeShapes(): Steps<ShoeShapes> {
  const sole = soleGeometry();
  yield;
  const upper = withExtents(upperGeometry());
  yield;
  return { sole, upper, collar: collarGeometry() };
}

function forSide(shapes: ShoeShapes, side: SideId): ShoeShapes {
  if (side === 'right') return shapes;
  return {
    sole: mirrorGeometry(shapes.sole),
    upper: mirrorGeometry(shapes.upper),
    collar: mirrorGeometry(shapes.collar),
  };
}

export class Shoe {
  readonly group = new Group();
  private readonly parts: readonly BendingGeometry[];

  constructor(builder: RunnerPartBuilder, side: SideId, shapes: ShoeShapes) {
    const own = forSide(shapes, side);
    this.group.name = `${side}Shoe`;
    this.group.matrixAutoUpdate = false;
    const sole = new Mesh(builder.track(own.sole), [
      builder.material(GROUP, 'midsole'),
      builder.material(GROUP, 'outsole'),
    ]);
    const upperMaterial = applyShoePaint(
      builder.material(GROUP, side === 'right' ? 'upperRight' : 'upperLeft'),
      builder.swatches(GROUP, SHOE_OVERLAY_COLORS),
    );
    const upper = new Mesh(builder.track(own.upper), upperMaterial);
    const collar = builder.mesh(own.collar, GROUP, 'collar', this.group);
    this.group.add(sole, upper);
    this.parts = [sole, upper, collar].map((mesh) => new BendingGeometry(mesh.geometry));
  }

  update(chain: LegChain): void {
    this.parts.forEach((part) => part.bend(chain.toe));
    this.group.matrix.compose(chain.ankle, chain.foot, UNIT);
    this.group.matrixWorldNeedsUpdate = true;
  }
}
