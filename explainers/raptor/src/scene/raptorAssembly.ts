import { Group } from 'three';
import type { Box3, Object3D } from 'three';
import { toRadians } from '@core/math';
import type { MaterialLibrary } from '@core/scene/materials';
import { regionFromSpec } from '@core/scene/regions';
import { ResourceTracker } from '@core/scene/resources';
import { STREAM_IDS } from '../ids';
import type { AnchorId, AssemblyState, PartId, RegionId } from '../ids';
import { PREBURNERS, START_SEQUENCE, engineState, plumeShape, wallRadius } from '../model';
import type { Canister, EngineState, PumpSide } from '../model';
import { THEME } from '../theme';
import type { Assembly, AssemblyResources } from './assembly';
import { CHAMBER_FLAME, FLOW, GLOW, SEGMENTS, SPIN, SURFACES } from './constants';
import { createFinishes } from './finishes';
import { smoothStrand } from './geometry/profile';
import type { Strand } from './geometry/revolve';
import { createSurfaceTextures } from './geometry/surfaceTextures';
import type { SurfaceTextures } from './geometry/surfaceTextures';
import { ClusterPart } from './parts/cluster/cluster';
import { CutawaySwitch } from './parts/context';
import type { PartContext } from './parts/context';
import { MountPart } from './parts/engine/mount';
import { PowerheadPart } from './parts/engine/powerhead';
import { ignitionFlash } from './parts/engine/preburner';
import { ThrustChamberPart } from './parts/engine/thrustChamber';
import { FlameVolume } from './parts/flame/flameVolume';
import { PlumePart } from './parts/flame/plume';
import { FlowStreamsPart } from './parts/flow/flowStreams';
import { LabelAnchors } from './parts/labels';
import { REGIONS } from './regions';
import { SkyDomePart } from './parts/sky/skyDome';

const PUMP_SIDES: readonly PumpSide[] = ['oxygen', 'methane'];
const PUMP_DIRECTION: Readonly<Record<PumpSide, number>> = { oxygen: 1, methane: -1 };
const CHAMBER_FLAME_GLOW = 0.8;
const FLAME_YELLOW = '#ffc861';
const PINK_CORE = '#ffd6e6';
const PREBURNER_FLAME_GLOW = 0.5;
const PREBURNER_FLAME_SAMPLES = 16;

export function preburnerFlameStrand(canister: Canister): Strand {
  const { top, bottom, radius } = canister;
  const middle = (top + bottom) / 2;
  return smoothStrand(
    [
      [0.1, top - 4],
      [radius * 0.4, top - 6],
      [radius * 0.46, middle],
      [radius * 0.38, bottom + 8],
      [radius * 0.2, bottom + 3],
      [0.1, bottom + 1.5],
    ],
    PREBURNER_FLAME_SAMPLES,
  );
}

function chamberFlameStrand(): Strand {
  const samples = CHAMBER_FLAME.samples;
  return Array.from({ length: samples + 1 }, (_, index) => {
    const y = CHAMBER_FLAME.top + ((CHAMBER_FLAME.bottom - CHAMBER_FLAME.top) * index) / samples;
    return [wallRadius(y) * CHAMBER_FLAME.share, y] as const;
  });
}

export class RaptorAssembly implements Assembly {
  readonly root = new Group();
  private readonly engine = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly surfaces: SurfaceTextures;
  private readonly cutaway = new CutawaySwitch();
  private readonly mount: MountPart;
  private readonly powerhead: PowerheadPart;
  private readonly thrustChamber: ThrustChamberPart;
  private readonly plume: PlumePart;
  private readonly chamberFlame: FlameVolume;
  private readonly preburnerFlames: Readonly<Record<PumpSide, FlameVolume>>;
  private readonly flow: FlowStreamsPart;
  private readonly cluster: ClusterPart;
  private readonly labels: LabelAnchors;
  private readonly sky: SkyDomePart;
  private readonly spinAngle: Record<PumpSide, number> = { oxygen: 0, methane: 0 };
  private phase: number | null = null;

  constructor(resources: AssemblyResources, state: AssemblyState) {
    this.materials = resources.materials;
    this.surfaces = this.tracker.track(
      createSurfaceTextures(SURFACES.brushed, SURFACES.channels, SURFACES.heat, SURFACES.panels),
    );
    const context: PartContext = {
      ...resources,
      tracker: this.tracker,
      finishes: createFinishes(this.surfaces),
      cutaway: this.cutaway,
    };
    this.mount = new MountPart(context);
    this.powerhead = new PowerheadPart(context);
    this.thrustChamber = new ThrustChamberPart(context);
    this.plume = new PlumePart(context);
    this.chamberFlame = new FlameVolume(
      context,
      chamberFlameStrand(),
      'chamber',
      { hot: THEME.flameCore, mid: FLAME_YELLOW, cool: THEME.flame, segments: SEGMENTS.part },
      this.plume.uniforms.uTime,
    );
    this.preburnerFlames = {
      oxygen: this.preburnerFlame(context, 'oxygen'),
      methane: this.preburnerFlame(context, 'methane'),
    };
    this.flow = new FlowStreamsPart(context);
    this.cluster = new ClusterPart(context, this.plume.material, this.plume.uniforms.uTime);
    this.engine.add(
      this.mount.hanging,
      this.powerhead.object,
      this.thrustChamber.object,
      this.chamberFlame.mesh,
      this.preburnerFlames.oxygen.mesh,
      this.preburnerFlames.methane.mesh,
      this.flow.object,
      this.plume.object,
    );
    this.sky = new SkyDomePart(context);
    this.root.add(
      this.sky.mesh,
      this.mount.fixed,
      this.engine,
      this.cluster.object,
      this.cluster.light,
    );
    const plumeOffset = this.plume.object.position.toArray();
    const streamHost = { object: this.flow.object, offset: [0, 0, 0] as const };
    this.labels = new LabelAnchors(this.engine, this.cluster.object, {
      plume: { object: this.plume.labelHost, offset: plumeOffset },
      shockDiamonds: { object: this.plume.diamondHost, offset: plumeOffset },
      ...Object.fromEntries(STREAM_IDS.map((id) => [id, streamHost])),
    });
    this.setState(state);
  }

  setState(state: AssemblyState): void {
    const engine = engineState(state.phase);
    const shape = plumeShape(engine.throttle, engine.airPressurePa);
    const cut = state.view.cutaway;
    if (cut !== this.cutaway.isCut || this.phase === null) {
      this.cutaway.set(cut);
      this.labels.setCutaway(cut);
    }
    this.sky.setAltitude(engine.altitudeKm);
    this.engine.rotation.set(toRadians(engine.gimbal.pitch), 0, toRadians(engine.gimbal.yaw));
    this.mount.follow(this.engine);
    this.applyFire(engine, state);
    this.plume.setShape(shape, engine.airPressurePa, state.view.flame, state.view.cluster);
    this.labels.setPlume(shape);
    this.flow.setShown(state.view.flow);
    this.flow.setEmphasis(state.propellant, engine.preburnerGlow);
    this.cluster.setShown(state.view.cluster);
    if (state.view.cluster) this.cluster.setGimbal(engine.gimbal);
    this.cluster.setFire(
      engine.chamberGlow,
      shape,
      engine.airPressurePa,
      state.view.flame && state.view.cluster,
    );
    this.advance(state.phase, engine);
  }

  update(deltaSeconds: number, _cameraDistance: number): boolean {
    const moving =
      this.plume.lit ||
      this.chamberFlame.mesh.visible ||
      this.preburnerFlames.oxygen.mesh.visible ||
      this.preburnerFlames.methane.mesh.visible;
    if (moving) this.plume.advance(deltaSeconds);
    return moving;
  }

  labelAnchors(): ReadonlyMap<PartId, Object3D> {
    return this.labels.labels;
  }

  anchor(id: AnchorId): Object3D {
    const anchor = this.labels.anchors.get(id);
    if (!anchor) throw new Error(`Unknown anchor ${id}`);
    return anchor;
  }

  region(id: RegionId): Box3 {
    this.root.updateMatrixWorld(true);
    return regionFromSpec(REGIONS[id]).applyMatrix4(this.root.matrixWorld);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private preburnerFlame(context: PartContext, side: PumpSide): FlameVolume {
    const canister = PREBURNERS[side];
    const flame = new FlameVolume(
      context,
      preburnerFlameStrand(canister),
      side === 'oxygen' ? 'oxygenPreburner' : 'methanePreburner',
      {
        hot: side === 'oxygen' ? THEME.flameCore : PINK_CORE,
        mid: side === 'oxygen' ? FLAME_YELLOW : THEME.methaneRichGas,
        cool: side === 'oxygen' ? THEME.oxygenRichGas : THEME.flame,
        segments: SEGMENTS.small,
      },
      this.plume.uniforms.uTime,
    );
    flame.mesh.position.set(canister.centre[0], 0, canister.centre[2]);
    return flame;
  }

  private applyFire(engine: EngineState, state: AssemblyState): void {
    const cut = state.view.cutaway;
    this.thrustChamber.setGlow(engine.chamberGlow);
    const flash = ignitionFlash(
      engine.time,
      START_SEQUENCE.preburnerLight,
      GLOW.preburnerFlashSeconds,
    );
    for (const side of PUMP_SIDES) {
      this.powerhead.preburners[side].setGlow(flash, engine.preburnerGlow);
      this.preburnerFlames[side].setIntensity(engine.preburnerGlow * PREBURNER_FLAME_GLOW, cut);
    }
    this.chamberFlame.setIntensity(
      engine.chamberGlow * CHAMBER_FLAME_GLOW,
      cut && state.view.flame,
    );
  }

  private advance(phase: number, engine: EngineState): void {
    const previous = this.phase;
    this.phase = phase;
    if (previous === null) return;
    const step = phase - previous;
    if (step === 0 || Math.abs(step) > Math.max(SPIN.maxStepSeconds, FLOW.maxStepSeconds)) return;
    for (const side of PUMP_SIDES) {
      this.spinAngle[side] +=
        step * engine.spin * SPIN.turnsPerSecond * Math.PI * 2 * PUMP_DIRECTION[side];
      this.powerhead.pumps[side].setAngle(this.spinAngle[side]);
    }
    if (this.flow.shown) this.flow.advance(step, engine.spin);
  }
}
