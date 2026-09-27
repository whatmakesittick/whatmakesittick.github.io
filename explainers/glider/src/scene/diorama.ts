import { Group, Vector3 } from 'three';
import type { Box3, Object3D } from 'three';
import type { MaterialLibrary } from '@core/scene/materials';
import { ResourceTracker } from '@core/scene/resources';
import type { SceneTextures } from '@core/scene/textures';
import {
  PHASE_RANGES,
  bankAt,
  flightState,
  kmhToMetresPerSecond,
  legAt,
  legLift,
  pitchFor,
  poseAt,
} from '../model';
import type { FlightState, GliderType, PhaseId } from '../model';
import type { PartId, ViewOptions } from '../state';
import type { ChaseTarget } from './cameraViews';
import { FORCE_ARROWS, METRES_PER_UNIT, WAVE } from './constants';
import { AirflowPart } from './parts/airflow';
import type { AirLifts } from './parts/airflow';
import { CloudsPart } from './parts/clouds';
import { anchorAt } from './parts/context';
import type { PartContext } from './parts/context';
import { ForceArrows } from './parts/forces';
import type { ForceShares } from './parts/forces';
import { GliderModel } from './parts/glider';
import type { Attitude } from './parts/glider';
import { createTerrain } from './parts/terrain';
import { ThermalPart } from './parts/thermal';
import { createWindArrows } from './parts/windArrows';
import { regionBox } from './regions';
import type { RegionId } from './regions';
import { waveY } from './streams';

export interface DioramaResources {
  materials: MaterialLibrary;
  textures: SceneTextures;
}

export interface DioramaFrame {
  phase: number;
  flightSeconds: number;
}

type Lifts = AirLifts & { thermal: number };

function phaseLift(phase: PhaseId, type: GliderType): number {
  return legLift(legAt(PHASE_RANGES[phase].start), type);
}

function airLifts(type: GliderType): Lifts {
  return {
    thermal: phaseLift('thermal', type),
    ridge: phaseLift('ridge', type),
    wave: phaseLift('wave', type),
  };
}

function forceShares(state: FlightState, bank: number): ForceShares {
  const descent = Math.asin(state.sink / kmhToMetresPerSecond(state.airspeed));
  return {
    lift: Math.cos(descent) / Math.cos(bank),
    drag: Math.sin(descent) * FORCE_ARROWS.dragEmphasis,
  };
}

export class Diorama {
  readonly root = new Group();
  private readonly tracker = new ResourceTracker();
  private readonly materials: MaterialLibrary;
  private readonly glider: GliderModel;
  private readonly forces: ForceArrows;
  private readonly thermal: ThermalPart;
  private readonly clouds: CloudsPart;
  private readonly airflow: AirflowPart;
  private readonly anchors: Map<PartId, Object3D>;
  private heading = 0;
  private lifts: Lifts;
  private type: GliderType;

  constructor(resources: DioramaResources, type: GliderType) {
    this.materials = resources.materials;
    this.type = type;
    this.lifts = airLifts(type);
    const context: PartContext = { ...resources, tracker: this.tracker };
    const terrain = createTerrain(context);
    const wind = createWindArrows(context);
    this.glider = new GliderModel(context, type);
    this.forces = new ForceArrows(context);
    this.thermal = new ThermalPart(context);
    this.clouds = new CloudsPart(context);
    this.airflow = new AirflowPart(context);
    this.glider.object.add(this.forces.object);
    this.root.add(
      terrain.object,
      wind.object,
      this.thermal.object,
      this.clouds.object,
      this.airflow.object,
      this.glider.object,
    );
    const waveAnchor = anchorAt(this.root, WAVE.labelX, waveY(WAVE.labelX, WAVE.labelY), 0);
    this.anchors = new Map<PartId, Object3D>([
      ...(Object.entries(this.glider.anchors) as [PartId, Object3D][]),
      ...(Object.entries(this.forces.anchors) as [PartId, Object3D][]),
      ...(Object.entries(this.clouds.anchors) as [PartId, Object3D][]),
      ['field', terrain.fieldAnchor],
      ['ridge', terrain.ridgeAnchor],
      ['thermal', this.thermal.anchor],
      ['wind', wind.labelAnchor],
      ['wave', waveAnchor],
    ]);
  }

  get gliderAnchor(): Object3D {
    return this.glider.object;
  }

  setView(view: ViewOptions): void {
    this.forces.setVisible(view.forces);
    this.thermal.setAirVisible(view.air);
    this.airflow.setVisible(view.air);
  }

  setGlider(type: GliderType): void {
    this.type = type;
    this.lifts = airLifts(type);
    this.glider.setType(type);
  }

  update({ phase, flightSeconds }: DioramaFrame): void {
    this.placeGlider(phase);
    this.thermal.update(this.lifts.thermal, flightSeconds);
    this.airflow.update(this.lifts, flightSeconds);
    this.clouds.update(phase);
  }

  chaseTarget(): ChaseTarget {
    return {
      position: this.glider.object.getWorldPosition(new Vector3()),
      heading: this.heading,
    };
  }

  labelAnchors(): ReadonlyMap<string, Object3D> {
    return this.anchors;
  }

  region(id: RegionId): Box3 {
    return regionBox(id);
  }

  dispose(): void {
    this.root.removeFromParent();
    this.glider.dispose();
    this.materials.clearRegistered();
    this.tracker.dispose();
  }

  private placeGlider(phase: number): void {
    const state = flightState(phase, this.type);
    const pose = poseAt(phase);
    const attitude: Attitude = {
      heading: pose.heading,
      pitch: pitchFor(state.airspeed),
      bank: bankAt(phase, state.airspeed),
    };
    this.heading = pose.heading;
    this.glider.object.position.set(pose.x, state.height / METRES_PER_UNIT, pose.z);
    this.glider.setAttitude(attitude);
    this.forces.update(attitude, forceShares(state, attitude.bank));
  }
}
