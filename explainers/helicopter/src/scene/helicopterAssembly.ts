import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import { tailRotorAngle } from '../model';
import type { PartId } from '../state';
import {
  BODY_PIVOT_HEIGHT,
  FORWARD_BODY_PITCH_DEGREES,
  HOVER_HEIGHT,
  SCENE_UNITS_PER_METRE,
} from './constants';
import { Downwash } from './downwash';
import type { PartContext } from './parts/context';
import { createFuselage } from './parts/fuselage';
import { MainRotor } from './parts/mainRotor';
import { createSkids } from './parts/skids';
import { createTailBoom } from './parts/tailBoom';
import { createTailRotor } from './parts/tailRotor';
import type { TailRotorPart } from './parts/tailRotor';
import { regionBox } from './regions';
import type { RegionId } from './regions';

export interface AssemblyResources {
  materials: MaterialLibrary;
  textures: SceneTextures;
}

export interface AssemblyFrame {
  azimuth: number;
  rpm: number;
  collective: number;
  forward: number;
  deltaSeconds: number;
}

const FLOOR_HEIGHT = 0;

export class HelicopterAssembly {
  readonly root = new Group();
  private readonly body = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly mainRotor: MainRotor;
  private readonly tailRotor: TailRotorPart;
  private readonly downwash: Downwash;
  private readonly anchors: Map<PartId, Object3D>;

  constructor(resources: AssemblyResources) {
    const context: PartContext = { materials: resources.materials, tracker: this.tracker };
    const fuselage = createFuselage(context);
    const tailBoom = createTailBoom(context);
    const skids = createSkids(context);
    this.mainRotor = new MainRotor(context);
    this.tailRotor = createTailRotor(context);
    this.downwash = new Downwash(resources.textures.dot, this.tracker);

    const airframe = new Group();
    airframe.position.y = -BODY_PIVOT_HEIGHT;
    airframe.add(
      fuselage.object,
      tailBoom.object,
      skids.object,
      this.mainRotor.object,
      this.tailRotor.object,
    );
    this.body.position.y = BODY_PIVOT_HEIGHT;
    this.body.add(airframe);
    this.root.add(this.body, this.downwash.points);
    this.root.scale.setScalar(SCENE_UNITS_PER_METRE);
    this.root.position.y = HOVER_HEIGHT * SCENE_UNITS_PER_METRE;

    this.anchors = new Map<PartId, Object3D>([
      ...(Object.entries(this.mainRotor.anchors) as [PartId, Object3D][]),
      ['fuselage', fuselage.labelAnchor],
      ['tailBoom', tailBoom.labelAnchor],
      ['skids', skids.labelAnchor],
      ['tailRotor', this.tailRotor.labelAnchor],
    ]);
  }

  setFlowVisible(visible: boolean): void {
    this.downwash.setVisible(visible);
  }

  update(frame: AssemblyFrame): void {
    this.body.rotation.z = -toRadians(FORWARD_BODY_PITCH_DEGREES * frame.forward);
    this.mainRotor.setPose(frame);
    this.tailRotor.setAngle(tailRotorAngle(frame.azimuth));
    this.downwash.update(frame);
  }

  labelAnchors(): ReadonlyMap<string, Object3D> {
    return this.anchors;
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    return regionBox(id, this.root.matrixWorld);
  }

  floorHeight(): number {
    return FLOOR_HEIGHT;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.tracker.dispose();
  }
}
