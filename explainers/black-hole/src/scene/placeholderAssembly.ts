import { Box3, Group, Mesh, MeshStandardMaterial, Object3D, SphereGeometry, Vector3 } from 'three';
import { regionFromSpec } from '@core/scene/regions';
import { PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { radiusAtTau } from '../model';
import type { Assembly, AssemblyResources } from './assembly';
import {
  PROBE_CLOSE_HALF_SIZE,
  PROBE_SIZE,
  REGIONS,
  SHIP_SIZE,
  probePosition,
  shipPosition,
} from './layout';
import { LensedSky } from './lensedSky';

const SPHERE_SEGMENTS = 16;

export class PlaceholderAssembly implements Assembly {
  readonly root = new Group();
  private readonly sky: LensedSky;
  private readonly probe: Mesh;
  private readonly ship: Mesh;
  private readonly hole = new Object3D();
  private readonly anchors = new Map<PartId, Object3D>();
  private readonly renderer: AssemblyResources['renderer'];
  private state: AssemblyState;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.state = state;
    this.renderer = resources.renderer;
    this.sky = new LensedSky(resources.materials);
    this.probe = this.marker(PROBE_SIZE, '#e6f0ff');
    this.ship = this.marker(SHIP_SIZE, '#cfd6e6');
    this.root.add(this.sky.mesh, this.probe, this.ship, this.hole);
    PART_IDS.forEach((id) => this.anchors.set(id, new Object3D()));
    this.anchors.set('probe', this.probe);
    this.anchors.set('ship', this.ship);
    this.anchors.set('horizon', this.hole);
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    this.state = state;
    const radius = radiusAtTau(state.phase);
    probePosition(radius, this.probe.position);
    shipPosition(state.phase, this.ship.position);
    this.sky.setTime(state.phase);
    this.sky.setDiscShown(state.view.disc && !state.view.sheet);
    this.probe.visible = !state.view.sheet;
    this.ship.visible = !state.view.sheet;
  }

  update(): boolean {
    return this.state.playing;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.anchors;
  }

  anchor(id: AnchorId): Object3D {
    if (id === 'probe') return this.probe;
    if (id === 'ship') return this.ship;
    return this.hole;
  }

  region(id: RegionId): Box3 {
    if (id === 'probeClose') {
      const half = new Vector3(PROBE_CLOSE_HALF_SIZE, PROBE_CLOSE_HALF_SIZE, PROBE_CLOSE_HALF_SIZE);
      return new Box3().setFromCenterAndSize(this.probe.position, half.multiplyScalar(2));
    }
    return regionFromSpec(REGIONS[id]);
  }

  prepare(): Promise<void> {
    return this.sky.prepare(this.renderer);
  }

  dispose(): void {
    this.sky.dispose();
    [this.probe, this.ship].forEach((mesh) => {
      mesh.geometry.dispose();
      (mesh.material as MeshStandardMaterial).dispose();
    });
  }

  private marker(size: number, color: string): Mesh {
    const geometry = new SphereGeometry(size, SPHERE_SEGMENTS, SPHERE_SEGMENTS);
    return new Mesh(
      geometry,
      new MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.4 }),
    );
  }
}
