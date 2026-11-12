import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import type { Steps } from '@core/scene/pacing';
import { anchorAt } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { ANCHOR_IDS } from '../ids';
import type { AnchorId, AssemblyState, CameraView, ChaseTarget, PartId, RegionId } from '../ids';
import { PLAYED_KEY, cutX, mm, restAnchorPoint } from '../model';
import type { Assembly, AssemblyResources } from './assembly';
import type { Frame, PartContext, Section } from './parts/context';
import { createCut, setCut } from './parts/cut';
import { Ease } from './parts/ease';
import { createAction } from './parts/action/action';
import { createCase } from './parts/case/case';
import { createGhosts } from './parts/ghosts/ghosts';
import { createInset } from './parts/inset/inset';
import { createInterior } from './parts/interior/interior';
import { createKeyboard } from './parts/keyboard/keyboard';
import { createStage } from './parts/stage/stage';
import { chaseTargetFor } from './pose';
import { regionFor } from './regions';

const ROOT_NAME = 'piano';

class PianoAssembly implements Assembly {
  readonly root = new Group();
  private readonly materials: MaterialLibrary;
  private readonly tracker: ResourceTracker;
  private readonly context: PartContext;
  private readonly sections: readonly Section[];
  private readonly anchors: Readonly<Record<AnchorId, Object3D>>;
  private readonly fallbacks = new Map<AnchorId, Object3D>();
  private readonly shift: Ease;
  private state: AssemblyState;
  private elapsed = 0;

  constructor(
    resources: AssemblyResources,
    state: AssemblyState,
    context: PartContext,
    sections: readonly Section[],
  ) {
    this.materials = resources.materials;
    this.root.name = ROOT_NAME;
    this.context = context;
    this.tracker = context.tracker;
    this.sections = sections;
    this.sections.forEach((section) => this.root.add(section.root));
    this.anchors = Object.fromEntries(
      ANCHOR_IDS.map((id) => [id, this.context.anchors[id] ?? this.fallback(id)]),
    ) as Record<AnchorId, Object3D>;
    this.shift = new Ease(state.action.shiftMm);
    this.state = state;
    this.setState(state);
    this.animate(0, 0);
  }

  setState(state: AssemblyState): void {
    this.state = state;
    this.shift.aim(state.action.shiftMm);
    this.placeCut();
    this.placeFallbacks();
    this.sections.forEach((section) => section.setState(state));
  }

  update(deltaSeconds: number, cameraDistance: number): boolean {
    const shifting = this.shift.running;
    this.shift.step(deltaSeconds);
    if (shifting) this.placeCut();
    const moving = this.animate(deltaSeconds, cameraDistance);
    return moving || shifting;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.context.labels;
  }

  anchor(id: AnchorId): Object3D {
    return this.anchors[id];
  }

  region(id: RegionId): Box3 {
    const { view, compare } = this.state;
    return regionFor(id, this.playedKey(), {
      ghost: view.ghost || view.lineUp,
      inset: view.inset,
      compare,
    });
  }

  chaseTarget(): ChaseTarget {
    return chaseTargetFor(this.playedKey(), this.state.action);
  }

  focus(view: CameraView): void {
    this.sections.forEach((section) => section.focus?.(view));
  }

  warmUp(compile: (object: Object3D) => void): void {
    this.sections.forEach((section) => section.warmUp?.(compile));
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private playedKey(): number {
    return PLAYED_KEY[this.state.register];
  }

  private placeCut(): void {
    const x = cutX(this.playedKey()) + mm(this.shift.value);
    setCut(this.context.cut, this.state.view.cutaway, x);
  }

  private fallback(id: AnchorId): Object3D {
    const anchor = anchorAt(this.root, 0, 0, 0);
    this.fallbacks.set(id, anchor);
    return anchor;
  }

  private placeFallbacks(): void {
    const key = this.playedKey();
    this.fallbacks.forEach((anchor, id) => anchor.position.set(...restAnchorPoint(id, key)));
  }

  private animate(delta: number, cameraDistance: number): boolean {
    this.elapsed += delta;
    const frame: Frame = { delta, elapsed: this.elapsed, cameraDistance };
    return this.sections
      .map((section) => section.animate?.(frame, this.state) ?? false)
      .some(Boolean);
  }
}

export function* buildPianoAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Steps<Assembly> {
  const context: PartContext = {
    materials: resources.materials,
    textures: resources.textures,
    tracker: new ResourceTracker(),
    labels: new Map(),
    anchors: {},
    cut: createCut(),
  };
  const stage = createStage(context);
  yield;
  const pianoCase = yield* createCase(context);
  yield;
  const interior = yield* createInterior(context);
  yield;
  const keyboard = createKeyboard(context);
  const action = createAction(context);
  yield;
  const ghosts = createGhosts(context);
  const inset = createInset(context);
  const sections = [stage, pianoCase, interior, keyboard, action, ghosts, inset];
  return new PianoAssembly(resources, state, context, sections);
}
