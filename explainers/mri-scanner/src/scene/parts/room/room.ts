import {
  BackSide,
  BoxGeometry,
  ExtrudeGeometry,
  Group,
  Matrix4,
  PlaneGeometry,
  Shape,
  ShapeGeometry,
} from 'three';
import type { DataTexture } from 'three';
import type { BufferGeometry, Object3D } from 'three';
import { UNDIMMED_GROUP } from '@core/scene/materials';
import type { MaterialFinish } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import type { AssemblyState, PartId } from '../../../ids';
import { CEILING_Y, CONTROL_WINDOW, FLOOR_Y, ROOM, SCREEN } from '../../../model/layout';
import { ROOM_DETAIL } from '../../constants';
import {
  FINISHES,
  SURFACE_LOOK,
  glowingFinish,
  sheenedGlass,
  texturedFinish,
} from '../../finishes';
import type { PartContext, SceneModule } from '../context';
import { mergeParts, partMesh } from '../context';
import { farSideMaterial, farSideMesh } from './farSide';
import type { WallSide } from './farSide';
import { monitorGeometry, pictureTexture, writePicture } from './monitor';
import { ALWAYS_SHOWN, shellMesh } from './shell';
import type { ShellPiece } from './shell';
import { displayTexture, floorTexture, glassSheenTexture, wallTexture } from './surfaces';

const QUARTER = Math.PI / 2;
const SURFACE_LIFT = 0.002;
const DISPLAY_FILL = { width: 0.92, height: 0.86 } as const;
const DESK_SPAN = { top: 0.9, panel: 0.85 } as const;
const [X0, X1] = ROOM.x;
const [Z0, Z1] = ROOM.z;
const WINDOW_SIDE: WallSide = { normal: [1, 0, 0], offset: X1 };
const WALL_SIDES: readonly WallSide[] = [
  { normal: [0, 0, -1], offset: -Z0 },
  { normal: [0, 0, 1], offset: Z1 },
  { normal: [-1, 0, 0], offset: -X0 },
  WINDOW_SIDE,
];
const SHELL = { wall: ROOM_DETAIL.windowDepth, slab: 0.16, holeGrow: 0.004 } as const;
const WINDOW_Z = [
  CONTROL_WINDOW.centreZ - CONTROL_WINDOW.width / 2,
  CONTROL_WINDOW.centreZ + CONTROL_WINDOW.width / 2,
] as const;
const WINDOW_HEIGHT = CONTROL_WINDOW.top - CONTROL_WINDOW.sill;
const WINDOW_MID_Y = (CONTROL_WINDOW.sill + CONTROL_WINDOW.top) / 2;

interface Placement {
  readonly yaw: number;
  readonly pitch?: number;
  readonly at: readonly [number, number, number];
}

function placed(geometry: BufferGeometry, placement: Placement): BufferGeometry {
  const matrix = new Matrix4()
    .makeRotationY(placement.yaw)
    .multiply(new Matrix4().makeRotationX(placement.pitch ?? 0))
    .setPosition(...placement.at);
  return geometry.applyMatrix4(matrix);
}

function rect(u0: number, u1: number, v0: number, v1: number): Shape {
  return new Shape().moveTo(u0, v0).lineTo(u1, v0).lineTo(u1, v1).lineTo(u0, v1).closePath();
}

function windowHole(grow: number): Shape {
  return rect(
    WINDOW_Z[0] - grow,
    WINDOW_Z[1] + grow,
    CONTROL_WINDOW.sill - grow,
    CONTROL_WINDOW.top + grow,
  );
}

function wallPlacements(inset: number): readonly Placement[] {
  return [
    { yaw: 0, at: [0, 0, Z0 + inset] },
    { yaw: Math.PI, at: [0, 0, Z1 - inset] },
    { yaw: QUARTER, at: [X0 + inset, 0, 0] },
    { yaw: -QUARTER, at: [X1 - inset, 0, 0] },
  ];
}

function wallShapes(top: number, bottom = FLOOR_Y, grow = 0, holeGrow = 0): readonly Shape[] {
  const plusX = rect(Z0 - grow, Z1 + grow, bottom, top);
  if (top > CONTROL_WINDOW.sill) plusX.holes.push(windowHole(holeGrow));
  return [
    rect(X0 - grow, X1 + grow, bottom, top),
    rect(X0 - grow, X1 + grow, bottom, top),
    rect(-Z1 - grow, -Z0 + grow, bottom, top),
    plusX,
  ];
}

function walls(top: number, inset: number): BufferGeometry {
  const placements = wallPlacements(inset);
  return mergeParts(
    wallShapes(top).map((shape, index) => placed(new ShapeGeometry(shape), placements[index])),
  );
}

function shellPieces(): readonly ShellPiece[] {
  const { wall, slab, holeGrow } = SHELL;
  const bottom = FLOOR_Y - slab - SURFACE_LIFT;
  const placements = wallPlacements(0);
  const slabs = wallShapes(CEILING_Y, bottom, wall, holeGrow).map((shape, index) => ({
    geometry: placed(
      new ExtrudeGeometry(shape, { depth: wall, bevelEnabled: false }).translate(
        0,
        0,
        -wall - SURFACE_LIFT,
      ),
      placements[index],
    ),
    side: WALL_SIDES[index],
  }));
  const base = new BoxGeometry(X1 - X0 + 2 * wall, slab, Z1 - Z0 + 2 * wall).translate(
    (X0 + X1) / 2,
    FLOOR_Y - slab / 2 - SURFACE_LIFT,
    (Z0 + Z1) / 2,
  );
  return [...slabs, { geometry: base, side: ALWAYS_SHOWN }];
}

function floor(): BufferGeometry {
  return placed(new ShapeGeometry(rect(X0, X1, -Z1, -Z0)), {
    yaw: 0,
    pitch: -QUARTER,
    at: [0, FLOOR_Y, 0],
  });
}

function ceiling(): BufferGeometry {
  return placed(new ShapeGeometry(rect(X0, X1, Z0, Z1)), {
    yaw: 0,
    pitch: QUARTER,
    at: [0, CEILING_Y, 0],
  });
}

function lightPanels(): BufferGeometry {
  const { size, gap, columns, rows } = ROOM_DETAIL.lightPanel;
  return mergeParts(
    columns.flatMap((x) =>
      rows.map((z) =>
        placed(new PlaneGeometry(size, size), {
          yaw: 0,
          pitch: QUARTER,
          at: [x, CEILING_Y - gap, z],
        }),
      ),
    ),
  );
}

function windowFrame(): BufferGeometry {
  const { windowDepth: depth, frameWidth } = ROOM_DETAIL;
  const ring = windowHole(frameWidth);
  ring.holes.push(windowHole(0));
  const midX = X1 + depth / 2;
  const reveal = (width: number, height: number, placement: Placement) =>
    placed(new PlaneGeometry(width, height), placement);
  return mergeParts([
    placed(new ShapeGeometry(ring), { yaw: -QUARTER, at: [X1 - ROOM_DETAIL.skirtingInset, 0, 0] }),
    reveal(CONTROL_WINDOW.width, depth, {
      yaw: QUARTER,
      pitch: -QUARTER,
      at: [midX, CONTROL_WINDOW.sill, CONTROL_WINDOW.centreZ],
    }),
    reveal(CONTROL_WINDOW.width, depth, {
      yaw: QUARTER,
      pitch: QUARTER,
      at: [midX, CONTROL_WINDOW.top, CONTROL_WINDOW.centreZ],
    }),
    reveal(depth, WINDOW_HEIGHT, { yaw: 0, at: [midX, WINDOW_MID_Y, WINDOW_Z[0]] }),
    reveal(depth, WINDOW_HEIGHT, { yaw: Math.PI, at: [midX, WINDOW_MID_Y, WINDOW_Z[1]] }),
  ]);
}

function glass(): BufferGeometry {
  return placed(new PlaneGeometry(CONTROL_WINDOW.width, WINDOW_HEIGHT), {
    yaw: -QUARTER,
    at: [X1 + ROOM_DETAIL.glassInset, WINDOW_MID_Y, CONTROL_WINDOW.centreZ],
  });
}

const CONTROL_FRONT = X1 + ROOM_DETAIL.windowDepth;
const CONTROL_WIDTH = CONTROL_WINDOW.width + 2 * ROOM_DETAIL.monitor.spread;

function controlShell(): BufferGeometry {
  const { depth } = ROOM_DETAIL.controlRoom;
  return new BoxGeometry(depth, CEILING_Y, CONTROL_WIDTH).translate(
    CONTROL_FRONT + depth / 2,
    CEILING_Y / 2,
    CONTROL_WINDOW.centreZ,
  );
}

const DESK_X = CONTROL_FRONT + ROOM_DETAIL.controlRoom.deskDepth / 2;

function desk(): BufferGeometry {
  const { deskTop, deskDepth, deskHeight } = ROOM_DETAIL.controlRoom;
  const top = new BoxGeometry(deskDepth, deskHeight, CONTROL_WIDTH * DESK_SPAN.top);
  const panel = new BoxGeometry(deskHeight, deskTop, CONTROL_WIDTH * DESK_SPAN.panel);
  return mergeParts([
    top.translate(DESK_X, deskTop - deskHeight / 2, CONTROL_WINDOW.centreZ),
    panel.translate(DESK_X + deskDepth / 2 - deskHeight, deskTop / 2, CONTROL_WINDOW.centreZ),
  ]);
}

function monitorPlacements(): readonly Placement[] {
  const { lift, spread, yaw } = ROOM_DETAIL.monitor;
  const y = ROOM_DETAIL.controlRoom.deskTop + lift;
  return [-1, 0, 1].map((side) => ({
    yaw: -QUARTER - side * yaw,
    at: [DESK_X, y, CONTROL_WINDOW.centreZ + side * spread] as const,
  }));
}

function monitors(): { bezels: BufferGeometry; displays: BufferGeometry } {
  const { width, height, depth } = ROOM_DETAIL.monitor;
  const placements = monitorPlacements();
  const bezel = (placement: Placement) =>
    placed(new BoxGeometry(width, height, depth).translate(0, 0, -depth / 2), placement);
  const display = (placement: Placement) =>
    placed(
      new PlaneGeometry(width * DISPLAY_FILL.width, height * DISPLAY_FILL.height).translate(
        0,
        0,
        SURFACE_LIFT,
      ),
      placement,
    );
  return {
    bezels: mergeParts(placements.map(bezel)),
    displays: mergeParts(placements.map(display)),
  };
}

class RoomModule implements SceneModule {
  readonly root = new Group();
  readonly labels: ReadonlyMap<PartId, Object3D>;
  readonly anchors: SceneModule['anchors'];
  private readonly picture: DataTexture;
  private pictureVersion = Number.NaN;

  private readonly context: PartContext;

  constructor(context: PartContext) {
    this.context = context;
    this.picture = context.tracker.track(pictureTexture());
    const room = this.buildRoom();
    const screen = this.buildScreen();
    this.root.add(room, screen);
    const screenAnchor = anchorAt(screen, ...SCREEN.centre);
    this.labels = new Map<PartId, Object3D>([
      ['room', anchorAt(room, X0, FLOOR_Y, Z0)],
      ['screen', screenAnchor],
    ]);
    this.anchors = { screen: screenAnchor };
  }

  setState(state: AssemblyState): void {
    if (state.pictureVersion === this.pictureVersion) return;
    this.pictureVersion = state.pictureVersion;
    writePicture(this.picture, state.picture);
  }

  update(): boolean {
    return false;
  }

  private buildRoom(): Group {
    const { context } = this;
    const { tracker } = context;
    const room = new Group();
    room.name = 'room';
    const wallLook = texturedFinish(SURFACE_LOOK.wall, tracker.track(wallTexture()));
    const floorLook = texturedFinish(SURFACE_LOOK.floor, tracker.track(floorTexture()));
    const panel = (geometry: BufferGeometry, finish: MaterialFinish) =>
      partMesh(context, geometry, UNDIMMED_GROUP, finish);
    room.add(
      panel(walls(CEILING_Y, 0), wallLook),
      panel(floor(), floorLook),
      panel(walls(ROOM_DETAIL.skirtingHeight, ROOM_DETAIL.skirtingInset), FINISHES.skirting),
      panel(ceiling(), FINISHES.ceiling),
      panel(lightPanels(), FINISHES.lightPanel),
      shellMesh(context, shellPieces(), UNDIMMED_GROUP, FINISHES.shell),
    );
    const behind = (geometry: BufferGeometry, finish: MaterialFinish) =>
      farSideMesh(
        context,
        geometry,
        farSideMaterial(context, UNDIMMED_GROUP, finish, WINDOW_SIDE),
        WINDOW_SIDE,
      );
    const consoleLook = glowingFinish(tracker.track(displayTexture()), SURFACE_LOOK.console);
    const { bezels, displays } = monitors();
    room.add(
      behind(windowFrame(), FINISHES.frame),
      behind(glass(), sheenedGlass(tracker.track(glassSheenTexture()))),
      behind(controlShell(), { ...FINISHES.controlShell, side: BackSide }),
      behind(desk(), FINISHES.desk),
      behind(bezels, FINISHES.bezel),
      behind(displays, consoleLook),
    );
    return room;
  }

  private buildScreen(): Group {
    const { context } = this;
    const screen = new Group();
    screen.name = 'screen';
    const { housing, display } = monitorGeometry();
    const look = glowingFinish(this.picture, SURFACE_LOOK.picture);
    const mounted = (geometry: BufferGeometry, finish: MaterialFinish) =>
      farSideMesh(
        context,
        geometry,
        farSideMaterial(context, 'screen', finish, WINDOW_SIDE),
        WINDOW_SIDE,
      );
    screen.add(mounted(housing, FINISHES.screenFrame), mounted(display, look));
    return screen;
  }
}

export function createRoomModule(context: PartContext): SceneModule {
  return new RoomModule(context);
}
