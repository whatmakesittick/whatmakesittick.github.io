import type { Object3D } from 'three';
import { Box3, BoxGeometry, CylinderGeometry, Group, Mesh, Vector3 } from 'three';
import { STRUCTURE_GROUP, UNDIMMED_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { depthToY, tubularRadius } from '../model/scale';
import {
  BLOCK_BOTTOM_DEPTH_M,
  DRILL_FLOOR_ABOVE_SEA_M,
  SEABED_DEPTH_M,
  TOTAL_DEPTH_M,
} from '../model/wellPlan';
import type { Assembly, AssemblyResources } from './assembly';

const BLOCK = { halfWidth: 200, halfDepth: 150 } as const;
const RIG = { halfWidth: 40, height: 20, derrickHeight: 60 } as const;
const PIPE_INCHES = 5;

export class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly anchors = new Map<PartId, Object3D>();
  private readonly namedAnchors: Record<AnchorId, Object3D>;
  private readonly drillString: Mesh;

  constructor({ materials }: AssemblyResources, state: AssemblyState) {
    const steel = materials.get(STRUCTURE_GROUP, { color: 0x9aa4ad });
    const earth = materials.get(UNDIMMED_GROUP, { color: 0x4a443d });
    const water = materials.get(UNDIMMED_GROUP, {
      color: 0x1c4d73,
      transparent: true,
      opacity: 0.35,
    });
    const geometry = (g: BoxGeometry | CylinderGeometry) => this.tracker.track(g);

    const seaTop = depthToY(DRILL_FLOOR_ABOVE_SEA_M);
    const seabed = depthToY(SEABED_DEPTH_M);
    const bottom = depthToY(BLOCK_BOTTOM_DEPTH_M);
    const sea = new Mesh(
      geometry(new BoxGeometry(BLOCK.halfWidth * 2, seaTop - seabed, BLOCK.halfDepth * 2)),
      water,
    );
    sea.position.y = (seaTop + seabed) / 2;
    const rock = new Mesh(
      geometry(new BoxGeometry(BLOCK.halfWidth * 2, seabed - bottom, BLOCK.halfDepth * 2)),
      earth,
    );
    rock.position.y = (seabed + bottom) / 2;

    const deck = new Mesh(
      geometry(new BoxGeometry(RIG.halfWidth * 2, RIG.height, RIG.halfWidth * 1.5)),
      steel,
    );
    deck.position.y = depthToY(0) - RIG.height / 2;
    const derrick = new Mesh(geometry(new BoxGeometry(8, RIG.derrickHeight, 8)), steel);
    derrick.position.y = depthToY(0) + RIG.derrickHeight / 2;

    this.drillString = new Mesh(
      geometry(new CylinderGeometry(tubularRadius(PIPE_INCHES), tubularRadius(PIPE_INCHES), 1, 12)),
      steel,
    );
    this.root.add(sea, rock, deck, derrick, this.drillString);

    this.anchors.set('derrick', anchorAt(this.root, 0, depthToY(0) + RIG.derrickHeight, 0));
    this.anchors.set('bit', anchorAt(this.drillString, 0, -0.5, 0));
    this.namedAnchors = {
      bit: this.anchors.get('bit')!,
      topDrive: anchorAt(this.root, 0, depthToY(0) + RIG.derrickHeight / 2, 0),
      bop: anchorAt(this.root, 0, seabed, 0),
      reservoir: anchorAt(this.root, 0, depthToY(4100), 0),
    };
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const top = depthToY(0);
    const bit = depthToY(Math.min(Math.max(state.bitDepth, 1), TOTAL_DEPTH_M));
    this.drillString.scale.y = top - bit;
    this.drillString.position.y = (top + bit) / 2;
  }

  update(): void {}

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.anchors;
  }

  anchor(id: AnchorId): Object3D {
    return this.namedAnchors[id];
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    const box = regionBox(id);
    return box.applyMatrix4(this.root.matrixWorld);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.tracker.dispose();
  }
}

function regionBox(id: RegionId): Box3 {
  const top = depthToY(0) + RIG.derrickHeight;
  const sea = depthToY(DRILL_FLOOR_ABOVE_SEA_M);
  const seabed = depthToY(SEABED_DEPTH_M);
  const bottom = depthToY(BLOCK_BOTTOM_DEPTH_M);
  const wide = (y0: number, y1: number, half: number = BLOCK.halfWidth) =>
    new Box3(new Vector3(-half, y0, -half), new Vector3(half, y1, half));
  switch (id) {
    case 'scene':
      return wide(bottom, top);
    case 'rig':
      return wide(sea - 10, top, RIG.halfWidth);
    case 'waterline':
      return wide(sea - 20, depthToY(0) + 10, RIG.halfWidth + 20);
    case 'drillFloor':
      return wide(depthToY(0) - 10, depthToY(0) + 30, 20);
    case 'seabed':
      return wide(seabed - 15, seabed + 25, 30);
    case 'well':
      return wide(depthToY(TOTAL_DEPTH_M) - 10, sea, 40);
    case 'trap':
      return wide(depthToY(4300) - 5, depthToY(3550) + 5, 80);
    case 'completion':
      return wide(depthToY(4300) - 5, depthToY(0) + 10, 40);
  }
}
