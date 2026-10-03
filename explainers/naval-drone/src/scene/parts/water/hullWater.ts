import { Group } from 'three';
import type { Matrix4, Object3D, ShaderMaterial, Texture } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import type { AssemblyState, PartId } from '../../../ids';
import { BOAT, HULL_DETAIL, TRANSOM_X } from '../../../model/layout';
import { HULL_WATER, LABEL_SPOTS } from '../../constants';
import { halfBreadthAt, hullSectionAt } from '../../geometry/hullLines';
import type { Vec3 } from '../../geometry/surface';
import type { PartContext } from '../context';
import { SheetGrid, foamSheetMaterial } from './foamSheet';
import type { SheetLook } from './foamSheet';
import { seaHeightAt } from './waves';

type Side = -1 | 1;
type Kind = 'bow' | 'waterline' | 'stern' | 'spray';
type Shape = (row: number, column: number, side: Side) => Vec3;

interface Sheet {
  material: ShaderMaterial;
  grids: SheetGrid[];
}

const SIDES: readonly Side[] = [-1, 1];
const TUNING = HULL_WATER.tuning;
const SHOWN = HULL_WATER.levels.shown;

function hump(knots: number, peak: number, width: number): number {
  return Math.exp(-(((knots - peak) / width) ** 2));
}

export function waterLevels(knots: number): Record<Kind, number> {
  const { bow, spray, waterline, levels } = HULL_WATER;
  return {
    bow:
      smoothstep(knots, ...bow.onFrom) *
      (1 - smoothstep(knots, ...bow.offFrom)) *
      lerp(levels.bowFloor, 1, smoothstep(knots, bow.onFrom[0], bow.peakKnots)),
    stern: hump(knots, levels.sternPeak, levels.sternWidth) * smoothstep(knots, ...levels.sternOn),
    spray: smoothstep(knots, ...spray.onFrom),
    waterline: smoothstep(knots, ...waterline.from),
  };
}

export class LocalWater {
  private elements: number[] = [];

  use(matrix: Matrix4): void {
    this.elements = matrix.elements;
  }

  level(x: number, z: number): number {
    const e = this.elements;
    const surface = seaHeightAt(e[0] * x + e[8] * z + e[12], e[2] * x + e[10] * z + e[14]);
    return (surface - e[13] - e[1] * x - e[9] * z) / e[5];
  }
}

export class HullWaterPart {
  readonly object = new Group();
  readonly bowAnchor = new Group();
  readonly sprayAnchor = new Group();
  private readonly water = new LocalWater();
  private readonly sheets: Record<Kind, Sheet>;
  private clock = 0;
  private levels = waterLevels(0);

  constructor(context: PartContext, foamMap: Texture, groups: { bow: PartId; spray: PartId }) {
    const { looks, profiles } = HULL_WATER;
    const sheet = (
      group: PartId,
      look: SheetLook,
      profile: readonly [number, number],
      sides: number,
      kind: Kind,
    ): Sheet => {
      const material = foamSheetMaterial(context, group, foamMap, look, profile);
      const { rows, columns } = HULL_WATER[kind];
      const grids = Array.from(
        { length: sides },
        () => new SheetGrid(context, material, rows, columns),
      );
      grids.forEach((grid) => this.object.add(grid.mesh));
      return { material, grids };
    };
    this.sheets = {
      bow: sheet(groups.bow, looks.bow, profiles.bow, SIDES.length, 'bow'),
      waterline: sheet('wake', looks.waterline, profiles.line, SIDES.length, 'waterline'),
      stern: sheet(groups.bow, looks.stern, profiles.mound, 1, 'stern'),
      spray: sheet(groups.spray, looks.spray, profiles.sheet, SIDES.length, 'spray'),
    };
    this.sheets.bow.grids[0].mesh.add(this.bowAnchor);
    this.sheets.spray.grids[0].mesh.add(this.sprayAnchor);
  }

  setState(state: AssemblyState, body: Object3D): void {
    const { boat, planing, view } = state;
    body.updateMatrixWorld(true);
    this.water.use(body.matrixWorld);
    this.levels = waterLevels(boat.knots);
    const emphasis = view.flow ? HULL_WATER.emphasis : 1;
    const front = TRANSOM_X + planing.keelWettedLength;
    const chineX = TRANSOM_X + Math.max(planing.chineWettedLength, HULL_WATER.spray.root[0]);
    this.place('bow', emphasis, this.bowShape(front));
    this.place('waterline', emphasis, this.lineShape(front));
    this.place('stern', emphasis, this.sternShape());
    this.place('spray', emphasis, this.sprayShape(chineX, boat.knots));
    const bowX = front - TUNING.anchorBack;
    const bowY = this.water.level(front, 0);
    const bowSide = -(halfBreadthAt(bowX, bowY) + LABEL_SPOTS.bowOut);
    this.bowAnchor.position.set(bowX, bowY + HULL_WATER.bow.height / 2, bowSide);
    const chine = hullSectionAt(chineX);
    this.sprayAnchor.position.set(chineX, chine.chine[1], -chine.flat[0] - TUNING.sprayOut);
  }

  private place(kind: Kind, emphasis: number, shape: Shape): void {
    const { material, grids } = this.sheets[kind];
    const level = this.levels[kind];
    material.uniforms.uStrength.value = level * emphasis;
    grids.forEach((grid, index) => {
      grid.mesh.visible = level > SHOWN;
      if (grid.mesh.visible) grid.set((row, column) => shape(row, column, SIDES[index]));
    });
  }

  private hullSide(x: number, side: Side): { y: number; z: number } {
    const y = this.water.level(x, side * hullSectionAt(x).chine[0]);
    return { y, z: side * (halfBreadthAt(x, y) + TUNING.hullGap) };
  }

  private bowShape(front: number): Shape {
    const { length, height, peakAt, curl, spread, flare, rows, columns } = HULL_WATER.bow;
    const reach = lerp(length[0], length[1], this.levels.bow);
    return (row, column, side) => {
      const along = row / (rows - 1);
      const x = front - TUNING.bowStart - along * reach;
      const { y, z } = this.hullSide(x, side);
      const rise =
        along < peakAt
          ? Math.sin((along / peakAt) * (Math.PI / 2))
          : Math.exp(-(along - peakAt) * TUNING.bowDecay);
      const crest = height * this.levels.bow * rise;
      const share = column / (columns - 1);
      const out = (spread * crest + along * reach * Math.tan(flare) * TUNING.bowFlare) * share;
      const arc = Math.sin(Math.min(share / curl, 1) * Math.PI) * crest;
      const fall = share > curl ? ((share - curl) / (1 - curl)) ** 2 * crest * TUNING.bowFall : 0;
      return [x - share * crest * TUNING.bowLean, y + arc - fall, z + side * out];
    };
  }

  private lineShape(front: number): Shape {
    const { rows, columns, width } = HULL_WATER.waterline;
    return (row, column, side) => {
      const x = lerp(front, TRANSOM_X, row / (rows - 1));
      const { y, z } = this.hullSide(x, side);
      return [x, y + TUNING.lineLift, z + side * width * (column / (columns - 1))];
    };
  }

  private sternShape(): Shape {
    const { rows, columns, length, halfWidth, height, peak, width } = HULL_WATER.stern;
    return (row, column) => {
      const z = lerp(-halfWidth, halfWidth, row / (rows - 1));
      const share = column / (columns - 1);
      const x = TRANSOM_X - TUNING.sternStart - share * length;
      const across = 1 - (z / (halfWidth * TUNING.sternTaper)) ** 2;
      const bump = Math.exp(-(((share - peak) / width) ** 2)) * across;
      return [x, this.water.level(x, z) + height * this.levels.stern * bump + TUNING.sternLift, z];
    };
  }

  private sprayShape(chineX: number, knots: number): Shape {
    const { rows, columns, range, root, onFrom, up, back, trail, drop, skim } = HULL_WATER.spray;
    const reach = lerp(range[0], range[1], smoothstep(knots, onFrom[0], BOAT.topKnots));
    const rootLength = lerp(root[0], root[1], this.levels.spray);
    return (row, column, side) => {
      const x = chineX + (row / (rows - 1)) * rootLength;
      const section = hullSectionAt(clamp(x, TRANSOM_X, HULL_DETAIL.chineFlat.endX));
      const distance = (column / (columns - 1)) * reach * this.levels.spray;
      const out = Math.cos(up) * distance;
      const px = x - Math.sin(back) * out * trail;
      const pz = side * (section.flat[0] + Math.cos(back) * out);
      const rise = section.chine[1] + Math.sin(up) * distance - drop * distance * distance;
      return [px, Math.max(rise, this.water.level(px, pz) + skim), pz];
    };
  }

  advance(deltaSeconds: number): void {
    this.clock += deltaSeconds;
    Object.values(this.sheets).forEach(
      ({ material }) => (material.uniforms.uTime.value = this.clock),
    );
  }
}
