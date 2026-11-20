import { Group, Line, Mesh, Points, Sprite, Vector3 } from 'three';
import type { Box3, Material, Object3D, Color } from 'three';
import { FULL_TURN, lerp, smoothstep } from '@core/math';
import type { Steps } from '@core/scene/pacing';
import { isShown } from '@core/scene/parts';
import { ResourceTracker } from '@core/scene/resources';
import { activeScheme } from '@core/theme';
import { ANCHOR_IDS, PART_IDS } from '../ids';
import type { AnchorId, AssemblyState, DetailId, PartId, RegionId, StreamId } from '../ids';
import { CUTAWAY_SECONDS, ease } from '../model/cutaway';
import { ANCHOR_POINTS } from '../model/layout';
import { AXIS_HEIGHT_M, PERSON_POSITION, SPIN_SENSE, xAt } from '../model/scale';
import { COLD_BUFFER, HOT_BUFFER, particleCounts } from '../model/streams';
import type { ParticleCounts } from '../model/streams';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';
import { HEAT_LOOK, LOOK, PERSON, REVERSER, ROW_LOD_DISTANCE_M, STREAMS } from './constants';
import { FINISHES } from './finishes';
import { figureGeometry } from './geometry/figure';
import {
  COLD_CONTROLS,
  HOT_CONTROLS,
  REVERSED_CONTROLS,
  streamTable,
} from './geometry/streamPaths';
import { CombustorPart } from './parts/combustor';
import type { EmphasisGroup, PartContext } from './parts/context';
import { STRUCTURE_GROUP, label, material, mesh, namedGroup } from './parts/context';
import { buildHall } from './parts/hall';
import { GearboxPart } from './parts/gearbox';
import { buildDressing } from './parts/dressing';
import { buildFanDetails } from './parts/fanDetails';
import { standGeometry } from './geometry/stand';
import { CorePart } from './parts/core';
import { coreHalfAngle, cutHalfAngle, createCutUniforms } from './parts/cut';
import type { CutUniforms } from './parts/cut';
import { createTime } from './parts/effects';
import type { TimeUniform } from './parts/effects';
import { ExhaustPart } from './parts/exhaust';
import { FanPart } from './parts/fan';
import { createHeatUniforms } from './parts/heat';
import type { GlowScale, HeatUniforms } from './parts/heat';
import { buildNacelle } from './parts/nacelle';
import { ReverserPart } from './parts/reverser';
import { StreamMarker } from './parts/streams';
import { DustStream, StreamRibbons } from './parts/streamlines';
import type { StreamFrame, StreamLook } from './parts/streams';
import { regionBox } from './regions';

interface SharedUniforms {
  readonly cut: CutUniforms;
  readonly heat: HeatUniforms;
  readonly time: TimeUniform;
  readonly glow: Map<EmphasisGroup, GlowScale>;
}

let shared: SharedUniforms | null = null;

function sharedUniforms(): SharedUniforms {
  shared ??= {
    cut: createCutUniforms(LOOK.cutCap),
    heat: createHeatUniforms(),
    time: createTime(),
    glow: new Map(),
  };
  return shared;
}

const COLD_LOOK: StreamLook = {
  part: 'coldStream',
  buffer: COLD_BUFFER,
  width: STREAMS.coldWidth,
  length: STREAMS.coldLength,
  alpha: STREAMS.coldAlpha,
  speed: STREAMS.baseSpeed,
  marker: THEME.coldStream,
  gather: false,
  reversedAlpha: STREAMS.reversedAlpha,
  reversedWidth: STREAMS.reversedWidth,
};

const HOT_LOOK: StreamLook = {
  part: 'hotStream',
  buffer: HOT_BUFFER,
  width: STREAMS.hotWidth,
  length: STREAMS.hotLength,
  alpha: STREAMS.hotAlpha,
  speed: STREAMS.baseSpeed,
  marker: THEME.hotStream,
  gather: true,
  reversedAlpha: 1,
  reversedWidth: 1,
};

const STREAK_SHIFT = {
  dark: { saturation: 0.3, lightness: -0.1 },
  light: { saturation: 0.25, lightness: -0.26 },
} as const;
const STREAM_LABELS = { cold: { x: 2.55, radius: 1.16 }, hot: { x: 3.25, radius: 0.46 } } as const;
const PERSON_CHEST = 1.3;
const PERSON_CENTRE = 0.9;
const BLEND_RANGE = { from: 0.15, to: 0.85 } as const;

type Drawable = Mesh | Line | Points | Sprite;

function isDrawable(object: Object3D): object is Drawable {
  return (
    object instanceof Mesh ||
    object instanceof Line ||
    object instanceof Points ||
    object instanceof Sprite
  );
}

function adjustForScheme(colour: Color): Color {
  const shift = STREAK_SHIFT[activeScheme()];
  return colour.offsetHSL(0, shift.saturation, shift.lightness);
}

function emptyFrame(): StreamFrame {
  return { playing: false, deltaSeconds: 0, speed: 0, blend: 0, gap: 0, count: 0, markerX: 0 };
}

function completeLabels(found: ReadonlyMap<PartId, Object3D>): ReadonlyMap<PartId, Object3D> {
  return new Map(
    PART_IDS.map((id) => {
      const anchor = found.get(id);
      if (!anchor) throw new Error(`No label anchor for part ${id}`);
      return [id, anchor];
    }),
  );
}

interface Built {
  readonly context: PartContext;
  readonly engine: Group;
  readonly spools: { inner: Group; outer: Group };
  readonly fan: FanPart;
  readonly core: CorePart;
  readonly combustor: CombustorPart;
  readonly exhaust: ExhaustPart;
  readonly reverser: ReverserPart;
  readonly cold: StreamRibbons;
  readonly hot: StreamRibbons;
  readonly coldMarker: StreamMarker;
  readonly hotMarker: StreamMarker;
  readonly person: Group;
  readonly gearbox: GearboxPart;
  readonly dust: DustStream;
  readonly dressing: Group;
  readonly fanDetails: Group;
}

function buildPerson(context: PartContext, root: Group): Group {
  const person = namedGroup('person', root);
  person.position.set(...PERSON_POSITION);
  person.rotation.y = PERSON.facing;
  mesh(context, person, figureGeometry(), material(context, 'person', FINISHES.person));
  label(context, 'person', person, [0, PERSON_CHEST, 0]);
  return person;
}

function* buildParts(
  resources: AssemblyResources,
  root: Group,
  tracker: ResourceTracker,
): Steps<Built> {
  const uniforms = sharedUniforms();
  const context: PartContext = {
    materials: resources.materials,
    textures: resources.textures,
    tracker,
    labels: new Map(),
    ...uniforms,
  };
  const engine = namedGroup('engine', root);
  engine.position.y = AXIS_HEIGHT_M;
  const spools = {
    inner: namedGroup('innerSpool', engine),
    outer: namedGroup('outerSpool', engine),
  };
  buildNacelle(context, engine);
  yield;
  const fan = new FanPart(context, engine, spools.inner);
  yield;
  const core = new CorePart(context, engine, spools);
  yield* core.build();
  const combustor = new CombustorPart(context, engine);
  yield;
  const exhaust = new ExhaustPart(context, engine);
  const reverser = new ReverserPart(context, engine);
  yield;
  const coldTables = [
    streamTable(COLD_CONTROLS, 'cold', adjustForScheme),
    streamTable(REVERSED_CONTROLS, 'cold', adjustForScheme),
  ];
  const hotTables = [streamTable(HOT_CONTROLS, 'core', adjustForScheme)];
  const cold = new StreamRibbons(context, engine, COLD_LOOK, coldTables);
  const hot = new StreamRibbons(context, engine, HOT_LOOK, hotTables);
  label(context, 'coldStream', cold.root, [
    STREAM_LABELS.cold.x,
    STREAM_LABELS.cold.radius * 0.77,
    STREAM_LABELS.cold.radius * 0.64,
  ]);
  label(context, 'hotStream', hot.root, [
    STREAM_LABELS.hot.x,
    STREAM_LABELS.hot.radius * 0.77,
    STREAM_LABELS.hot.radius * 0.64,
  ]);
  const coldMarker = new StreamMarker(context, cold.root, COLD_LOOK, coldTables[0]);
  const hotMarker = new StreamMarker(context, hot.root, HOT_LOOK, hotTables[0]);
  const person = buildPerson(context, root);
  buildHall(context, root);
  yield;
  const gearbox = new GearboxPart(context, engine);
  const dust = new DustStream(context, engine);
  yield;
  const dressing = yield* buildDressing(context, engine);
  const fanDetails = buildFanDetails(context, engine, spools.inner);
  yield;
  mesh(
    context,
    namedGroup('stand', root),
    standGeometry(),
    material(context, STRUCTURE_GROUP, FINISHES.stand),
  );
  yield;
  return {
    context,
    engine,
    spools,
    gearbox,
    dust,
    dressing,
    fanDetails,
    fan,
    core,
    combustor,
    exhaust,
    reverser,
    cold,
    hot,
    coldMarker,
    hotMarker,
    person,
  };
}

class Ge9xAssembly implements Assembly {
  readonly root: Group;
  private readonly tracker: ResourceTracker;
  private readonly resources: AssemblyResources;
  private readonly parts: Built;
  private readonly labels: ReadonlyMap<PartId, Object3D>;
  private readonly anchors: ReadonlyMap<AnchorId, Object3D>;
  private state: AssemblyState;
  private cut: number;
  private deploy: number;
  private fanAngle = 0;
  private cameraDistance = 0;
  private readonly markerPoint = new Vector3();
  private counts: ParticleCounts = { cold: 0, hot: 0 };
  private countsDetail: DetailId | null = null;
  private countsStreams: StreamId | null = null;
  private readonly coldFrame: StreamFrame = emptyFrame();
  private readonly hotFrame: StreamFrame = emptyFrame();
  private readonly glows: readonly (readonly [EmphasisGroup, GlowScale])[];
  private coreAngle = 0;

  constructor(
    resources: AssemblyResources,
    root: Group,
    tracker: ResourceTracker,
    parts: Built,
    state: AssemblyState,
  ) {
    this.resources = resources;
    this.root = root;
    this.tracker = tracker;
    this.parts = parts;
    this.labels = completeLabels(parts.context.labels);
    this.anchors = this.buildAnchors();
    this.glows = [...parts.context.glow.entries()];
    this.state = state;
    this.cut = state.cutaway;
    this.deploy = state.reverser;
    this.setState(state);
    parts.fan.snapBlur();
    this.applyEases();
    this.refreshStreams(0, 0);
  }

  setState(state: AssemblyState): void {
    this.state = state;
    const { fan, combustor, exhaust, person, cold, hot } = this.parts;
    this.parts.context.heat.uHeat.value = state.heat;
    fan.setState(state.fanBlur, state.bladeOpacity);
    combustor.setState(state.heat, state.flame);
    const coldShown = state.streams !== 'hot';
    const hotShown = state.streams !== 'cold';
    exhaust.setState(state.heat, hotShown, coldShown, 1 - this.deploy, state.coldSpeed);
    person.visible = state.view.person;
    this.parts.dressing.visible = state.detail === 'near';
    cold.root.visible = coldShown;
    hot.root.visible = hotShown;
    this.refreshStreams(0, this.cameraDistance);
  }

  update(deltaSeconds: number, cameraDistance: number): boolean {
    const { playing } = this.state;
    this.cameraDistance = cameraDistance;
    const easing = this.cut !== this.state.cutaway || this.deploy !== this.state.reverser;
    this.cut = ease(this.cut, this.state.cutaway, deltaSeconds, CUTAWAY_SECONDS);
    this.deploy = ease(this.deploy, this.state.reverser, deltaSeconds, REVERSER.stageSeconds);
    this.applyEases();
    if (playing) this.spin(deltaSeconds);
    this.parts.gearbox.update(this.coreAngle);
    const blurMoving = this.parts.fan.update(deltaSeconds, this.fanAngle);
    this.parts.core.setFar(cameraDistance > ROW_LOD_DISTANCE_M);
    this.refreshStreams(playing ? deltaSeconds : 0, cameraDistance);
    this.scaleGlows();
    return playing || easing || blurMoving;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels;
  }

  anchor(id: AnchorId): Object3D {
    const found = this.anchors.get(id);
    if (!found) throw new Error(`Missing anchor ${id}`);
    return found;
  }

  region(id: RegionId): Box3 {
    return regionBox(id);
  }

  warmUp(compile: (object: Object3D) => void): void {
    const seen = new Set<Material | Material[]>();
    this.root.traverse((object) => {
      if (!isDrawable(object) || isShown(object) || seen.has(object.material)) return;
      seen.add(object.material);
      compile(object);
    });
  }

  dispose(): void {
    this.root.removeFromParent();
    this.resources.materials.clearRegistered();
    this.tracker.dispose();
  }

  private buildAnchors(): ReadonlyMap<AnchorId, Object3D> {
    const { person, coldMarker, hotMarker } = this.parts;
    const fixed = namedGroup('anchors', this.root);
    return new Map(
      ANCHOR_IDS.map((id): [AnchorId, Object3D] => {
        if (id === 'hotMarker') return [id, hotMarker.anchor];
        if (id === 'coldMarker') return [id, coldMarker.anchor];
        const anchor = namedGroup(id, id === 'person' ? person : fixed);
        if (id === 'person') anchor.position.set(0, PERSON_CENTRE, 0);
        else anchor.position.set(...ANCHOR_POINTS[id]);
        return [id, anchor];
      }),
    );
  }

  private spin(deltaSeconds: number): void {
    const { spools } = this.parts;
    this.fanAngle =
      (this.fanAngle + this.state.fanTurnsPerSecond * FULL_TURN * deltaSeconds) % FULL_TURN;
    this.coreAngle =
      (this.coreAngle + this.state.coreTurnsPerSecond * FULL_TURN * deltaSeconds) % FULL_TURN;
    spools.inner.rotation.x = SPIN_SENSE * this.fanAngle;
    spools.outer.rotation.x = SPIN_SENSE * this.coreAngle;
    this.parts.context.time.uTime.value += deltaSeconds;
  }

  private applyEases(): void {
    const open = smoothstep(this.cut, 0, 1);
    this.parts.context.cut.uCutHalf.value = cutHalfAngle(open);
    this.parts.context.cut.uCoreHalf.value = coreHalfAngle(open);
    this.parts.reverser.setDeploy(this.deploy);
    this.parts.exhaust.setState(
      this.state.heat,
      this.state.streams !== 'cold',
      this.state.streams !== 'hot',
      1 - this.deploy,
      this.state.coldSpeed,
    );
  }

  private refreshStreams(deltaSeconds: number, cameraDistance: number): void {
    const detail: DetailId =
      this.state.detail === 'far' || cameraDistance > ROW_LOD_DISTANCE_M ? 'far' : 'near';
    if (detail !== this.countsDetail || this.state.streams !== this.countsStreams) {
      this.counts = particleCounts(this.state.streams, detail);
      this.countsDetail = detail;
      this.countsStreams = this.state.streams;
    }
    const open = smoothstep(this.cut, 0, 1);
    const markerX = xAt(this.state.reading.axialFraction);
    const playing = this.state.playing && deltaSeconds > 0;
    const { coldFrame, hotFrame } = this;
    coldFrame.playing = playing;
    coldFrame.deltaSeconds = deltaSeconds;
    coldFrame.speed = this.state.coldSpeed;
    coldFrame.blend = smoothstep(this.deploy, BLEND_RANGE.from, BLEND_RANGE.to);
    coldFrame.gap = open > 0 ? cutHalfAngle(open) + STREAMS.cutMargin * open : 0;
    coldFrame.count = this.counts.cold;
    coldFrame.markerX = markerX;
    hotFrame.playing = playing;
    hotFrame.deltaSeconds = deltaSeconds;
    hotFrame.speed = this.state.hotSpeed;
    hotFrame.gap = coreHalfAngle(open);
    hotFrame.count = this.counts.hot;
    hotFrame.markerX = markerX;
    this.parts.cold.update(coldFrame);
    this.parts.hot.update(hotFrame);
    this.parts.dust.update(coldFrame, this.state.fanSpeed);
    this.parts.coldMarker.moveTo(this.parts.cold.markerPoint(markerX, this.markerPoint));
    this.parts.hotMarker.moveTo(this.parts.hot.markerPoint(markerX, this.markerPoint));
  }

  private scaleGlows(): void {
    const { materials } = this.resources;
    for (const [group, scale] of this.glows) {
      scale.uGlowScale.value = lerp(HEAT_LOOK.dimGlow, 1, materials.emphasisOf(group));
    }
  }
}

export function* createGe9xAssembly(
  resources: AssemblyResources,
  state: AssemblyState,
): Steps<Assembly> {
  const root = new Group();
  root.name = 'ge9x';
  const tracker = new ResourceTracker();
  const parts = yield* buildParts(resources, root, tracker);
  return new Ge9xAssembly(resources, root, tracker, parts, state);
}
