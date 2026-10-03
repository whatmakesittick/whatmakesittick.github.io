import { Group, Vector3 } from 'three';
import type { MeshStandardMaterial, Object3D } from 'three';
import type { AssemblyState, PartId } from '../../../ids';
import { BACKUP_PANEL_X, PANEL, STARLINK_PANEL_XS } from '../../../model/layout';
import { THEME } from '../../../theme';
import { BEAMS } from '../../constants';
import type { PartContext } from '../context';
import { Beam } from './beam';

export interface LinkEnds {
  body: Object3D;
  satellite: Object3D;
  backupSatellite: Object3D;
  station: Object3D;
  starlinkGlow: MeshStandardMaterial;
  backupGlow: MeshStandardMaterial;
}

class LinkBundle {
  readonly group = new Group();
  readonly anchor = new Group();
  readonly ups: Beam[];
  readonly down: Beam;

  constructor(context: PartContext, id: PartId, colour: string, count: number) {
    this.ups = Array.from({ length: count }, () => new Beam(context, id, BEAMS.up, colour));
    this.down = new Beam(context, id, BEAMS.down, colour);
    [...this.ups, this.down].forEach((beam) => {
      beam.mesh.visible = true;
      this.group.add(beam.mesh);
    });
    this.ups[0].mesh.add(this.anchor);
  }

  beams(): Beam[] {
    return [...this.ups, this.down];
  }
}

export class LinksPart {
  readonly object = new Group();
  private readonly starlink: LinkBundle;
  private readonly backup: LinkBundle;
  private readonly start = new Vector3();
  private readonly sky = new Vector3();
  private readonly ground = new Vector3();

  constructor(context: PartContext) {
    this.starlink = new LinkBundle(context, 'satLink', THEME.satLink, STARLINK_PANEL_XS.length);
    this.backup = new LinkBundle(context, 'backupLink', THEME.backupLink, 1);
    this.object.add(this.starlink.group, this.backup.group);
  }

  get satAnchor(): Object3D {
    return this.starlink.anchor;
  }

  get backupAnchor(): Object3D {
    return this.backup.anchor;
  }

  setState(state: AssemblyState, ends: LinkEnds): void {
    const mode = state.view.links ? state.link.mode : 'lost';
    this.starlink.group.visible = mode === 'satellite';
    this.backup.group.visible = mode === 'backup';
    ends.starlinkGlow.emissiveIntensity = state.link.mode === 'satellite' ? BEAMS.panelGlow : 0;
    ends.backupGlow.emissiveIntensity = state.link.mode === 'backup' ? BEAMS.panelGlow : 0;
    ends.body.updateMatrixWorld(true);
    ends.station.getWorldPosition(this.ground);
    this.place(this.starlink, STARLINK_PANEL_XS, ends.satellite, ends.body);
    this.place(this.backup, [BACKUP_PANEL_X], ends.backupSatellite, ends.body);
  }

  private place(
    bundle: LinkBundle,
    xs: readonly number[],
    satellite: Object3D,
    body: Object3D,
  ): void {
    satellite.getWorldPosition(this.sky);
    bundle.ups.forEach((beam, index) => {
      this.start.set(xs[index], PANEL.top, 0).applyMatrix4(body.matrixWorld);
      beam.span(this.start, this.sky);
    });
    bundle.down.span(this.sky, this.ground);
    const length = this.start.distanceTo(this.sky);
    bundle.anchor.position.set(0, length * BEAMS.labelShare, 0);
  }

  advance(deltaSeconds: number): void {
    [...this.starlink.beams(), ...this.backup.beams()].forEach((beam) =>
      beam.advance(deltaSeconds),
    );
  }
}
