import type { Group } from 'three';
import type { AssemblyState, Point } from '../../../ids';
import {
  CABLE_TRAY_Y,
  FIBRE_ENTRY,
  RACK,
  RACK_STACK,
  ROW_LENGTH_M,
  SPINE_RACKS,
  SUBJECT_LEAF,
  SUBJECT_RACK,
  SUBJECT_ROW,
  WALL_THICKNESS,
  boxTop,
} from '../../../model';
import type { BoxSpec } from '../../../model';
import { THEME } from '../../../theme';
import { namedGroup } from '../context';
import type { PartContext } from '../context';
import { PACKETS, PARTICLE_PX, PITCH, TRAIL } from './constants';
import { Cloud } from './points';
import { seeded } from './puffs';
import { Track, fixedPitch } from './track';
import { Trail } from './trail';

const SPINE = SPINE_RACKS[SPINE_RACKS.length - 1];
const BED_Y = CABLE_TRAY_Y + PACKETS.trayBed + PACKETS.lift;
const DUCT_TOP_Y = CABLE_TRAY_Y + PACKETS.duct.rise + PACKETS.duct.half + PACKETS.lift;
const DUCT_SIDE = PACKETS.duct.half + PACKETS.lift;
const ROW_TRAY_Z = SUBJECT_ROW.z + SUBJECT_ROW.facing * PACKETS.trayInset;
const TRUNK_X = SUBJECT_ROW.startX + ROW_LENGTH_M + PACKETS.trunkGap;
const MAIN_TRUNK_Z = 0;

function topOf(box: BoxSpec): number {
  return boxTop(box)[1] + PACKETS.lift;
}

function fibreIn(): Point[] {
  const [x, y, wallZ] = FIBRE_ENTRY;
  const riseZ = wallZ - WALL_THICKNESS - PACKETS.duct.entry;
  const side = x + DUCT_SIDE;
  const entryY = y + PACKETS.duct.entry / 2 + PACKETS.lift;
  return [
    [side, entryY, wallZ - WALL_THICKNESS],
    [side, entryY, riseZ],
    [side, DUCT_TOP_Y, riseZ],
    [side, DUCT_TOP_Y, MAIN_TRUNK_Z],
  ];
}

function throughSpine(): Point[] {
  const [x, , z] = SPINE.base;
  const dropZ = z * PACKETS.spineDrop;
  const top = topOf(SPINE);
  const [down, up] = [x + DUCT_SIDE, x - DUCT_SIDE];
  return [
    [down, DUCT_TOP_Y, MAIN_TRUNK_Z],
    [down, DUCT_TOP_Y, dropZ],
    [down, top, dropZ],
    [up, top, dropZ],
    [up, DUCT_TOP_Y, dropZ],
    [up, DUCT_TOP_Y, MAIN_TRUNK_Z],
    [up, BED_Y, MAIN_TRUNK_Z],
  ];
}

function throughLeaf(): Point[] {
  const [x] = SUBJECT_LEAF.base;
  const top = topOf(SUBJECT_LEAF);
  const [down, up] = [x + PACKETS.strand, x - PACKETS.strand];
  return [
    [TRUNK_X, BED_Y, MAIN_TRUNK_Z],
    [TRUNK_X, BED_Y, ROW_TRAY_Z],
    [down, BED_Y, ROW_TRAY_Z],
    [down, top, ROW_TRAY_Z],
    [up, top, ROW_TRAY_Z],
    [up, BED_Y, ROW_TRAY_Z],
  ];
}

function intoRack(): Point[] {
  const [x] = SUBJECT_RACK;
  return [
    [x, BED_Y, ROW_TRAY_Z],
    [x, RACK.height + PACKETS.lift, ROW_TRAY_Z],
  ];
}

function packetRoute(): Point[] {
  return [...fibreIn(), ...throughSpine(), ...throughLeaf(), ...intoRack()];
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
