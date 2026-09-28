import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId, ViewOptions } from '../ids';
import { GATE, HEAD, UNITS_PER_NM, spanMiddle } from '../model/scale';
import type { Assembly, AssemblyResources } from './assembly';
import { ringLayout } from './geometry/ringLayout';
import { polar } from './geometry/solids';
import type { PartContext } from './parts/context';
import { MembranePart } from './parts/membrane/membrane';
import { HERO_LOOK } from './parts/motor/look';
import { MotorPart } from './parts/motor/motor';
import { MotorLabels } from './parts/motor/motorLabels';
import { regionBox } from './regions';

type ViewKey = keyof ViewOptions;

function snapshot(state: AssemblyState): AssemblyState {
  return { ...state, view: { ...state.view } };
}

function viewChanged(previous: AssemblyState | null, next: AssemblyState, key: ViewKey): boolean {
  return !previous || previous.view[key] !== next.view[key];
}

export class SynthaseAssembly implements Assembly {
  readonly root = new Group();
  private readonly frame = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly membrane: MembranePart;
  private readonly hero: MotorPart;
  private readonly heroLabels: MotorLabels;
  private readonly labels = new Map<PartId, Object3D>();
  private readonly named: Record<AnchorId, Object3D>;
  private state: AssemblyState | null = null;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    const context: PartContext = { ...resources, tracker: this.tracker };
    this.frame.scale.setScalar(UNITS_PER_NM);
    this.root.add(this.frame);
    this.membrane = new MembranePart(context, this.frame);
    this.hero = new MotorPart(context, HERO_LOOK, state.bladeCount);
    this.frame.add(this.hero.object);
    this.heroLabels = new MotorLabels(this.frame, state.bladeCount);
    this.named = {
      ring: anchorAt(this.frame, 0, 0, 0),
      gate: anchorAt(this.frame, 0, 0, 0),
      head: anchorAt(this.frame, 0, spanMiddle(HEAD.span), 0),
      pumps: anchorAt(this.frame, 0, 0, 0),
    };
    this.collectLabels();
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const previous = this.state;
    this.state = snapshot(state);
    this.hero.setAngle(state.rotorDeg);
    if (!previous || previous.bladeCount !== state.bladeCount) {
      this.applyBladeCount(state.bladeCount);
    }
    if (viewChanged(previous, state, 'membrane')) this.membrane.setVisible(state.view.membrane);
    if (viewChanged(previous, state, 'cutaway')) this.hero.setCutaway(state.view.cutaway);
  }

  update(_deltaSeconds: number, _cameraDistance: number): void {}

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.named[id];
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    const bladeCount = this.state?.bladeCount ?? 0;
    const motorCount = this.state?.motorCount ?? 1;
    return regionBox(id, { bladeCount, motorCount }, this.frame.matrixWorld);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private applyBladeCount(bladeCount: number): void {
    this.hero.setBladeCount(bladeCount);
    this.heroLabels.setBladeCount(bladeCount);
    const gateMiddle = spanMiddle([GATE.innerRadius, GATE.outerRadius]);
    this.named.gate.position.copy(
      polar(GATE.azimuthDeg, gateMiddle + ringLayout(bladeCount).growth, 0),
    );
  }

  private collectLabels(): void {
    this.heroLabels.anchors.forEach((anchor, id) => this.labels.set(id, anchor));
    this.labels.set('membrane', this.membrane.label);
  }
}
