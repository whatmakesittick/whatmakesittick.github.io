import { Group, Object3D, TorusGeometry } from 'three';
import type { Mesh } from 'three';
import { SITE_PARTS, SITE_STATES } from '../../../ids';
import type { SiteState } from '../../../ids';
import { betaInState } from '../../../model/rotor';
import { SEAT_FORM } from '../../constants';
import { SEAT_FINISHES } from '../../finishes';
import { seatPoint } from '../../flow/molecules';
import { copyPoint } from '../../flow/points';
import { finishMesh } from '../context';
import type { PartContext } from '../context';

const QUARTER_TURN = Math.PI / 2;

function seatRing() {
  const { radius, tube, tubeSegments, ringSegments } = SEAT_FORM;
  return new TorusGeometry(radius, tube, tubeSegments, ringSegments).rotateX(QUARTER_TURN);
}

export class SeatsPart {
  readonly object = new Group();
  readonly labels: Readonly<Record<SiteState, Object3D>>;
  private readonly markers: Readonly<Record<SiteState, Mesh>>;

  constructor(context: PartContext) {
    const marker = (state: SiteState) =>
      finishMesh(context, seatRing(), SITE_PARTS[state], SEAT_FINISHES[state]);
    this.markers = { open: marker('open'), loose: marker('loose'), tight: marker('tight') };
    this.labels = { open: new Object3D(), loose: new Object3D(), tight: new Object3D() };
    SITE_STATES.forEach((state) => this.object.add(this.markers[state], this.labels[state]));
  }

  place(rotorDeg: number): void {
    for (const state of SITE_STATES) {
      const seat = seatPoint(betaInState(state, rotorDeg));
      copyPoint(this.labels[state].position, seat);
      copyPoint(this.markers[state].position, seat);
      this.markers[state].position.y -= SEAT_FORM.drop;
    }
  }
}
