import type { ModuleLayout } from '../../model';
import { COLUMN_PITCH_CM, GRID, columnCentre, rowCentre } from './moduleLayout';
import type { PlanePoint } from './strip';

const COLUMNS_PER_GROUP = 2;
const HOME_OFFSET_CM = 0.8;

export interface StringPath {
  string: number;
  group: number;
  points: PlanePoint[];
}

export function diodeY(layout: ModuleLayout): number {
  if (layout.stringsPerGroup > 1) return (GRID.y[0] + GRID.y[1]) / 2;
  return rowCentre(layout, 0);
}

export function diodeX(group: number): number {
  return columnCentre(group * COLUMNS_PER_GROUP) + COLUMN_PITCH_CM / 2;
}

function farRow(layout: ModuleLayout, stringInGroup: number): number {
  if (layout.stringsPerGroup === 1) return layout.rows - 1;
  return stringInGroup === 0 ? 0 : layout.rows - 1;
}

function homeY(layout: ModuleLayout, stringInGroup: number): number {
  const centre = diodeY(layout);
  if (layout.stringsPerGroup === 1) return centre;
  return stringInGroup === 0 ? centre + HOME_OFFSET_CM : centre - HOME_OFFSET_CM;
}

export function stringPath(layout: ModuleLayout, string: number): StringPath {
  const group = Math.floor(string / layout.stringsPerGroup);
  const stringInGroup = string % layout.stringsPerGroup;
  const first = columnCentre(group * COLUMNS_PER_GROUP);
  const second = columnCentre(group * COLUMNS_PER_GROUP + 1);
  const home = homeY(layout, stringInGroup);
  const far = rowCentre(layout, farRow(layout, stringInGroup));
  return {
    string,
    group,
    points: [
      { x: first, y: home },
      { x: first, y: far },
      { x: second, y: far },
      { x: second, y: home },
    ],
  };
}

export function stringPaths(layout: ModuleLayout): StringPath[] {
  const count = layout.groups * layout.stringsPerGroup;
  return Array.from({ length: count }, (_, string) => stringPath(layout, string));
}

export function diodeWire(layout: ModuleLayout, group: number): PlanePoint[] {
  const first = columnCentre(group * COLUMNS_PER_GROUP);
  const second = columnCentre(group * COLUMNS_PER_GROUP + 1);
  const y = diodeY(layout);
  if (layout.stringsPerGroup === 1)
    return [
      { x: first, y },
      { x: second, y },
    ];
  const top = y + HOME_OFFSET_CM;
  const bottom = y - HOME_OFFSET_CM;
  return [
    { x: first, y: top },
    { x: first, y: bottom },
    { x: first, y },
    { x: second, y },
    { x: second, y: top },
    { x: second, y: bottom },
  ];
}
