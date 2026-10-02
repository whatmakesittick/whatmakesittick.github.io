import { Group, Vector3 } from 'three';
import type { Object3D } from 'three';
import { lerp } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import type { AssemblyState, PartId } from '../../../ids';
import { THEME } from '../../../theme';
import { BEAMS, LINKS } from '../../constants';
import type { PartContext } from '../context';
import type { DronePart } from '../drone/drone';
import { Beam } from './beam';
import { TrackEffect } from './track';

export interface EffectTargets {
  drone: DronePart;
  patchAntenna: Object3D;
  goggles: Object3D;
}

type EffectLabel = Extract<PartId, 'controlLink' | 'videoLink'>;

function beamLabel(beam: Beam): Object3D {
  return anchorAt(beam.mesh, 0, 0, 0);
}

function placeLabel(label: Object3D, from: Vector3, to: Vector3, share: number): void {
  label.position.set(0, from.distanceTo(to) * share, 0);
}

export class EffectsPart {
  readonly object = new Group();
  readonly labels: ReadonlyMap<EffectLabel, Object3D>;
  private readonly targets: EffectTargets;
  private readonly control: Beam;
  private readonly video: Beam;
  private readonly track: TrackEffect;
  private readonly controlLabel: Object3D;
  private readonly videoLabel: Object3D;
  private readonly from = new Vector3();
  private readonly to = new Vector3();

  constructor(context: PartContext, targets: EffectTargets) {
    this.targets = targets;
    this.control = new Beam(context, 'controlLink', BEAMS.control, THEME.controlLink);
    this.video = new Beam(context, 'videoLink', BEAMS.video, THEME.videoLink);
    this.track = new TrackEffect(context);
    this.controlLabel = beamLabel(this.control);
    this.videoLabel = beamLabel(this.video);
    this.object.add(this.track.mesh, this.control.mesh, this.video.mesh);
    this.labels = new Map<EffectLabel, Object3D>([
      ['controlLink', this.controlLabel],
      ['videoLink', this.videoLabel],
    ]);
  }

  setState(state: AssemblyState): void {
    const { drone, patchAntenna, goggles } = this.targets;
    const linked = state.view.links && state.flight.armed;
    const strength = lerp(LINKS.signalFloor, 1, state.link.signal);
    this.control.mesh.visible = linked;
    this.video.mesh.visible = linked;
    if (linked) {
      patchAntenna.getWorldPosition(this.from);
      drone.receiverEnd.getWorldPosition(this.to);
      this.control.span(this.from, this.to);
      this.control.setOpacity(BEAMS.control.opacity * strength);
      placeLabel(this.controlLabel, this.from, this.to, LINKS.labelShare.control);
      drone.videoAntennaTop.getWorldPosition(this.from);
      goggles.getWorldPosition(this.to);
      this.video.span(this.from, this.to);
      this.video.setOpacity(BEAMS.video.opacity * strength);
      placeLabel(this.videoLabel, this.from, this.to, LINKS.labelShare.video);
    }
    this.track.setState(state.phase, state.flight, state.view.track);
  }

  advance(deltaSeconds: number): void {
    this.control.advance(deltaSeconds);
    this.video.advance(deltaSeconds);
  }
}
