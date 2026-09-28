import { CylinderGeometry, Group, Vector3 } from 'three';
import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import { CABLE, CONNECTOR, LEAD } from '../../constants';
import { FINISHES } from '../../finishes';
import { JUNCTION_BOX, junctionBoxCentres, junctionBoxGeometry } from '../../geometry/junctionBox';
import { mergeParts } from '../../geometry/merge';
import { roundedRoute } from '../../geometry/route';
import { RAIL } from '../../geometry/tiltFrame';
import { finishMesh, partMesh } from '../context';
import type { PartContext } from '../context';
import { TubeMesh } from '../tubeMesh';

const LEAD_X = -RAIL.offset - LEAD.sideGap;

export const CABLE_START = new Vector3(LEAD_X, CONNECTOR.top - CONNECTOR.length, LEAD.tuck);

function connectorGeometry(): CylinderGeometry[] {
  const { radius, femaleRadius, length, top, nut } = CONNECTOR;
  const half = length / 2;
  const male = new CylinderGeometry(radius, radius, half, CABLE.radialSegments);
  male.translate(LEAD_X, top - half / 2, LEAD.tuck);
  const female = new CylinderGeometry(femaleRadius, femaleRadius, half, CABLE.radialSegments);
  female.translate(LEAD_X, top - half - half / 2, LEAD.tuck);
  const ring = new CylinderGeometry(nut.radius, nut.radius, nut.length, CABLE.radialSegments);
  ring.translate(LEAD_X, top - half, LEAD.tuck);
  return [male, female, ring];
}

export class JunctionBoxPart {
  readonly object = new Group();
  readonly boxes = new Group();
  readonly anchors: Readonly<Record<'junctionBox' | 'connector', Object3D>>;
  private readonly lead: TubeMesh;

  constructor(context: PartContext) {
    this.lead = new TubeMesh(context, 'junctionBox', 'cable', LEAD.radius);
    const boxes = mergeParts(junctionBoxCentres().map((centre) => junctionBoxGeometry(0, centre)));
    this.boxes.add(partMesh(context, boxes, 'junctionBox', 'junctionBox'));
    this.object.add(
      this.boxes,
      this.lead.mesh,
      finishMesh(context, mergeParts(connectorGeometry()), 'connector', FINISHES.connector),
    );
    const lid = -JUNCTION_BOX.depth - JUNCTION_BOX.lid.depth;
    this.anchors = {
      junctionBox: anchorAt(this.boxes, 0, JUNCTION_BOX.y, lid),
      connector: anchorAt(
        this.object,
        LEAD_X,
        CONNECTOR.top - CONNECTOR.length / 2,
        LEAD.tuck - CONNECTOR.nut.radius,
      ),
    };
  }

  setBack(back: number): void {
    this.boxes.position.z = back;
    this.lead.setPath(this.leadRoute(back));
  }

  private leadRoute(back: number) {
    const exitY = JUNCTION_BOX.y - JUNCTION_BOX.height / 2;
    const bendY = exitY - LEAD.drop;
    const points = [
      new Vector3(0, exitY, back - JUNCTION_BOX.depth / 2),
      new Vector3(0, bendY, LEAD.crossing),
      new Vector3(LEAD_X, bendY - LEAD.crossingDrop, LEAD.crossing),
      new Vector3(LEAD_X, bendY - LEAD.crossingDrop, LEAD.tuck),
      new Vector3(LEAD_X, CONNECTOR.top, LEAD.tuck),
    ];
    return roundedRoute(points, CABLE.bend);
  }
}
