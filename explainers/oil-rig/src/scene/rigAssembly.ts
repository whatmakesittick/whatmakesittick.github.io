import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import { clamp } from '@core/math';
import type { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { AnchorId, AssemblyState, PartId, RegionId, ViewOptions } from '../ids';
import { DRILL_FLOOR_Y, depthToY } from '../model/scale';
import { SEABED_DEPTH_M, TOTAL_DEPTH_M, riserLanded } from '../model/wellPlan';
import type { Assembly, AssemblyResources } from './assembly';
import { DRILLING_DRAFT_M, FLOW, STAND_LENGTH_M, TOP_DRIVE } from './constants';
import type { PartContext } from './parts/context';
import { MudFlowPart } from './parts/flows/mudFlow';
import { OilFlowPart } from './parts/flows/oilFlow';
import { RigPart } from './parts/rig/rig';
import { quillHeight } from './parts/rig/standCycle';
import { RockPart } from './parts/rock/rockBlock';
import { createRuler } from './parts/rock/ruler';
import { SeaPart } from './parts/sea/sea';
import { createClouds } from './parts/sea/clouds';
import { createSky } from './parts/sea/sky';
import { DrillStringPart } from './parts/well/drillString';
import { WellPart } from './parts/well/well';
import { regionBox } from './regions';

const PARKED_QUILL = DRILL_FLOOR_Y + TOP_DRIVE.quillLow + STAND_LENGTH_M * TOP_DRIVE.parkedShare;

type ViewKey = keyof ViewOptions;

function viewChanged(previous: AssemblyState | null, next: AssemblyState, key: ViewKey): boolean {
  return !previous || previous.view[key] !== next.view[key];
}

function snapshot(state: AssemblyState): AssemblyState {
  const { bitDepth, draft, mudWeight, mudState, bit, view } = state;
  return { bitDepth, draft, mudWeight, mudState, bit, view: { ...view } };
}

export class RigAssembly implements Assembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly block = new Group();
  private readonly sea: SeaPart;
  private readonly rock: RockPart;
  private readonly rig: RigPart;
  private readonly well: WellPart;
  private readonly string: DrillStringPart;
  private readonly mud: MudFlowPart;
  private readonly oil: OilFlowPart;
  private readonly ruler: Group;
  private readonly anchors: Map<PartId, Object3D>;
  private readonly named: Record<AnchorId, Object3D>;
  private state: AssemblyState | null = null;
  private seaOffset = 0;
  private time = 0;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    const context: PartContext = { ...resources, tracker: this.tracker };
    this.sea = new SeaPart(context);
    this.rock = new RockPart(context);
    this.rig = new RigPart(context);
    this.well = new WellPart(context);
    this.string = new DrillStringPart(context);
    this.mud = new MudFlowPart(context);
    this.oil = new OilFlowPart(context, this.well.completion.tunnels);
    this.ruler = createRuler(context);
    this.block.add(this.sea.object, this.rock.object, this.ruler, this.well.blockObject);
    this.root.add(
      createSky(context),
      createClouds(context),
      this.rig.object,
      this.well.rigObject,
      this.block,
      this.string.object,
      this.well.completion.tubing,
      this.well.completion.testLine,
      this.mud.object,
      this.oil.object,
    );
    this.anchors = this.collectAnchors();
    this.named = {
      bit: this.string.anchors.bit,
      topDrive: this.rig.topDrive.anchor,
      bop: this.well.bopAnchor,
      reservoir: this.rock.reservoirAnchor,
    };
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const previous = this.state;
    this.state = snapshot(state);
    if (!previous || previous.draft !== state.draft) this.applyDraft(state.draft);
    if (viewChanged(previous, state, 'cutaway')) this.applyCutaway(state.view.cutaway);
    if (!previous || previous.bit !== state.bit) this.string.setBit(state.bit);
    if (this.depthChanged(previous, state)) this.applyDepth(state);
  }

  update(deltaSeconds: number, cameraDistance: number): void {
    this.time += deltaSeconds;
    const pointSize = clamp(cameraDistance * FLOW.sizePerDistance, FLOW.minSize, FLOW.maxSize);
    this.sea.update(this.time);
    this.string.update(deltaSeconds);
    this.rig.flame.update(this.time);
    this.mud.update(deltaSeconds, this.time, pointSize);
    this.oil.update(deltaSeconds, pointSize);
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.anchors;
  }

  anchor(id: AnchorId): Object3D {
    return this.named[id];
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    return regionBox(id, this.seaOffset, this.root.matrixWorld);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private depthChanged(previous: AssemblyState | null, next: AssemblyState): boolean {
    if (!previous) return true;
    return (
      previous.bitDepth !== next.bitDepth ||
      previous.draft !== next.draft ||
      previous.mudState !== next.mudState ||
      viewChanged(previous, next, 'flow') ||
      viewChanged(previous, next, 'mud') ||
      viewChanged(previous, next, 'cutaway')
    );
  }

  private applyDraft(draft: number): void {
    this.seaOffset = -(DRILLING_DRAFT_M - draft);
    this.block.position.y = this.seaOffset;
  }

  private applyCutaway(cutaway: boolean): void {
    this.sea.setCutaway(cutaway);
    this.rock.setCutaway(cutaway);
    this.well.setCutaway(cutaway);
    this.ruler.visible = cutaway;
  }

  private applyDepth(state: AssemblyState): void {
    const finished = state.view.flow;
    const depth = finished ? TOTAL_DEPTH_M : clamp(state.bitDepth, 0, TOTAL_DEPTH_M);
    const landed = finished || riserLanded(depth);
    const quillY = finished ? PARKED_QUILL : DRILL_FLOOR_Y + quillHeight(depth);
    this.rock.setHoleBottom(depthToBlockY(depth));
    this.well.setDepth({ depth, finished, landed });
    this.well.completion.place(this.seaOffset);
    this.rig.topDrive.setQuill(quillY);
    this.rig.flame.setVisible(finished);
    this.string.setVisible(!finished);
    if (!finished) this.string.place({ quillY, bitDepth: depth, seaOffset: this.seaOffset });
    this.mud.configure({
      quillY,
      bitDepth: depth,
      seaOffset: this.seaOffset,
      landed,
      wellhead: depth > SEABED_DEPTH_M,
      state: state.mudState,
      shown: state.view.mud && state.view.cutaway && !finished,
    });
    this.oil.configure(this.seaOffset, finished);
  }

  private collectAnchors(): Map<PartId, Object3D> {
    const { rig, well, string, rock } = this;
    const entries: [PartId, Object3D][] = [
      ...(Object.entries(rig.anchors) as [PartId, Object3D][]),
      ['topDrive', rig.topDrive.anchor],
      ['flare', rig.flame.anchor],
      ...(Object.entries(well.anchors) as [PartId, Object3D][]),
      ['drillPipe', string.anchors.drillPipe],
      ['drillCollars', string.anchors.drillCollars],
      ['bit', string.anchors.bit],
      ...(Object.entries(rock.anchors) as [PartId, Object3D][]),
      ['tubing', well.completion.anchors.tubing],
      ['perforations', well.completion.anchors.perforations],
    ];
    return new Map(entries);
  }
}

function depthToBlockY(depth: number): number {
  return depthToY(Math.max(depth, SEABED_DEPTH_M));
}
