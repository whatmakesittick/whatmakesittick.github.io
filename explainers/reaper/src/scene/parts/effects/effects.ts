import {
  AdditiveBlending,
  Group,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
  Vector3,
} from 'three';
import type { Object3D } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { AssemblyState, PartId } from '../../../ids';
import { THEME } from '../../../theme';
import { BEAMS, SENSOR_VIEW } from '../../constants';
import { GLOW_SPRITE } from '../../finishes';
import type { AircraftPart } from '../aircraft/aircraft';
import { registered } from '../context';
import type { PartContext } from '../context';
import { Beam } from './beam';
import { ImpactEffect } from './impact';
import { MissileEffect } from './missile';
import { TrackEffect } from './track';

export interface EffectTargets {
  aircraft: AircraftPart;
  mastTop: Object3D;
  satellite: Object3D;
}

type EffectLabel = Extract<PartId, 'losLink' | 'satLink' | 'laserBeam' | 'sensorCone' | 'missile'>;

const QUARTER_TURN = Math.PI / 2;
const FOOTPRINT_LIFT = 0.3;
const SPOT_LIFT = 0.6;
const PULSE_DEPTH = 0.25;

function beamLabel(beam: Beam): Object3D {
  return anchorAt(beam.mesh, 0, 0, 0);
}

function placeLabel(label: Object3D, from: Vector3, to: Vector3, share: number): void {
  label.position.set(0, from.distanceTo(to) * share, 0);
}

export class EffectsPart {
  readonly object = new Group();
  readonly labels: ReadonlyMap<EffectLabel, Object3D>;
  readonly missileAnchor: Object3D;
  private readonly targets: EffectTargets;
  private readonly satLink: Beam;
  private readonly losLink: Beam;
  private readonly cone: Beam;
  private readonly laser: Beam;
  private readonly footprint: Mesh;
  private readonly footprintMaterial: MeshBasicMaterial;
  private readonly spot = new Group();
  private readonly spotCore: Sprite;
  private readonly missile: MissileEffect;
  private readonly impact: ImpactEffect;
  private readonly track: TrackEffect;
  private readonly coneLabel: Object3D;
  private readonly laserLabel: Object3D;
  private readonly satLabel: Object3D;
  private readonly losLabel: Object3D;
  private readonly hump = new Vector3();
  private readonly ball = new Vector3();
  private readonly far = new Vector3();
  private readonly aim = new Vector3();
  private readonly rail = new Vector3();
  private pulse = 0;

  constructor(context: PartContext, targets: EffectTargets) {
    this.targets = targets;
    this.satLink = new Beam(context, 'satLink', BEAMS.sat, THEME.satLink);
    this.losLink = new Beam(context, 'losLink', BEAMS.los, THEME.losLink);
    this.cone = new Beam(context, 'sensorCone', BEAMS.cone, THEME.daylight);
    this.laser = new Beam(context, 'laserBeam', BEAMS.laser, THEME.laser);
    this.footprintMaterial = registered(
      context,
      'sensorCone',
      new MeshBasicMaterial({
        map: context.textures.glow,
        color: THEME.daylight,
        transparent: true,
        opacity: SENSOR_VIEW.footprintOpacity,
        blending: AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    const plane = context.tracker.track(new PlaneGeometry(2, 2));
    plane.rotateX(-QUARTER_TURN);
    this.footprint = new Mesh(plane, this.footprintMaterial);
    this.footprint.visible = false;
    const flare = (size: number) => {
      const material = registered(
        context,
        'laserBeam',
        new SpriteMaterial({ ...GLOW_SPRITE, map: context.textures.glow, color: THEME.laser }),
      );
      const sprite = new Sprite(material);
      sprite.scale.setScalar(size);
      return sprite;
    };
    this.spotCore = flare(SENSOR_VIEW.laserSpot);
    this.spot.add(flare(SENSOR_VIEW.laserGlow), this.spotCore);
    this.spot.visible = false;
    this.missile = new MissileEffect(
      context,
      targets.aircraft.weapons.hellfire,
      targets.aircraft.launchRail.position,
    );
    this.impact = new ImpactEffect(context);
    this.track = new TrackEffect(context);
    this.satLabel = beamLabel(this.satLink);
    this.losLabel = beamLabel(this.losLink);
    this.coneLabel = beamLabel(this.cone);
    this.laserLabel = beamLabel(this.laser);
    this.missileAnchor = this.missile.missile;
    this.object.add(
      this.track.object,
      this.satLink.mesh,
      this.losLink.mesh,
      this.cone.mesh,
      this.footprint,
      this.laser.mesh,
      this.spot,
      this.missile.object,
      this.impact.object,
    );
    this.labels = new Map<EffectLabel, Object3D>([
      ['losLink', this.losLabel],
      ['satLink', this.satLabel],
      ['laserBeam', this.laserLabel],
      ['sensorCone', this.coneLabel],
      ['missile', this.missileAnchor],
    ]);
  }

  setState(state: AssemblyState): void {
    const { aircraft, satellite } = this.targets;
    aircraft.hump.getWorldPosition(this.hump);
    aircraft.ball.getWorldPosition(this.ball);
    this.aim.set(...state.sensor.aim);
    this.placeLinks(state, satellite.getWorldPosition(this.far));
    this.placeSensor(state);
    aircraft.launchRail.getWorldPosition(this.rail);
    this.missile.setState(state.phase, state.strike, this.rail);
    this.impact.setState(state.phase, state.strike);
    this.track.setState(state.phase, state.view.track);
  }

  advance(deltaSeconds: number): void {
    this.satLink.advance(deltaSeconds);
    this.losLink.advance(deltaSeconds);
    this.cone.advance(deltaSeconds);
    this.missile.advance(deltaSeconds);
    this.pulse = (this.pulse + deltaSeconds * SENSOR_VIEW.spotPulse) % (Math.PI * 2);
    this.spotCore.scale.setScalar(SENSOR_VIEW.laserSpot * (1 + PULSE_DEPTH * Math.sin(this.pulse)));
  }

  private placeLinks(state: AssemblyState, satellite: Vector3): void {
    const linked = state.view.links;
    this.satLink.mesh.visible = linked && state.link === 'sat';
    this.losLink.mesh.visible = linked && state.link === 'los';
    if (this.satLink.mesh.visible) {
      this.satLink.span(this.hump, satellite);
      placeLabel(this.satLabel, this.hump, satellite, SENSOR_VIEW.beamLabelShare);
    }
    if (this.losLink.mesh.visible) {
      const mast = this.targets.mastTop.getWorldPosition(this.far);
      this.losLink.span(this.hump, mast);
      placeLabel(this.losLabel, this.hump, mast, SENSOR_VIEW.beamLabelShare);
    }
  }

  private placeSensor(state: AssemblyState): void {
    const { sensor, flight } = state;
    const { ball, aim } = this;
    const footprint = ball.distanceTo(aim) * Math.tan(SENSOR_VIEW.halfAngle);
    const looking = sensor.mode !== 'laser' && !flight.onGround;
    this.cone.mesh.visible = looking;
    this.footprint.visible = looking;
    if (looking) {
      const colour = sensor.mode === 'infrared' ? THEME.infrared : THEME.daylight;
      this.cone.setColour(colour);
      this.footprintMaterial.color.set(colour);
      this.cone.span(ball, aim, footprint);
      placeLabel(this.coneLabel, ball, aim, SENSOR_VIEW.labelShare);
      this.footprint.position.set(aim.x, aim.y + FOOTPRINT_LIFT, aim.z);
      this.footprint.scale.setScalar(footprint);
    }
    const lasing = sensor.lasing || (sensor.mode === 'laser' && sensor.onTarget);
    this.laser.mesh.visible = lasing;
    this.spot.visible = lasing;
    if (lasing) {
      this.laser.span(ball, aim);
      placeLabel(this.laserLabel, ball, aim, SENSOR_VIEW.beamLabelShare);
      this.spot.position.set(aim.x, aim.y + SPOT_LIFT, aim.z);
    }
  }
}
