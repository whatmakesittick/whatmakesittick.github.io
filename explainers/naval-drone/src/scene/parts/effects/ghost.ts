import { AdditiveBlending, Group, Mesh, MeshBasicMaterial, Vector3 } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import type { AssemblyState } from '../../../ids';
import { BOAT, HULL_STATIONS } from '../../../model/layout';
import { GHOST } from '../../constants';
import { applyBoatPose } from '../../pose';
import { registered } from '../context';
import type { PartContext } from '../context';
import { Beam } from './beam';

const BOW = new Vector3(BOAT.halfLength, HULL_STATIONS[HULL_STATIONS.length - 1].deck, 0);

export class GhostPart {
  readonly object = new Group();
  readonly anchor = new Group();
  private readonly hull: Mesh;
  private readonly tether: Beam;
  private readonly from = new Vector3();
  private readonly to = new Vector3();

  constructor(context: PartContext, outline: BufferGeometry) {
    const material = new MeshBasicMaterial({
      color: GHOST.colour,
      transparent: true,
      opacity: GHOST.opacity,
      depthWrite: false,
      blending: AdditiveBlending,
      toneMapped: false,
    });
    this.hull = new Mesh(outline, registered(context, 'videoGhost', material));
    this.anchor.position.set(0, HULL_STATIONS[3].deck, 0);
    this.hull.add(this.anchor);
    this.tether = new Beam(context, 'videoGhost', GHOST.tether, GHOST.colour);
    this.tether.mesh.visible = true;
    this.object.add(this.hull, this.tether.mesh);
    this.object.visible = false;
  }

  setState(state: AssemblyState, boat: Object3D): void {
    const { ghost } = state.link;
    this.object.visible = ghost !== null;
    if (!ghost) return;
    applyBoatPose(this.hull, ghost, state.planing);
    this.hull.updateMatrixWorld(true);
    boat.updateMatrixWorld(true);
    this.tether.span(
      this.from.copy(BOW).applyMatrix4(this.hull.matrixWorld),
      this.to.copy(BOW).applyMatrix4(boat.matrixWorld),
    );
  }
}
