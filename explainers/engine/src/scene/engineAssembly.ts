import { AdditiveBlending, Box3, Group } from 'three';
import type { Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { createPointMaterial } from '@core/scene/pointCloud';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import type { EngineLayout, EngineSpec } from '../model';
import type { PartId, ViewOptions } from '../state';
import { chamberRegion, columnRegion, floorHeight } from './assemblyRegions';
import type { RegionId } from './assemblyRegions';
import { FLOW, SCENE_UNITS_PER_MM, SPRAY } from './constants';
import { CylinderAssembly } from './cylinderAssembly';
import type { ParticleSetup } from './cylinderAssembly';
import { cylinderPartsFactory } from './cylinderParts';
import { engineDimensions } from './dimensions';
import type { EngineDimensions } from './dimensions';
import { layoutGeometry } from './layout';
import type { LayoutGeometry } from './layout';
import { createCamshaft } from './parts/camshaft';
import type { CamshaftPart } from './parts/camshaft';
import type { PartContext } from './parts/context';
import { createCrankshaft } from './parts/crankshaft';
import type { CrankshaftPart } from './parts/crankshaft';
import { createStaticStructure } from './staticStructure';
import type { StaticStructure } from './staticStructure';
export interface AssemblyConfig {
  layout: EngineLayout;
  spec: EngineSpec;
  cutaway: boolean;
}

export interface AssemblyResources {
  materials: MaterialLibrary;
  textures: SceneTextures;
}

export interface AssemblyFrame {
  angle: number;
  deltaDegrees: number;
  deltaSeconds: number;
}

export class EngineAssembly {
  readonly root = new Group();
  readonly layout: LayoutGeometry;
  private readonly head = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly structure: StaticStructure;
  private readonly crankshaft: CrankshaftPart;
  private readonly camshafts: CamshaftPart[];
  private readonly cylinders: CylinderAssembly[];
  private spec: EngineSpec;
  private dims: EngineDimensions;

  constructor(config: AssemblyConfig, resources: AssemblyResources) {
    this.materials = resources.materials;
    this.layout = layoutGeometry(config.layout);
    this.spec = config.spec;
    this.dims = engineDimensions(config.spec);
    const context: PartContext = {
      spec: this.spec,
      dims: this.dims,
      layout: this.layout,
      cutaway: config.cutaway,
      materials: resources.materials,
      tracker: this.tracker,
    };
    this.root.scale.setScalar(SCENE_UNITS_PER_MM);
    this.structure = createStaticStructure(context);
    this.crankshaft = createCrankshaft(context);
    this.camshafts = this.createCamshafts(context);
    this.root.add(this.structure.lower, this.head, this.crankshaft.object);
    this.head.add(this.structure.head, ...this.camshafts.map((camshaft) => camshaft.object));
    this.cylinders = this.createCylinders(context, resources.textures);
    this.setSpec(config.spec);
  }

  private createCamshafts(context: PartContext): CamshaftPart[] {
    const { intake, exhaust } = context.dims.valves;
    return [
      createCamshaft(context, intake, 'intakeCam'),
      createCamshaft(context, exhaust, 'exhaustCam'),
    ];
  }

  private createCylinders(context: PartContext, textures: SceneTextures): CylinderAssembly[] {
    const build = cylinderPartsFactory(context, textures);
    const multi = this.layout.cylinders.length > 1;
    const particles: ParticleSetup = {
      flowMaterial: this.tracker.track(createPointMaterial(textures.dot, FLOW.particleWorldSize)),
      sprayMaterial: this.tracker.track(
        createPointMaterial(textures.dot, SPRAY.particleWorldSize, AdditiveBlending),
      ),
      flowCount: multi ? FLOW.particlesPerCylinderMulti : FLOW.particlesSingle,
      tracker: this.tracker,
    };
    return this.layout.cylinders.map(
      (placement) =>
        new CylinderAssembly(
          placement,
          build(placement),
          { spec: this.spec, dims: this.dims },
          { root: this.root, head: this.head },
          particles,
        ),
    );
  }

  setSpec(spec: EngineSpec): void {
    this.spec = spec;
    this.dims = engineDimensions(spec);
    this.head.position.y = this.dims.headFaceHeight;
    this.structure.fitToHead(this.dims.headFaceHeight);
    this.cylinders.forEach((cylinder) => cylinder.setSpec(spec));
  }

  setView(view: ViewOptions): void {
    this.cylinders.forEach((cylinder) => {
      cylinder.setGasVisible(view.gas);
      cylinder.setFlowVisible(view.flow);
    });
  }

  get sparking(): boolean {
    return this.cylinders.some((cylinder) => cylinder.sparking);
  }

  update(frame: AssemblyFrame): void {
    this.crankshaft.setAngle(frame.angle);
    this.camshafts.forEach((camshaft) => camshaft.setAngle(frame.angle));
    const gasEmphasis = this.materials.emphasisOf('combustionChamber');
    this.cylinders.forEach((cylinder) =>
      cylinder.update({
        engineAngle: frame.angle,
        deltaDegrees: frame.deltaDegrees,
        deltaSeconds: frame.deltaSeconds,
        headFaceHeight: this.dims.headFaceHeight,
        gasEmphasis,
      }),
    );
  }

  labelAnchors(): Map<PartId, Object3D> {
    const primaryIndex = this.layout.cylinders.indexOf(this.layout.primaryCylinder);
    const primary = this.cylinders[primaryIndex];
    const [intakeCam, exhaustCam] = this.camshafts;
    const anchors: Partial<Record<PartId, Object3D>> = {
      ...primary.anchors,
      crankshaft: this.crankshaft.labelAnchor,
      flywheel: this.crankshaft.flywheelAnchor,
      intakeCam: intakeCam.labelAnchor,
      exhaustCam: exhaustCam.labelAnchor,
      cylinder: this.structure.cylinderAnchor,
    };
    return new Map(Object.entries(anchors) as [PartId, Object3D][]);
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    switch (id) {
      case 'all':
        return new Box3().setFromObject(this.root, true);
      case 'head':
        return new Box3().setFromObject(this.head);
      case 'crank':
        return new Box3().setFromObject(this.crankshaft.object, true);
      case 'chamber':
        return chamberRegion(this.spec, this.dims, this.layout);
      case 'column':
        return columnRegion(this.dims, this.layout);
    }
  }

  floorHeight(): number {
    return floorHeight();
  }

  dispose(): void {
    this.root.removeFromParent();
    this.tracker.dispose();
    this.materials.clearRegistered();
  }
}
