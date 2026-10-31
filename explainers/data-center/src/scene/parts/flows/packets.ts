import type { Group } from 'three';
import type { AssemblyState, Point } from '../../../ids';
import {
  CABLE_TRAY_Y,
  FIBRE_ENTRY,
  RACK,
  RACK_STACK,
  SPINE_RACKS,
  SUBJECT_LEAF,
  SUBJECT_RACK,
  boxTop,
} from '../../../model';
import { THEME } from '../../../theme';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { PACKETS, PARTICLE_PX, PITCH, TRAIL } from './constants';
import { Cloud } from './points';
import { seeded } from './puffs';
import { Track, fixedPitch } from './track';
import { Trail } from './trail';

const TRAY_Y = CABLE_TRAY_Y + PACKETS.lift;
const SPINE = SPINE_RACKS[SPINE_RACKS.length - 1];

function dip(top: Point): Point[] {
  const over: Point = [top[0], TRAY_Y, top[2]];
  return [over, top, over];
}

function packetRoute(): Point[] {
  const [entryX, , entryZ] = FIBRE_ENTRY;
  const spineTop = boxTop(SPINE);
  return [
    FIBRE_ENTRY,
    [entryX, TRAY_Y, entryZ],
    [entryX, TRAY_Y, spineTop[2]],
    ...dip(spineTop),
    ...dip(boxTop(SUBJECT_LEAF)),
    ...dip([SUBJECT_RACK[0], RACK.height, SUBJECT_RACK[2]]),
  ];
}

function portPoints(): Point[] {
  const [low, high] = RACK_STACK.switchTrays;
  const x = SUBJECT_RACK[0] - RACK.width / 2;
  const front = SUBJECT_RACK[2] - RACK.depth / 2;
  return Array.from({ length: PACKETS.trays * PACKETS.portsPerTray }, (_, index) => {
    const tray = Math.floor(index / PACKETS.portsPerTray);
    const port = index % PACKETS.portsPerTray;
    return [
      x,
      low + ((tray + 0.5) * (high - low)) / PACKETS.trays,
      front + ((port + 0.5) * RACK.depth) / PACKETS.portsPerTray,
    ];
  });
}

export class PacketFlow {
  readonly object = namedGroup('packetFlow');
  private readonly trail: Trail;
  private readonly ports: Cloud;
  private readonly spots = portPoints();

  constructor(context: PartContext, parent: Group) {
    parent.add(this.object);
    const track = new Track(packetRoute(), fixedPitch(PITCH.packets));
    this.trail = new Trail(context, 'spineSwitches', track, {
      color: THEME.packet,
      width: PACKETS.width,
      glow: TRAIL.dashGlow,
      ghost: 0,
      pulse: 1,
    });
    this.ports = new Cloud(context, 'switchTrays', this.spots.length, {
      texture: context.textures.dot,
      size: PARTICLE_PX.flicker,
    });
    this.object.add(this.trail.object, this.ports.object);
  }

  setState(state: AssemblyState): void {
    this.object.visible = state.view.packets;
  }

  animate(time: number): void {
    if (!this.object.visible) return;
    this.trail.set(Infinity, time * PACKETS.rate);
    const tick = Math.floor(time * PACKETS.flickerRate);
    this.spots.forEach(([x, y, z], index) => {
      const lit = seeded(index * 7 + tick * 13) > 1 - PACKETS.flickerOn;
      this.ports.set(index, x, y, z, THEME.packet, lit ? 1 : PACKETS.flickerDim);
    });
    this.ports.commit();
  }
}
