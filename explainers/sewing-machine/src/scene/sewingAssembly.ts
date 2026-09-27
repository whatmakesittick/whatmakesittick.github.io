import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import { fabricTravel, feedDogPosition, hookAngle, needleTipHeight, takeUpLift } from '../model';
import type { Tension } from '../model';
import type { PartId, ViewOptions } from '../state';
import { BED, SCENE_UNITS_PER_MM } from './constants';
import { createBobbin } from './parts/bobbin';
import type { BobbinPart } from './parts/bobbin';
import { createBody } from './parts/body';
import type { BodyPart } from './parts/body';
import type { PartContext } from './parts/context';
import { createFabric } from './parts/fabric';
import type { FabricPart } from './parts/fabric';
import { createFeedDogs } from './parts/feedDogs';
import type { FeedDogsPart } from './parts/feedDogs';
import { createThreadGuides } from './parts/guides';
import { createHandwheel } from './parts/handwheel';
import type { HandwheelPart } from './parts/handwheel';
import { createHook } from './parts/hook';
import type { HookPart } from './parts/hook';
import { createNeedle } from './parts/needle';
import type { NeedlePart } from './parts/needle';
import { createPresserFoot } from './parts/presserFoot';
import { createSpool } from './parts/spool';
import { createTakeUpLever, leverEye } from './parts/takeUpLever';
import type { TakeUpLeverPart } from './parts/takeUpLever';
import { createTensionDiscs } from './parts/tensionDiscs';
import type { TensionDiscsPart } from './parts/tensionDiscs';
import { createThreads } from './parts/threads';
import type { ThreadsPart } from './parts/threads';
import { createThroatPlate } from './parts/throatPlate';
import type { ThroatPlatePart } from './parts/throatPlate';
import { regionBox } from './regions';
import type { RegionId } from './regions';
import { Translucency } from './translucency';

export interface AssemblyFrame {
  angle: number;
  stitchLength: number;
  tension: Tension;
}

const FLOOR_HEIGHT = 0;

export class SewingAssembly {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly translucency = new Translucency();
  private readonly materials: MaterialLibrary;
  private readonly body: BodyPart;
  private readonly handwheel: HandwheelPart;
  private readonly tensionDiscs: TensionDiscsPart;
  private readonly takeUp: TakeUpLeverPart;
  private readonly needle: NeedlePart;
  private readonly plate: ThroatPlatePart;
  private readonly feedDogs: FeedDogsPart;
  private readonly hook: HookPart;
  private readonly bobbin: BobbinPart;
  private readonly fabric: FabricPart;
  private readonly threads: ThreadsPart;
  private readonly anchors: Map<PartId, Object3D>;
  private cutaway = false;

  constructor(materials: MaterialLibrary) {
    this.materials = materials;
    const context: PartContext = {
      materials,
      tracker: this.tracker,
      translucency: this.translucency,
    };
    this.body = createBody(context);
    this.handwheel = createHandwheel(context);
    this.tensionDiscs = createTensionDiscs(context);
    this.takeUp = createTakeUpLever(context);
    this.needle = createNeedle(context);
    this.plate = createThroatPlate(context);
    this.feedDogs = createFeedDogs(context);
    this.hook = createHook(context);
    this.fabric = createFabric(context);
    this.threads = createThreads(context);
    const spool = createSpool(context);
    const presserFoot = createPresserFoot(context);
    const bobbin = createBobbin(context);
    this.bobbin = bobbin;

    this.root.add(
      this.body.object,
      createThreadGuides(context),
      this.handwheel.object,
      spool.object,
      this.tensionDiscs.object,
      this.takeUp.object,
      this.needle.object,
      presserFoot.object,
      this.plate.object,
      this.feedDogs.object,
      this.hook.object,
      bobbin.object,
      this.fabric.object,
      this.threads.object,
    );
    this.root.scale.setScalar(SCENE_UNITS_PER_MM);
    this.root.position.y = BED.height * SCENE_UNITS_PER_MM;

    this.anchors = new Map<PartId, Object3D>([
      ['needle', this.needle.needleAnchor],
      ['needleBar', this.needle.barAnchor],
      ['presserFoot', presserFoot.labelAnchor],
      ['throatPlate', this.plate.labelAnchor],
      ['feedDogs', this.feedDogs.labelAnchor],
      ['hook', this.hook.labelAnchor],
      ['bobbinCase', bobbin.caseAnchor],
      ['bobbin', bobbin.bobbinAnchor],
      ['takeUpLever', this.takeUp.labelAnchor],
      ['tensionDiscs', this.tensionDiscs.labelAnchor],
      ['spool', spool.labelAnchor],
      ['handwheel', this.handwheel.labelAnchor],
      ['fabric', this.fabric.labelAnchor],
      ['topThread', this.needle.threadAnchor],
      ['bobbinThread', this.threads.bobbinAnchor],
    ]);
  }

  setView(view: ViewOptions): void {
    this.cutaway = view.cutaway;
    this.body.setCutaway(view.cutaway);
    this.plate.setCutaway(view.cutaway);
    this.fabric.setCutaway(view.cutaway);
    this.threads.setCutaway(view.cutaway);
    this.hook.object.visible = view.cutaway;
    this.bobbin.object.visible = view.cutaway;
  }

  update(frame: AssemblyFrame): void {
    const { angle, stitchLength, tension } = frame;
    const tipHeight = needleTipHeight(angle);
    const lift = takeUpLift(angle);
    const travel = fabricTravel(angle, stitchLength);
    this.handwheel.setAngle(angle);
    this.tensionDiscs.setTension(tension);
    this.takeUp.setLift(lift);
    this.needle.setTipHeight(tipHeight);
    this.feedDogs.setPosition(feedDogPosition(angle, stitchLength));
    this.hook.setAngles(hookAngle(angle), angle);
    this.fabric.setTravel(travel);
    this.threads.update({
      angle,
      hideBelowPlate: !this.cutaway,
      tipHeight,
      leverEye: leverEye(lift),
      stitchLength,
      travel,
      tension,
    });
    this.translucency.sync(this.materials);
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
    this.threads.dispose();
    this.tracker.dispose();
  }
}
