import { CircleGeometry, Group } from 'three';
import type { Mesh } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { depthToY } from '../../../model/scale';
import { SEGMENTS } from '../../constants';
import { MeshBuilder } from '../../geometry/meshBuilder';
import { SpanEditor } from '../../geometry/spans';
import type { Span } from '../../geometry/spans';
import { BACK_HALF, addTube, grooveSpec } from '../../geometry/tubes';
import { holeIntervals } from '../../geometry/wellColumn';
import { partMesh } from '../context';
import type { PartContext } from '../context';

const LEDGE_THICKNESS = 0.01;
const QUARTER_TURN = Math.PI / 2;

function addLedges(builder: MeshBuilder): void {
  const intervals = holeIntervals();
  intervals.slice(1).forEach((interval, index) => {
    const above = intervals[index];
    if (above.radius <= interval.radius) return;
    const y = depthToY(interval.top);
    addTube(builder, {
      outer: above.radius,
      inner: interval.radius,
      bottom: y - LEDGE_THICKNESS,
      top: y,
      segments: SEGMENTS.halfTube,
      arc: BACK_HALF,
      faces: { outer: false, inner: false, cuts: false },
    });
  });
}

function floorGeometry() {
  const floor = new CircleGeometry(1, SEGMENTS.halfTube, 0, Math.PI);
  floor.rotateX(-QUARTER_TURN);
  return floor;
}

export class HolePart {
  readonly object = new Group();
  private readonly editor: SpanEditor;
  private readonly floor: Mesh;

  constructor(context: PartContext) {
    const builder = new MeshBuilder();
    const spans: Span[] = holeIntervals().map((interval) => {
      const high = depthToY(interval.top);
      const low = depthToY(interval.bottom);
      const edges = addTube(builder, grooveSpec(interval.radius, low, high, SEGMENTS.halfTube));
      return { vertices: edges.bottom, low, high };
    });
    addLedges(builder);
    const geometry = builder.build();
    const walls = partMesh(context, geometry, STRUCTURE_GROUP, 'hole');
    walls.frustumCulled = false;
    this.floor = partMesh(context, floorGeometry(), STRUCTURE_GROUP, 'hole');
    this.object.add(walls, this.floor);
    this.editor = new SpanEditor(geometry, spans);
  }

  setBottom(y: number, radius: number): void {
    this.editor.moveTo(y);
    this.floor.position.y = y;
    this.floor.scale.setScalar(radius);
  }
}
