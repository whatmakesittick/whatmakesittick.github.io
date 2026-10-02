import { CylinderGeometry, Group } from 'three';
import type { BufferGeometry, Object3D, Mesh } from 'three';
import { extrudeProfileAlongX, roundedRectShape } from '@core/scene/geometry/extrude';
import { anchorAt } from '@core/scene/parts';
import type { LoadId } from '../../../ids';
import { GBU12, HELLFIRE_SHAPE, LAUNCHER, PYLON, STORE_GAP } from '../../constants';
import { FINISHES } from '../../finishes';
import { airfoilSurface } from '../../geometry/airfoilSurface';
import type { LoopPoint, Station } from '../../geometry/airfoilSurface';
import { finRing, turnedSlice } from '../../geometry/turned';
import { chordLineY, wingSurfaceY } from '../../geometry/wing';
import { mergeParts, partMesh } from '../context';
import type { EmphasisGroup, PartContext } from '../context';

const QUARTER_TURN = Math.PI / 2;
const SIDES = [1, -1] as const;
const LAUNCHER_ROUNDING = 0.04;
const RAIL_THICKNESS = 0.025;
const PYLON_TOP_SHARE = 0.3;
const PYLON_SINK = 0.04;

export interface HellfireGeometry {
  body: BufferGeometry;
  seeker: BufferGeometry;
  fins: BufferGeometry;
}

export interface WeaponAnchors {
  pylon: Object3D;
  hellfire: Object3D;
  bomb: Object3D;
}

export function storeCentreY(span: number): number {
  return PYLON.storeY + chordLineY(span) - chordLineY(PYLON.stations.inboard);
}

function pylonBottom(span: number): number {
  return storeCentreY(span) + GBU12.radius + STORE_GAP;
}

function pylonGeometry(loop: readonly LoopPoint[]): BufferGeometry {
  const spans = Object.values(PYLON.stations);
  return mergeParts(
    spans.flatMap((span) =>
      SIDES.map((side) => {
        const top = wingSurfaceY(span, PYLON_TOP_SHARE, false) + PYLON_SINK;
        const station = (y: number, chord: number, back: number): Station => ({
          leadingEdge: [PYLON.x + PYLON.rootChord / 2 - back, y, side * span],
          chordAxis: [-1, 0, 0],
          normalAxis: [0, 0, 1],
          chord,
          thickness: PYLON.thickness,
          camber: 0,
        });
        return airfoilSurface(
          [
            station(top, PYLON.rootChord, 0),
            station(pylonBottom(span), PYLON.tipChord, PYLON.sweepBack),
          ],
          loop,
        );
      }),
    ),
  );
}

export function createHellfireGeometry(loop: readonly LoopPoint[]): HellfireGeometry {
  const shape = HELLFIRE_SHAPE;
  const nose = shape.length / 2;
  return {
    seeker: turnedSlice(shape, 0, shape.seekerUntil, nose),
    body: turnedSlice(shape, shape.seekerUntil, shape.length, nose),
    fins: mergeParts([
      ...finRing(shape, shape.canards, nose, loop),
      ...finRing(shape, shape.wings, nose, loop),
    ]),
  };
}

export function hellfireMeshes(
  context: PartContext,
  geometry: HellfireGeometry,
  group: EmphasisGroup,
): Mesh[] {
  return [
    partMesh(context, geometry.body, group, FINISHES.olive),
    partMesh(context, geometry.seeker, group, FINISHES.glass),
    partMesh(context, geometry.fins, group, FINISHES.olive),
  ];
}

function bombGeometry(loop: readonly LoopPoint[]) {
  const shape = GBU12;
  const nose = shape.length * shape.forwardShare;
  const band = new CylinderGeometry(
    shape.radius + shape.band.lift,
    shape.radius + shape.band.lift,
    shape.band.width,
    shape.segments,
  );
  band.rotateZ(QUARTER_TURN);
  band.translate(nose - shape.band.at, 0, 0);
  return {
    seeker: turnedSlice(shape, 0, shape.seekerUntil, nose),
    guidance: turnedSlice(shape, shape.seekerUntil, shape.guidanceUntil, nose),
    body: mergeParts([
      turnedSlice(shape, shape.guidanceUntil, shape.length, nose),
      ...finRing(shape, shape.canards, nose, loop),
      ...finRing(shape, shape.wings, nose, loop),
    ]),
    band,
  };
}

function launcherGeometry(): BufferGeometry {
  const { length, width, height, railOffset } = LAUNCHER;
  const body = extrudeProfileAlongX(
    roundedRectShape(
      { minA: -width / 2, maxA: width / 2, minB: -height / 2, maxB: height / 2 },
      LAUNCHER_ROUNDING,
    ),
    -length / 2,
    length / 2,
  );
  const rails = extrudeProfileAlongX(
    roundedRectShape(
      {
        minA: -railOffset.z,
        maxA: railOffset.z,
        minB: railOffset.y + HELLFIRE_SHAPE.radius - RAIL_THICKNESS / 2,
        maxB: railOffset.y + HELLFIRE_SHAPE.radius + RAIL_THICKNESS,
      },
      RAIL_THICKNESS / 2,
    ),
    -length / 2,
    length / 2,
  );
  return mergeParts([body, rails]);
}

export class WeaponsPart {
  readonly object = new Group();
  readonly anchors: WeaponAnchors;
  readonly launchRail: Object3D;
  readonly hellfire: HellfireGeometry;
  private readonly stores = new Group();
  private readonly launched: Object3D;
  private readonly bombs = new Group();
  private readonly missiles = new Group();

  constructor(context: PartContext, loop: readonly LoopPoint[]) {
    this.hellfire = createHellfireGeometry(loop);
    this.object.add(partMesh(context, pylonGeometry(loop), 'pylons', FINISHES.plain), this.stores);
    this.addBombs(context, loop);
    const rails = this.addLaunchers(context);
    this.launched = rails[0];
    this.launchRail = anchorAt(this.object, ...rails[0].position.toArray());
    this.stores.add(this.bombs, this.missiles);
    this.anchors = {
      pylon: anchorAt(
        this.object,
        PYLON.x,
        pylonBottom(PYLON.stations.inboard) + PYLON_SINK,
        PYLON.stations.inboard,
      ),
      hellfire: anchorAt(rails[1], 0, 0, 0),
      bomb: anchorAt(this.bombs.children[0], 0, 0, 0),
    };
  }

  set(load: LoadId, launched: boolean): void {
    this.stores.visible = load === 'armed';
    this.launched.visible = !launched;
  }

  private addBombs(context: PartContext, loop: readonly LoopPoint[]): void {
    const geometry = bombGeometry(loop);
    const span = PYLON.stations.inboard;
    for (const side of SIDES) {
      const bomb = new Group();
      bomb.position.set(PYLON.x, storeCentreY(span), side * span);
      bomb.add(
        partMesh(context, geometry.seeker, 'bombs', FINISHES.glass),
        partMesh(context, geometry.guidance, 'bombs', FINISHES.seeker),
        partMesh(context, geometry.body, 'bombs', FINISHES.olive),
        partMesh(context, geometry.band, 'bombs', FINISHES.band),
      );
      this.bombs.add(bomb);
    }
  }

  private addLaunchers(context: PartContext): Group[] {
    const launcher = launcherGeometry();
    const span = PYLON.stations.middle;
    const rails: Group[] = [];
    for (const side of SIDES) {
      const centreY = pylonBottom(span) - LAUNCHER.height / 2;
      const body = partMesh(context, launcher, 'pylons', FINISHES.dark);
      body.position.set(PYLON.x, centreY, side * span);
      this.missiles.add(body);
      for (const offset of [side, -side]) {
        const missile = new Group();
        missile.position.set(
          PYLON.x + LAUNCHER.forward,
          centreY + LAUNCHER.railOffset.y,
          side * span + offset * LAUNCHER.railOffset.z,
        );
        missile.add(...hellfireMeshes(context, this.hellfire, 'hellfire'));
        this.missiles.add(missile);
        rails.push(missile);
      }
    }
    return rails;
  }
}
