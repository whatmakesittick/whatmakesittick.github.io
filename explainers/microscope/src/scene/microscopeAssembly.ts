import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import { opticalLayout } from '../model';
import type { EyepieceId, ObjectiveId, OpticalLayout } from '../model';
import type { PartId, ViewOptions } from '../state';
import { BENCH_LEVEL, FLOOR_HEIGHT, SCENE_UNITS_PER_MM } from './constants';
import { createParts, cutawayParts, partAnchors } from './microscopeParts';
import type { Cutaway, MicroscopeParts } from './microscopeParts';
import { regionBox } from './regions';
import type { RegionId } from './regions';
import { SpecimenTexture } from './specimenTexture';
import { stageLift } from './stageLift';

export interface AssemblyResources {
  materials: MaterialLibrary;
  textures: SceneTextures;
}

export interface Optics {
  objective: ObjectiveId;
  eyepiece: EyepieceId;
  focus: number;
}

export interface Setup extends Optics {
  wavelength: number;
}

export class MicroscopeAssembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly specimen = new SpecimenTexture();
  private readonly carriage = new Group();
  private readonly parts: MicroscopeParts;
  private readonly anchors: ReadonlyMap<PartId, Object3D>;
  private readonly cutaways: readonly Cutaway[];
  private layout: OpticalLayout;
  private objective: ObjectiveId;
  private wavelength: number;

  constructor(resources: AssemblyResources, setup: Setup) {
    this.materials = resources.materials;
    this.objective = setup.objective;
    this.wavelength = setup.wavelength;
    this.layout = opticalLayout(setup.objective, setup.eyepiece);
    this.parts = createParts({ ...resources, tracker: this.tracker }, this.specimen, this.layout);
    this.anchors = partAnchors(this.parts);
    this.cutaways = cutawayParts(this.parts);
    this.assemble();
    this.setWavelength(setup.wavelength);
    this.setOptics(setup);
    this.parts.nosepiece.snap();
  }

  setView(view: ViewOptions): void {
    this.cutaways.forEach((part) => part.setCutaway(view.cutaway));
    this.parts.light.setVisible(view.rays);
  }

  setOptics({ objective, eyepiece, focus }: Optics): void {
    const lift = stageLift(focus, objective);
    this.layout = opticalLayout(objective, eyepiece, lift);
    this.carriage.position.y = lift;
    if (objective !== this.objective) {
      this.objective = objective;
      this.repaintSpecimen();
    }
    const { parts, layout } = this;
    parts.condenser.setObjective(objective);
    parts.nosepiece.setObjective(objective);
    parts.stage.setField(layout.fieldHeight);
    parts.eyepiece.setEyepiece(eyepiece);
    parts.eye.place(layout.eyeLens, layout.retinaHeight);
    parts.knobs.setFocus(focus);
    parts.oil.place(objective, layout);
    parts.light.setLayout(layout);
  }

  setWavelength(wavelength: number): void {
    this.wavelength = wavelength;
    this.parts.light.setWavelength(wavelength);
    this.repaintSpecimen();
  }

  update(position: number, deltaSeconds: number, cameraDistance: number): void {
    this.parts.nosepiece.update(deltaSeconds);
    this.parts.light.update(position, cameraDistance);
  }

  labelAnchors(): ReadonlyMap<string, Object3D> {
    return this.anchors;
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    return regionBox(id, this.layout, this.root.matrixWorld);
  }

  floorHeight(): number {
    return FLOOR_HEIGHT;
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.specimen.dispose();
    this.tracker.dispose();
  }

  private assemble(): void {
    const { parts } = this;
    this.carriage.add(parts.condenser.object, parts.stage.object);
    this.root.add(
      parts.stand.object,
      parts.lamp.object,
      this.carriage,
      parts.nosepiece.object,
      parts.tube.object,
      parts.eyepiece.object,
      parts.eye.object,
      parts.knobs.object,
      parts.oil.mesh,
      parts.light.object,
      parts.image,
    );
    this.root.scale.setScalar(SCENE_UNITS_PER_MM);
    this.root.position.y = -BENCH_LEVEL * SCENE_UNITS_PER_MM;
  }

  private repaintSpecimen(): void {
    this.specimen.paint(this.objective, this.wavelength);
  }
}
