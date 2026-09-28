import { BoxGeometry, Color, Group, InstancedMesh, Matrix4 } from 'three';
import type { Mesh, MeshStandardMaterial, Object3D } from 'three';
import { lerp } from '@core/math';
import { anchorAt } from '@core/scene/parts';
import type { LayoutId } from '../../../ids';
import { LAYOUT_IDS } from '../../../ids';
import type { ModuleLayout } from '../../../model';
import { LAYOUTS } from '../../../model';
import { BUS_RIBBON, BUSBARS, FACE_LAYERS, SHADE } from '../../constants';
import { FINISHES } from '../../finishes';
import { around, block } from '../../geometry/blocks';
import { mergeParts } from '../../geometry/merge';
import type { CellRect } from '../../geometry/moduleLayout';
import {
  CELL_WIDTH_CM,
  GRID,
  cellHeight,
  cellRects,
  columnCentre,
  rowTop,
} from '../../geometry/moduleLayout';
import { cellFaceTexture } from '../array/cellTextures';
import { partMesh } from '../context';
import type { PartContext } from '../context';

import { diodeX, diodeY } from '../../geometry/strings';
import { StringOverlayPart } from './stringOverlay';
import { shadedShareOfCell } from '../../../model';

const COLUMNS_PER_GROUP = 2;
const WHITE = '#ffffff';
const BOX_FACES = { front: 4, rear: 5 } as const;
const SIDE_FACES = 4;
const LABEL_SPOTS = {
  cell: { column: 1, row: 0.35 },
  busbar: { column: 4, bar: 0.25, row: 0.2 },
  ribbonColumn: 4.5,
} as const;

interface LayoutVariant {
  layout: ModuleLayout;
  rects: CellRect[];
  cells: InstancedMesh;
  face: Group;
  busbars: Mesh;
  overlay: StringOverlayPart;
  front: MeshStandardMaterial;
}

function busbarGeometry(layout: ModuleLayout) {
  const { count, width } = BUSBARS[layout.id];
  const rowsPerString = layout.rows / layout.stringsPerGroup;
  const pieces = [];
  for (let column = 0; column < layout.columns; column += 1) {
    const left = columnCentre(column) - CELL_WIDTH_CM / 2;
    for (let segment = 0; segment < layout.stringsPerGroup; segment += 1) {
      const top = rowTop(layout, segment * rowsPerString);
      const bottom = rowTop(layout, (segment + 1) * rowsPerString - 1) - cellHeight(layout);
      for (let bar = 0; bar < count; bar += 1) {
        const x = left + ((bar + 1 / 2) / count) * CELL_WIDTH_CM;
        pieces.push(block(around(x, width), [bottom, top], FACE_LAYERS.busbar));
      }
    }
  }
  return mergeParts(pieces);
}

function ribbonGeometry(layout: ModuleLayout) {
  const { width, margin, inset } = BUS_RIBBON;
  const groupSpan = (group: number) =>
    [
      columnCentre(group * COLUMNS_PER_GROUP) - CELL_WIDTH_CM / 2 + inset,
      columnCentre(group * COLUMNS_PER_GROUP + 1) + CELL_WIDTH_CM / 2 - inset,
    ] as const;
  const fullSpan = [GRID.x[0] + inset, GRID.x[1] - inset] as const;
  const turns = (y: number) =>
    Array.from({ length: layout.groups }, (_, group) =>
      block(groupSpan(group), around(y, width), FACE_LAYERS.ribbon),
    );
  const top = GRID.y[1] + margin;
  const bottom = GRID.y[0] - margin;
  if (layout.stringsPerGroup === 1) {
    return mergeParts([block(fullSpan, around(top, width), FACE_LAYERS.ribbon), ...turns(bottom)]);
  }
  const centre = (GRID.y[0] + GRID.y[1]) / 2;
  return mergeParts([
    ...turns(top),
    ...turns(bottom),
    block(fullSpan, around(centre, width), FACE_LAYERS.ribbon),
  ]);
}

export class CellSheetPart {
  readonly object = new Group();
  readonly face = new Group();
  readonly anchors: Readonly<Record<'cell' | 'busbar' | 'ribbon' | 'bypassDiode', Object3D>>;
  private readonly variants: Record<LayoutId, LayoutVariant>;
  private current: LayoutId = 'halfCut';
  private readonly tint = new Color();

  constructor(context: PartContext) {
    this.object.add(this.face);
    this.variants = Object.fromEntries(
      LAYOUT_IDS.map((id) => [id, this.buildVariant(context, LAYOUTS[id])]),
    ) as Record<LayoutId, LayoutVariant>;
    this.anchors = this.placeAnchors();
    this.setLayout(this.current);
  }

  setLayout(id: LayoutId): void {
    this.current = id;
    this.anchors.bypassDiode.position.y = diodeY(LAYOUTS[id]);
    LAYOUT_IDS.forEach((candidate) => {
      const variant = this.variants[candidate];
      variant.cells.visible = candidate === id;
      variant.face.visible = candidate === id;
    });
  }

  setThickness(thickness: number): void {
    LAYOUT_IDS.forEach((id) => {
      this.variants[id].cells.scale.z = thickness;
    });
    this.face.position.z = thickness;
  }

  setShade(shade: number): void {
    LAYOUT_IDS.forEach((id) => {
      const { cells, rects, layout } = this.variants[id];
      rects.forEach((rect, index) => {
        const share = shadedShareOfCell(layout, rect.column, rect.row, shade);
        const level = lerp(1, SHADE.tint, share);
        cells.setColorAt(index, this.tint.setRGB(level, level, level));
      });
      if (cells.instanceColor) cells.instanceColor.needsUpdate = true;
    });
  }

  setWarmth(glow: number): void {
    LAYOUT_IDS.forEach((id) => {
      this.variants[id].front.emissiveIntensity = glow;
    });
  }

  setDetail(close: boolean): void {
    LAYOUT_IDS.forEach((id) => {
      this.variants[id].busbars.visible = close;
    });
  }

  setOverlayVisible(visible: boolean): void {
    LAYOUT_IDS.forEach((id) => {
      this.variants[id].overlay.object.visible = visible;
    });
  }

  setDeadStrings(dead: readonly boolean[]): void {
    this.variants[this.current].overlay.setDeadStrings(dead);
  }

  setActiveDiodes(active: readonly boolean[]): void {
    this.variants[this.current].overlay.setActiveDiodes(active);
  }

  private buildVariant(context: PartContext, layout: ModuleLayout): LayoutVariant {
    const height = cellHeight(layout);
    const geometry = new BoxGeometry(CELL_WIDTH_CM, height, 1);
    geometry.translate(0, 0, 1 / 2);
    const texture = context.tracker.track(cellFaceTexture(layout.id, height, CELL_WIDTH_CM));
    const frontFinish = { ...FINISHES.cellFront, map: texture };
    const front = context.materials.get('cell', frontFinish);
    const edge = context.materials.get('cell', FINISHES.cellEdge);
    const rear = context.materials.get('cell', FINISHES.cellRear);
    const faces = Array.from({ length: SIDE_FACES }, () => edge);
    faces[BOX_FACES.front] = front;
    faces[BOX_FACES.rear] = rear;
    const rects = cellRects(layout);
    const cells = context.tracker.track(
      new InstancedMesh(context.tracker.track(geometry), faces, rects.length),
    );
    const matrix = new Matrix4();
    rects.forEach((rect, index) => {
      matrix.makeTranslation((rect.x[0] + rect.x[1]) / 2, (rect.y[0] + rect.y[1]) / 2, 0);
      cells.setMatrixAt(index, matrix);
      cells.setColorAt(index, this.tint.set(WHITE));
    });
    const face = new Group();
    const overlay = new StringOverlayPart(context, layout);
    const busbars = partMesh(context, busbarGeometry(layout), 'busbar', 'busbar');
    face.add(
      busbars,
      partMesh(context, ribbonGeometry(layout), 'ribbon', 'ribbon'),
      overlay.object,
    );
    this.object.add(cells);
    this.face.add(face);
    return { layout, rects, cells, face, busbars, overlay, front };
  }

  private placeAnchors(): Record<'cell' | 'busbar' | 'ribbon' | 'bypassDiode', Object3D> {
    const half = LAYOUTS.halfCut;
    const cellY = GRID.y[1] - (GRID.y[1] - GRID.y[0]) * LABEL_SPOTS.cell.row;
    const busbarX =
      columnCentre(LABEL_SPOTS.busbar.column) -
      CELL_WIDTH_CM / 2 +
      CELL_WIDTH_CM * LABEL_SPOTS.busbar.bar;
    const busbarY = GRID.y[1] - (GRID.y[1] - GRID.y[0]) * LABEL_SPOTS.busbar.row;
    const ribbonX = GRID.x[0] + (LABEL_SPOTS.ribbonColumn * (GRID.x[1] - GRID.x[0])) / half.columns;
    return {
      cell: anchorAt(
        this.face,
        columnCentre(LABEL_SPOTS.cell.column),
        cellY,
        FACE_LAYERS.busbar[1],
      ),
      busbar: anchorAt(this.face, busbarX, busbarY, FACE_LAYERS.busbar[1]),
      ribbon: anchorAt(this.face, ribbonX, GRID.y[1] + BUS_RIBBON.margin, FACE_LAYERS.ribbon[1]),
      bypassDiode: anchorAt(
        this.face,
        diodeX(half.groups - 1),
        diodeY(half),
        FACE_LAYERS.symbol[1],
      ),
    };
  }
}
