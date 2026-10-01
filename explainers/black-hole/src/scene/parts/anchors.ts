import { Group } from 'three';
import type { Object3D, Vector3 } from 'three';
import { anchorAt } from '@core/scene/parts';
import type { AnchorId, PartId } from '../../ids';
import { ANCHOR_POINTS, BEACON_ANCHOR_SHARE } from '../constants';

export interface AnchorHosts {
  probe: Object3D;
  ship: Object3D;
  sheetProbe: Object3D;
  system: Object3D;
}

export class SceneAnchors {
  readonly labels = new Map<PartId, Object3D>();
  readonly anchors = new Map<AnchorId, Object3D>();
  readonly hole = new Group();
  readonly disc = new Group();
  private readonly beacon: Object3D;

  constructor(root: Object3D, hosts: AnchorHosts) {
    root.add(this.hole, this.disc);
    this.labels.set('horizon', anchorAt(this.hole, ...ANCHOR_POINTS.horizon));
    this.labels.set('photonSphere', anchorAt(this.hole, ...ANCHOR_POINTS.photonSphere));
    this.labels.set('disc', anchorAt(this.disc, ...ANCHOR_POINTS.disc));
    this.labels.set('probe', anchorAt(hosts.probe, 0, 0, 0));
    this.labels.set('ship', anchorAt(hosts.ship, 0, 0, 0));
    this.labels.set('sheetProbe', anchorAt(hosts.sheetProbe, 0, 0, 0));
    this.beacon = anchorAt(hosts.system, 0, 0, 0);
    this.labels.set('beacon', this.beacon);
    this.anchors.set('probe', this.label('probe'));
    this.anchors.set('ship', this.label('ship'));
    this.anchors.set('hole', anchorAt(root, 0, 0, 0));
  }

  set(probeAt: Vector3, shipAt: Vector3, holeShown: boolean, discShown: boolean): void {
    this.beacon.position.lerpVectors(probeAt, shipAt, BEACON_ANCHOR_SHARE);
    this.hole.visible = holeShown;
    this.disc.visible = discShown;
  }

  label(id: PartId): Object3D {
    const anchor = this.labels.get(id);
    if (!anchor) throw new Error(`Unknown label ${id}`);
    return anchor;
  }

  anchor(id: AnchorId): Object3D {
    const anchor = this.anchors.get(id);
    if (!anchor) throw new Error(`Unknown anchor ${id}`);
    return anchor;
  }
}
