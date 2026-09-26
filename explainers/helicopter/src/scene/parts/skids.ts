import { CatmullRomCurve3, Group, Object3D, TubeGeometry, Vector3 } from 'three';
import type { BufferGeometry } from 'three';
import { SKIDS } from '../constants';
import { partMesh } from './context';
import type { PartContext } from './context';

export interface SkidsPart {
  object: Group;
  labelAnchor: Object3D;
}

const SIDES = [-1, 1] as const;
const TOE_BEND_SHARE = 0.4;
const STRUT_SHOULDER_SHARE = 0.65;

function tube(points: Vector3[], radius: number): BufferGeometry {
  return new TubeGeometry(
    new CatmullRomCurve3(points),
    SKIDS.tubularSegments,
    radius,
    SKIDS.radialSegments,
  );
}

function skidGeometry(side: number): BufferGeometry {
  const z = side * SKIDS.halfTrack;
  const y = SKIDS.tubeRadius;
  return tube(
    [
      new Vector3(SKIDS.rear, y, z),
      new Vector3(SKIDS.front, y, z),
      new Vector3(
        SKIDS.front + SKIDS.toeReach * TOE_BEND_SHARE,
        y + SKIDS.toeRise * TOE_BEND_SHARE,
        z,
      ),
      new Vector3(SKIDS.front + SKIDS.toeReach, y + SKIDS.toeRise, z),
    ],
    SKIDS.tubeRadius,
  );
}

function crossTubeGeometry(x: number): BufferGeometry {
  const foot = SKIDS.tubeRadius;
  const shoulder = SKIDS.crossTop * STRUT_SHOULDER_SHARE;
  const points = [
    new Vector3(x, foot, -SKIDS.halfTrack),
    new Vector3(x, shoulder, -SKIDS.halfTrack * STRUT_SHOULDER_SHARE - SKIDS.crossInset / 2),
    new Vector3(x, SKIDS.crossTop, -SKIDS.crossInset),
    new Vector3(x, SKIDS.crossTop, SKIDS.crossInset),
    new Vector3(x, shoulder, SKIDS.halfTrack * STRUT_SHOULDER_SHARE + SKIDS.crossInset / 2),
    new Vector3(x, foot, SKIDS.halfTrack),
  ];
  return tube(points, SKIDS.crossRadius);
}

export function createSkids(context: PartContext): SkidsPart {
  const object = new Group();
  SIDES.forEach((side) => object.add(partMesh(context, skidGeometry(side), 'skids', 'skid')));
  SKIDS.crossTubes.forEach((x) =>
    object.add(partMesh(context, crossTubeGeometry(x), 'skids', 'skid')),
  );
  const labelAnchor = new Object3D();
  labelAnchor.position.set(SKIDS.front, SKIDS.tubeRadius, -SKIDS.halfTrack);
  object.add(labelAnchor);
  return { object, labelAnchor };
}
