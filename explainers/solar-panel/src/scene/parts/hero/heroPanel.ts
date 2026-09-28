import { Group, MeshBasicMaterial, Shape, ShapeGeometry, Vector2 } from 'three';
import type { Mesh, Object3D } from 'three';
import { clamp } from '@core/math';
import type { LayoutId } from '../../../ids';
import { MODULE } from '../../../model';
import { ANCHOR_LIFT_CM, CELL_WARMTH, ENCAPSULANT_SHOWN_ABOVE, SHADE } from '../../constants';
import { block } from '../../geometry/blocks';
import { moduleFrameGeometry } from '../../geometry/moduleFrame';
import { FRAME_WALL_CM, LAMINATE } from '../../geometry/moduleLayout';
import { shadePolygon } from '../../geometry/shade';
import type { LayerPlacement } from '../../geometry/stack';
import { frameDrop, layerFront, stackLayout } from '../../geometry/stack';
import { partMesh, registered } from '../context';
import { SwapMesh } from '../swapMesh';
import type { PartContext } from '../context';
import { CellSheetPart } from './cellSheet';
import { JunctionBoxPart } from './junctionBox';

export type HeroAnchorId =
  | 'panel'
  | 'frame'
  | 'glass'
  | 'encapsulant'
  | 'cell'
  | 'ribbon'
  | 'busbar'
  | 'backsheet'
  | 'junctionBox'
  | 'bypassDiode'
  | 'connector';

const LAMINATE_X = [-LAMINATE.width / 2, LAMINATE.width / 2] as const;
const LAMINATE_Y = [FRAME_WALL_CM, MODULE.height - FRAME_WALL_CM] as const;
const LABEL_HEIGHT = {
  glass: 0.82,
  encapsulant: 0.66,
  backsheet: 0.4,
  frame: 0.28,
} as const;
const GLASS_LABEL_X = 0.28;

function slab(): ReturnType<typeof block> {
  return block(LAMINATE_X, LAMINATE_Y, [0, 1]);
}

function place(mesh: Mesh, placement: LayerPlacement): void {
  mesh.position.z = placement.back;
  mesh.scale.z = placement.thickness;
}

export class HeroPanelPart {
  readonly object = new Group();
  readonly anchors: Readonly<Record<HeroAnchorId, Object3D>>;
  private readonly frame = new Group();
  private readonly glass: Mesh;
  private readonly frontEncapsulant: Mesh;
  private readonly rearEncapsulant: Mesh;
  private readonly backsheet: Mesh;
  private readonly cells: CellSheetPart;
  private readonly junction: JunctionBoxPart;
  private readonly shadeBand: SwapMesh;
  private readonly labels = {
    panel: new Group(),
    glass: new Group(),
    encapsulant: new Group(),
    backsheet: new Group(),
  };
  private stackTop = 0;

  constructor(context: PartContext) {
    this.frame.add(partMesh(context, moduleFrameGeometry(), 'frame', 'frame'));
    this.glass = partMesh(context, slab(), 'glass', 'glass');
    this.frontEncapsulant = partMesh(context, slab(), 'encapsulant', 'encapsulant');
    this.rearEncapsulant = partMesh(context, slab(), 'encapsulant', 'encapsulant');
    this.backsheet = partMesh(context, slab(), 'backsheet', 'backsheet');
    this.cells = new CellSheetPart(context);
    this.junction = new JunctionBoxPart(context);
    const band = new MeshBasicMaterial({
      color: SHADE.bandColor,
      transparent: true,
      opacity: SHADE.bandOpacity,
      depthWrite: false,
    });
    this.shadeBand = new SwapMesh(context, registered(context, 'cell', band));
    this.object.add(
      this.frame,
      this.glass,
      this.frontEncapsulant,
      this.cells.object,
      this.rearEncapsulant,
      this.backsheet,
      this.junction.object,
      this.shadeBand.mesh,
      ...Object.values(this.labels),
    );
    const frameLabel = new Group();
    frameLabel.position.set(
      -MODULE.width / 2 - ANCHOR_LIFT_CM,
      MODULE.height * LABEL_HEIGHT.frame,
      MODULE.depth / 2,
    );
    this.frame.add(frameLabel);
    this.anchors = {
      ...this.labels,
      frame: frameLabel,
      cell: this.cells.anchors.cell,
      ribbon: this.cells.anchors.ribbon,
      busbar: this.cells.anchors.busbar,
      bypassDiode: this.cells.anchors.bypassDiode,
      junctionBox: this.junction.anchors.junctionBox,
      connector: this.junction.anchors.connector,
    };
    this.setExplode(0, 0);
    this.setShade(0);
  }

  frontOfStack(): number {
    return this.stackTop;
  }

  setExplode(explode: number, tiltDeg: number): void {
    const layers = stackLayout(explode);
    place(this.glass, layers.glass);
    place(this.frontEncapsulant, layers.frontEncapsulant);
    place(this.rearEncapsulant, layers.rearEncapsulant);
    this.frontEncapsulant.visible = explode > ENCAPSULANT_SHOWN_ABOVE;
    this.rearEncapsulant.visible = explode > ENCAPSULANT_SHOWN_ABOVE;
    place(this.backsheet, layers.backsheet);
    this.cells.object.position.z = layers.cellSheet.back;
    this.cells.setThickness(layers.cellSheet.thickness);
    this.junction.setBack(layers.backsheet.back);
    this.frame.position.y = -frameDrop(explode, tiltDeg);
    this.stackTop = layerFront(layers.glass);
    this.shadeBand.mesh.position.z = this.stackTop + SHADE.lift;
    this.placeLabels(layers);
  }

  setLayout(layout: LayoutId): void {
    this.cells.setLayout(layout);
  }

  setShade(shade: number): void {
    this.cells.setShade(shade);
    const outline = shadePolygon(shade);
    this.shadeBand.mesh.visible = outline.length > 2;
    if (outline.length > 2) {
      this.shadeBand.swap(
        new ShapeGeometry(new Shape(outline.map(({ x, y }) => new Vector2(x, y)))),
      );
    }
  }

  setDeadStrings(dead: readonly boolean[]): void {
    this.cells.setDeadStrings(dead);
  }

  setActiveDiodes(active: readonly boolean[]): void {
    this.cells.setActiveDiodes(active);
  }

  setCellTemperature(celsius: number): void {
    const share = clamp(
      (celsius - CELL_WARMTH.fromC) / (CELL_WARMTH.toC - CELL_WARMTH.fromC),
      0,
      1,
    );
    this.cells.setWarmth(share * CELL_WARMTH.maxGlow);
  }

  setDetail(close: boolean): void {
    this.cells.setDetail(close);
  }

  setOverlayVisible(visible: boolean): void {
    this.cells.setOverlayVisible(visible);
  }

  private placeLabels(layers: ReturnType<typeof stackLayout>): void {
    const middle = (placement: LayerPlacement) => placement.back + placement.thickness / 2;
    const front = this.stackTop + ANCHOR_LIFT_CM;
    this.labels.panel.position.set(0, MODULE.height / 2, front);
    this.labels.glass.position.set(
      LAMINATE.width * GLASS_LABEL_X,
      MODULE.height * LABEL_HEIGHT.glass,
      front,
    );
    this.labels.encapsulant.position.set(
      LAMINATE.width / 2 + ANCHOR_LIFT_CM,
      MODULE.height * LABEL_HEIGHT.encapsulant,
      middle(layers.frontEncapsulant),
    );
    this.labels.backsheet.position.set(
      -LAMINATE.width / 2 - ANCHOR_LIFT_CM,
      MODULE.height * LABEL_HEIGHT.backsheet,
      middle(layers.backsheet),
    );
  }
}
