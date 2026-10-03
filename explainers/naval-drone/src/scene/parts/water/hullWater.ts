import { Group } from 'three';
import type { Matrix4, Object3D, ShaderMaterial, Texture } from 'three';
import { clamp, lerp, smoothstep } from '@core/math';
import { PointCloud, createPointMaterial } from '@core/scene/pointCloud';
import type { AssemblyState, PartId } from '../../../ids';
import { HULL_DETAIL, TRANSOM_X } from '../../../model/layout';
import { HULL_WATER, LABEL_SPOTS } from '../../constants';
import { halfBreadthAt, hullSectionAt } from '../../geometry/hullLines';
import type { Vec3 } from '../../geometry/surface';
import { registered } from '../context';
import type { PartContext } from '../context';
import { SheetGrid, foamSheetMaterial } from './foamSheet';
import { seaHeightAt } from './waves';

type Side = -1 | 1;

const SIDES: readonly Side[] = [-1, 1];
const WHISKER_SEED = 0.6180339887;
const TUNING = HULL_WATER.tuning;
const SHOWN = HULL_WATER.levels.shown;

interface Levels {
  bow: number;
  stern: number;
  spray: number;
  rail: number;
  waterline: number;
}

function hump(knots: number, peak: number, width: number): number {
  return Math.exp(-(((knots - peak) / width) ** 2));
}

export function waterLevels(knots: number): Levels {
  const { bow, spray, waterline, levels } = HULL_WATER;
  return {
    bow:
      smoothstep(knots, ...bow.onFrom) *
      (1 - smoothstep(knots, ...bow.offFrom)) *
      lerp(levels.bowFloor, 1, smoothstep(knots, bow.onFrom[0], bow.peakKnots)),
    stern: hump(knots, levels.sternPeak, levels.sternWidth) * smoothstep(knots, ...levels.sternOn),
    spray: smoothstep(knots, ...spray.onFrom),
    rail: hump(knots, bow.peakKnots, levels.railWidth) * smoothstep(knots, ...levels.railOn),
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
    const worldX = e[0] * x + e[8] * z + e[12];
    const worldZ = e[2] * x + e[10] * z + e[14];
    const surface = seaHeightAt(worldX, worldZ);
    return (surface - e[13] - e[1] * x - e[9] * z) / e[5];
  }
}

export class HullWaterPart {
  readonly object = new Group();
  readonly bowAnchor = new Group();
  readonly sprayAnchor = new Group();
  private readonly water = new LocalWater();
  private readonly materials: ShaderMaterial[] = [];
  private readonly bow: SheetGrid[];
  private readonly line: SheetGrid[];
  private readonly spray: SheetGrid[];
  private readonly rails: SheetGrid[];
  private readonly stern: SheetGrid;
  private readonly whiskers: PointCloud;
  private readonly bowMaterial: ShaderMaterial;
  private readonly sprayMaterial: ShaderMaterial;
  private readonly railMaterial: ShaderMaterial;
  private readonly lineMaterial: ShaderMaterial;
  private readonly sternMaterial: ShaderMaterial;
  private clock = 0;
  private levels: Levels = waterLevels(0);
  private root: { keel: Vec3; chine: number } = { keel: [0, 0, 0], chine: 0 };

  constructor(context: PartContext, cellMap: Texture, groups: { bow: PartId; spray: PartId }) {
    const { looks, profiles } = HULL_WATER;
    this.bowMaterial = foamSheetMaterial(context, groups.bow, cellMap, looks.bow, profiles.bow);
    this.sternMaterial = foamSheetMaterial(
      context,
      groups.bow,
      cellMap,
      looks.stern,
      profiles.line,
    );
    this.lineMaterial = foamSheetMaterial(context, 'wake', cellMap, looks.waterline, profiles.line);
    this.sprayMaterial = foamSheetMaterial(
      context,
      groups.spray,
      cellMap,
      looks.spray,
      profiles.sheet,
    );
    this.railMaterial = foamSheetMaterial(
      context,
      groups.spray,
      cellMap,
      looks.rail,
      profiles.sheet,
    );
    this.materials.push(
      this.bowMaterial,
      this.sternMaterial,
      this.lineMaterial,
      this.sprayMaterial,
      this.railMaterial,
    );
    const grid = (material: ShaderMaterial, rows: number, columns: number) => {
      const sheet = new SheetGrid(context, material, rows, columns);
      this.object.add(sheet.mesh);
      return sheet;
    };
    const { bow, waterline, spray, rail, stern, whisker } = HULL_WATER;
    this.bow = SIDES.map(() => grid(this.bowMaterial, bow.rows, bow.columns));
    this.line = SIDES.map(() => grid(this.lineMaterial, waterline.rows, waterline.columns));
    this.spray = SIDES.map(() => grid(this.sprayMaterial, spray.rows, spray.columns));
    this.rails = SIDES.map(() => grid(this.railMaterial, rail.rows, rail.columns));
    this.stern = grid(this.sternMaterial, stern.rows, stern.columns);
    const pointMaterial = registered(
      context,
      groups.spray,
      createPointMaterial(context.textures.dot, whisker.size),
    );
    this.whiskers = new PointCloud(whisker.count, pointMaterial);
    this.object.add(this.whiskers.points);
    this.bow[0].mesh.add(this.bowAnchor);
    this.spray[0].mesh.add(this.sprayAnchor);
    context.tracker.track({ dispose: () => this.whiskers.dispose() });
  }

  setState(state: AssemblyState, body: Object3D): void {
    const { boat, planing, view } = state;
    body.updateMatrixWorld(true);
    this.water.use(body.matrixWorld);
    this.levels = waterLevels(boat.knots);
    const emphasis = view.flow ? HULL_WATER.emphasis : 1;
    this.bowMaterial.uniforms.uStrength.value = this.levels.bow * emphasis;
    this.sternMaterial.uniforms.uStrength.value = this.levels.stern * emphasis;
    this.lineMaterial.uniforms.uStrength.value = this.levels.waterline * emphasis;
    this.sprayMaterial.uniforms.uStrength.value = emphasis;
    this.railMaterial.uniforms.uStrength.value = this.levels.rail * emphasis;
    const front = TRANSOM_X + planing.keelWettedLength;
    const chineX = TRANSOM_X + Math.max(planing.chineWettedLength, HULL_WATER.spray.root[0]);
    this.placeBow(front);
    this.placeWaterline(front);
    this.placeStern();
    this.placeSpray(chineX, boat.knots);
    this.root = { keel: [front, this.water.level(front, 0), 0], chine: chineX };
    const { anchorBack, sprayOut } = TUNING;
    const bowX = front - anchorBack;
    const bowY = this.water.level(front, 0);
    const bowSide = -(halfBreadthAt(bowX, bowY) + LABEL_SPOTS.bowOut);
    this.bowAnchor.position.set(bowX, bowY + HULL_WATER.bow.height / 2, bowSide);
    const chineSection = hullSectionAt(chineX);
    this.sprayAnchor.position.set(chineX, chineSection.chine[1], -chineSection.flat[0] - sprayOut);
    this.placeWhiskers();
  }

  private hullSide(x: number, side: Side): { y: number; z: number } {
    const y = this.water.level(x, side * hullSectionAt(x).chine[0]);
    return { y, z: side * (halfBreadthAt(x, y) + TUNING.hullGap) };
  }

  private placeBow(front: number): void {
    const { length, height, peakAt, curl, spread, flare, rows, columns } = HULL_WATER.bow;
    const visible = this.levels.bow > SHOWN;
    const reach = lerp(length[0], length[1], this.levels.bow);
    SIDES.forEach((side, index) => {
      const sheet = this.bow[index];
      sheet.mesh.visible = visible;
      if (!visible) return;
      sheet.set((row, column) => {
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
      });
    });
  }

  private placeWaterline(front: number): void {
    const { rows, columns, width } = HULL_WATER.waterline;
    const visible = this.levels.waterline > SHOWN;
    SIDES.forEach((side, index) => {
      const sheet = this.line[index];
      sheet.mesh.visible = visible;
      if (!visible) return;
      sheet.set((row, column) => {
        const x = lerp(front, TRANSOM_X, row / (rows - 1));
        const { y, z } = this.hullSide(x, side);
        return [x, y + TUNING.lineLift, z + side * width * (column / (columns - 1))];
      });
    });
  }

  private placeStern(): void {
    const { rows, columns, length, halfWidth, height, peak, width } = HULL_WATER.stern;
    const visible = this.levels.stern > SHOWN;
    this.stern.mesh.visible = visible;
    if (!visible) return;
    this.stern.set((row, column) => {
      const z = lerp(-halfWidth, halfWidth, row / (rows - 1));
      const share = column / (columns - 1);
      const x = TRANSOM_X - TUNING.sternStart - share * length;
      const across = 1 - (z / (halfWidth * TUNING.sternTaper)) ** 2;
      const bump = Math.exp(-(((share - peak) / width) ** 2)) * across;
      return [x, this.water.level(x, z) + height * this.levels.stern * bump + TUNING.sternLift, z];
    });
  }

  private placeSpray(chineX: number, knots: number): void {
    const { spray, rail } = HULL_WATER;
    const on = this.levels.spray > SHOWN;
    const range = lerp(spray.range[0], spray.range[1], smoothstep(knots, spray.onFrom[0], 42));
    const rootLength = lerp(spray.root[0], spray.root[1], this.levels.spray);
    SIDES.forEach((side, index) => {
      const sheet = this.spray[index];
      sheet.mesh.visible = on;
      if (on) {
        sheet.set((row, column) => {
          const x = chineX + (row / (spray.rows - 1)) * rootLength;
          const section = hullSectionAt(clamp(x, TRANSOM_X, HULL_DETAIL.chineFlat.endX));
          const share = column / (spray.columns - 1);
          const distance = share * range * this.levels.spray;
          const out = Math.cos(spray.up) * distance;
          const px = x - Math.sin(spray.back) * out * spray.trail;
          const pz = side * (section.flat[0] + Math.cos(spray.back) * out);
          const rise =
            section.chine[1] + Math.sin(spray.up) * distance - spray.drop * distance * distance;
          return [px, Math.max(rise, this.water.level(px, pz) + spray.skim), pz];
        });
      }
      const railSheet = this.rails[index];
      const [railFrom, railTo] = HULL_DETAIL.sprayRail.x;
      const railOn = this.levels.rail > SHOWN;
      railSheet.mesh.visible = railOn;
      if (!railOn) return;
      railSheet.set((row, column) => {
        const back = (row / (rail.rows - 1)) * rail.lead * TUNING.railStretch;
        const x = clamp(chineX + rail.lead - back, railFrom, railTo);
        const section = hullSectionAt(x);
        const distance = (column / (rail.columns - 1)) * rail.range * this.levels.rail;
        return [
          x - distance * TUNING.railTrail,
          section.knuckle[1] - Math.sin(rail.down) * distance,
          side * (section.knuckle[0] + section.rail + Math.cos(rail.down) * distance),
        ];
      });
    });
  }

  private placeWhiskers(): void {
    const { count, life, speed, spread } = HULL_WATER.whisker;
    const on = this.levels.spray > SHOWN;
    this.whiskers.points.visible = on;
    if (!on) return;
    const { keel, chine } = this.root;
    for (let index = 0; index < count; index += 1) {
      const side: Side = index % 2 === 0 ? -1 : 1;
      const seed = (index * WHISKER_SEED) % 1;
      const age = ((this.clock / life + seed) % 1) * life;
      const along = (seed * TUNING.whiskerFan[0]) % 1;
      const x = lerp(chine, keel[0], along * HULL_WATER.whisker.reach);
      const section = hullSectionAt(clamp(x, TRANSOM_X, HULL_DETAIL.chineFlat.endX));
      const angle = spread * (((seed * TUNING.whiskerFan[1]) % 1) - 0.5);
      const travel = age * speed * this.levels.spray;
      this.whiskers.setPoint(
        index,
        x + Math.sin(angle) * travel * TUNING.whiskerLean,
        section.chine[1] + travel * TUNING.whiskerLift - TUNING.whiskerFall * age * age,
        side * (section.flat[0] + TUNING.whiskerGap + Math.cos(angle) * travel),
      );
      const alpha = (1 - age / life) * TUNING.whiskerAlpha * this.levels.spray;
      this.whiskers.setColor(index, 1, 1, 1, alpha);
    }
    this.whiskers.commit();
  }

  advance(deltaSeconds: number): void {
    this.clock += deltaSeconds;
    this.materials.forEach((material) => (material.uniforms.uTime.value = this.clock));
    this.placeWhiskers();
  }
}
