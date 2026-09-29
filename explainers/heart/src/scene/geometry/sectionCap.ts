import { BufferAttribute, Color } from 'three';
import type { BufferGeometry } from 'three';
import { CAP_EDGE, capGeometry } from './cap';
import type { CapStyle } from './cap';
import type { Contraction } from './contraction';
import { contourLoops, nestLoops } from './contour';
import type { Field } from './field';
import type { Bounds } from './grid';
import { addPickedMorphTargets } from './morph';
import { portalExclusion } from './portal';
import type { Portal } from './vesselPath';

export interface SectionStyle extends CapStyle {
  readonly lipMm: number;
  readonly cellMm: number;
  readonly muscle: string;
  readonly deep: string;
}

export interface SectionFields {
  readonly envelope: Field;
  readonly cavities: readonly Field[];
  readonly portals: readonly Portal[];
}

export interface SectionMotion {
  readonly outer: Contraction;
  readonly cavity: Contraction;
}

const XYZ = 3;

export function sectionField(fields: SectionFields, lip: number): (x: number, y: number) => number {
  const excluded = portalExclusion(fields.portals);
  return (x, y) => {
    let value = fields.envelope.distance(x, y, 0) - lip;
    for (const cavity of fields.cavities) value = Math.max(value, -cavity.distance(x, y, 0) - lip);
    return Math.max(value, excluded(x, y, 0));
  };
}

export function sectionCap(
  fields: SectionFields,
  bounds: Bounds,
  style: SectionStyle,
  motion: SectionMotion,
): BufferGeometry {
  const loops = contourLoops(sectionField(fields, style.lipMm), {
    min: [bounds.min[0], bounds.min[1]],
    max: [bounds.max[0], bounds.max[1]],
    cell: style.cellMm,
  });
  const { outers, holes } = nestLoops(loops);
  const { geometry, edge } = capGeometry(outers, holes, style);
  const deep = new Color(style.deep);
  const muscle = new Color(style.muscle);
  const colours = new Float32Array(edge.length * XYZ);
  edge.forEach((kind, vertex) => {
    (kind === CAP_EDGE.cavity ? deep : muscle).toArray(colours, vertex * XYZ);
  });
  geometry.setAttribute('color', new BufferAttribute(colours, XYZ));
  const pick = (field: 'squeeze' | 'emptying') => (vertex: number) =>
    edge[vertex] === CAP_EDGE.outer ? motion.outer[field] : motion.cavity[field];
  addPickedMorphTargets(geometry, [pick('squeeze'), pick('emptying')], { flatNormals: true });
  return geometry;
}
