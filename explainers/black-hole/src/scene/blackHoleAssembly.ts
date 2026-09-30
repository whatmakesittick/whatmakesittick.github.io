import { Group, Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { radiusAtTau } from '../model';
import type { Assembly, AssemblyResources } from './assembly';
import { DISC_DRIFT_SPEED, LENS } from './constants';
import { FINISHES } from './finishes';
import { probePosition, shipPosition } from './layout';
import { LensedSky } from './lensedSky';
import { SceneAnchors } from './parts/anchors';
import { BeaconFlashesPart } from './parts/beaconFlashes';
import type { PartContext } from './parts/context';
import { FallLinePart } from './parts/fallLine';
import { ProbePart } from './parts/probe';
import { RubberSheetPart } from './parts/rubberSheet';
import { ShipPart } from './parts/ship';
import { localRegion } from './regions';

export class BlackHoleAssembly implements Assembly {
  readonly root = new Group();
  private readonly system = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly renderer: AssemblyResources['renderer'];
  private readonly sky: LensedSky;
  private readonly probe: ProbePart;
  private readonly ship: ShipPart;
  private readonly flashes: BeaconFlashesPart;
  private readonly fallLine: FallLinePart;
  private readonly sheet: RubberSheetPart;
  private phase = 0;
  private drift = 0;
  private discShown = false;
  private readonly anchors: SceneAnchors;
  private readonly probeAt = new Vector3();
  private readonly shipAt = new Vector3();
  private playing = false;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    this.renderer = resources.renderer;
    const context: PartContext = {
      materials: resources.materials,
      textures: resources.textures,
      tracker: this.tracker,
      finishes: FINISHES,
    };
    this.sky = this.tracker.track(new LensedSky(resources.materials));
    this.probe = new ProbePart(context);
    this.ship = new ShipPart(context);
    this.flashes = new BeaconFlashesPart(context);
    this.fallLine = new FallLinePart(context);
    this.sheet = new RubberSheetPart(context);
    this.system.add(this.probe.object, this.ship.object, this.flashes.object, this.fallLine.object);
    this.root.add(this.sky.mesh, this.system, this.sheet.object);
    this.anchors = new SceneAnchors(this.root, {
      probe: this.probe.object,
      ship: this.ship.object,
      sheetProbe: this.sheet.marker,
      system: this.system,
    });
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const { phase, view } = state;
    const radius = radiusAtTau(phase);
    probePosition(radius, this.probeAt);
    shipPosition(phase, this.shipAt);
    this.probe.set(radius, phase);
    this.ship.set(phase);
    this.flashes.set(phase, this.shipAt);
    this.sheet.set(this.probeAt, radius, this.shipAt);
    this.sheet.setShown(view.sheet);
    this.system.visible = !view.sheet;
    this.anchors.set(this.probeAt, this.shipAt, !view.sheet, view.disc && !view.sheet);
    this.phase = phase;
    this.discShown = view.disc && !view.sheet;
    this.sky.setTime(this.phase + this.drift);
    this.sky.setDiscShown(this.discShown);
    this.sky.setBending(view.sheet ? LENS.straight : LENS.bent);
    this.playing = state.playing;
  }

  update(deltaSeconds: number, _cameraDistance: number): boolean {
    const easing = this.sheet.ease(deltaSeconds);
    if (this.discShown) {
      this.drift += deltaSeconds * DISC_DRIFT_SPEED;
      this.sky.setTime(this.phase + this.drift);
    }
    return this.playing || easing || this.discShown;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.anchors.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.anchors.anchor(id);
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    const centre = this.anchors.anchor('probe').getWorldPosition(new Vector3());
    return localRegion(id, centre).applyMatrix4(this.root.matrixWorld);
  }

  prepare(): Promise<void> {
    return this.sky.prepare(this.renderer);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }
}
