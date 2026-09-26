import { Group, Object3D, Vector2, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { HEAD, PORT, RADIAL_SEGMENTS } from '../constants';
import type { ValveDimensions } from '../dimensions';
import { staticPrism } from '../geometry/prism';
import type { SectionProfile } from '../geometry/profiles';
import { sweptTube } from '../geometry/sweep';
import type { TubeArc } from '../geometry/sweep';
import type { Frame } from '../layout';
import type { EmphasisGroup } from '../finishes';
import { partMesh } from './context';
import type { PartContext } from './context';
import { portCenterline, runnerEnd, samplePath } from './portPath';

const PORT_CUT_NORMAL = new Vector3(0, 0, 1);

export interface PortPart {
  object: Group;
  labelAnchor: Object3D;
}

function portArc(context: PartContext): TubeArc {
  return context.cutaway ? 'half' : 'full';
}

function hasHeadFace(context: PartContext, valve: ValveDimensions): boolean {
  if (!context.cutaway) return true;
  return context.layout.cutNormal.x * valve.sign <= 0;
}

function flangeFrame(valve: ValveDimensions): Frame {
  return {
    u: new Vector3(0, -valve.sign, 0),
    v: new Vector3(0, 0, -1),
    w: new Vector3(valve.sign, 0, 0),
  };
}

function flangeProfile(valve: ValveDimensions): SectionProfile {
  const half = PORT.flangeHalfHeight;
  return {
    boundary: [
      new Vector2(-half, 0),
      new Vector2(-half, PORT.flangeDepth),
      new Vector2(half, PORT.flangeDepth),
      new Vector2(half, 0),
    ],
    openings: [{ center: 0, radius: valve.portRadius }],
  };
}

function flangeGeometry(context: PartContext, valve: ValveDimensions): BufferGeometry | null {
  const start = HEAD.halfWidth;
  const cutNormal = context.cutaway ? PORT_CUT_NORMAL : null;
  const end = start + PORT.flangeThickness;
  return staticPrism(flangeProfile(valve), flangeFrame(valve), start, end, cutNormal);
}

function tubeGeometry(context: PartContext, valve: ValveDimensions): BufferGeometry {
  const arc = portArc(context);
  const geometry = sweptTube(samplePath(portCenterline(valve), PORT.pathSamples), {
    innerRadius: valve.portRadius,
    outerRadius: valve.portRadius + PORT.wall,
    arc,
    radialSegments: RADIAL_SEGMENTS / (arc === 'half' ? 2 : 1),
  });
  if (arc === 'half') geometry.translate(0, 0, PORT.rimLift);
  return geometry;
}

export function createPort(
  context: PartContext,
  valve: ValveDimensions,
  group: EmphasisGroup,
  z: number,
): PortPart {
  const object = new Group();
  object.position.z = z;
  object.add(partMesh(context, tubeGeometry(context, valve), group, 'port'));
  const flange = hasHeadFace(context, valve) ? flangeGeometry(context, valve) : null;
  if (flange) {
    const mesh = partMesh(context, flange, group, 'darkSteel');
    mesh.position.y = PORT.exitHeight;
    object.add(mesh);
  }
  const labelAnchor = new Object3D();
  const end = runnerEnd(valve);
  labelAnchor.position.set(end.x, end.y + valve.portRadius, 0);
  object.add(labelAnchor);
  return { object, labelAnchor };
}
