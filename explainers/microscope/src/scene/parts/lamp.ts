import { Group, SphereGeometry } from 'three';
import type { Mesh, Object3D } from 'three';
import { STRUCTURE_GROUP } from '@core/scene/materials';
import { anchorAt } from '@core/scene/parts';
import { STATIONS } from '../../model';
import { BULB, COLLECTOR_LENS, FIELD_DIAPHRAGM, LAMP_HOUSING, SEGMENTS } from '../constants';
import { cutSection, innerWall, ringSection } from '../geometry/lathe';
import { FINISHES } from '../finishes';
import { cutShell, partMesh } from './context';
import type { CutShell, PartContext } from './context';
import { glassLens } from './glassLens';

export interface LampPart {
  object: Group;
  anchors: { lamp: Object3D; fieldDiaphragm: Object3D };
  setCutaway(cutaway: boolean): void;
}

function housing(context: PartContext): CutShell {
  const { inner, outer, bottom, top } = LAMP_HOUSING;
  return cutShell(
    context,
    cutSection(ringSection(inner, outer, bottom, top), SEGMENTS.round, {
      lining: innerWall(inner, bottom, top),
    }),
    STRUCTURE_GROUP,
    FINISHES.enamel,
  );
}

function fieldDiaphragm(context: PartContext): CutShell {
  const half = FIELD_DIAPHRAGM.thickness / 2;
  const section = ringSection(
    FIELD_DIAPHRAGM.inner,
    FIELD_DIAPHRAGM.outer,
    STATIONS.fieldDiaphragm - half,
    STATIONS.fieldDiaphragm + half,
  );
  return cutShell(context, cutSection(section, SEGMENTS.round), 'fieldDiaphragm', FINISHES.stage);
}

function bulb(context: PartContext): Mesh {
  const geometry = new SphereGeometry(BULB.radius, SEGMENTS.small, BULB.rings);
  return partMesh(context, geometry, 'lamp', 'bulb');
}

export function createLamp(context: PartContext): LampPart {
  const shell = housing(context);
  const diaphragm = fieldDiaphragm(context);
  const collector = glassLens(context, 'lamp', COLLECTOR_LENS, STATIONS.collector);
  const object = new Group();
  object.add(shell.object, diaphragm.object, bulb(context), collector);
  return {
    object,
    anchors: {
      lamp: anchorAt(object, 0, 0, BULB.radius),
      fieldDiaphragm: anchorAt(object, 0, STATIONS.fieldDiaphragm, -FIELD_DIAPHRAGM.outer),
    },
    setCutaway: (cutaway) => {
      shell.setCut(cutaway);
      diaphragm.setCut(cutaway);
    },
  };
}
